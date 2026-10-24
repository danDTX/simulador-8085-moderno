import { Intel8085 } from './core/cpu8085.js';
import { Assembler8085 } from './core/assembler.js';
import { PeripheralsManager } from './core/peripherals.js';
import { MDIWindowManager } from './ui/windowManager.js';
import { CodeEditor, EditorTab } from './ui/editor.js';
import { showUnsavedChangesDialog } from './ui/dialogs/unsavedChangesDialog.js';
import { showAboutDialog } from './ui/dialogs/aboutDialog.js';
import { createMainConsolePanel } from './ui/panels/mainConsolePanel.js';
import { createVirtualKeyboardPanel, VirtualKeyboardInstance } from './ui/panels/virtualKeyboardPanel.js';
import { createDipSwitchesPanel, DipSwitchesInstance } from './ui/panels/dipSwitchesPanel.js';
import { createLedsPanel, LedsInstance } from './ui/panels/ledsPanel.js';
import { createDisplays7Panel, Displays7Instance } from './ui/panels/displays7Panel.js';
import { createDisplays15Panel, Displays15Instance } from './ui/panels/displays15Panel.js';
import { createCrtTerminalPanel, CrtTerminalInstance } from './ui/panels/crtTerminalPanel.js';
import { createMemoryPanel } from './ui/panels/memoryPanel.js';
import { openInterruptsDialog } from './ui/panels/interruptsDialog.js';
import { createDisassemblerPanel, DisassemblerPanel } from './ui/panels/disassemblerPanel.js';
import { createStackVisualizerPanel, StackVisualizerPanel } from './ui/panels/stackVisualizerPanel.js';
import { createDelayGeneratorDialog } from './ui/dialogs/delayGeneratorDialog.js';
import { createFlowchartPanel, FlowchartPanel } from './ui/panels/flowchartPanel.js';
import { createInstructionsPanel, InstructionsPanelInstance } from './ui/panels/instructionsPanel.js';
import { AssemblyResult } from './core/types.js';

class SimulatorApp {
  private cpu = new Intel8085();
  private assembler = new Assembler8085();
  private perifs: PeripheralsManager;
  private winManager: MDIWindowManager;

  private editor!: CodeEditor;
  private mainConsole!: ReturnType<typeof createMainConsolePanel>;
  private memPanelInstance?: ReturnType<typeof createMemoryPanel>;
  private disasmPanelInstance?: DisassemblerPanel;
  private stackPanelInstance?: StackVisualizerPanel;
  private flowchartPanelInstance?: FlowchartPanel;
  private instructionsPanelInstance?: InstructionsPanelInstance;
  private crtTerminalInstance?: CrtTerminalInstance | null = null;
  private virtualKeyboardInstance?: VirtualKeyboardInstance | null = null;
  private displays7Instance?: Displays7Instance | null = null;
  private displays15Instance?: Displays15Instance | null = null;
  private ledsInstance?: LedsInstance | null = null;
  private dipSwitchesInstance?: DipSwitchesInstance | null = null;
  private lastAssemblyResult: AssemblyResult | null = null;

  private isRunning: boolean = false;
  private runTimer: any = null;
  private executionIntervalMs: number = 16;
  private clockFrequencyHz: number = 300000;
  private uiFrameRequested: boolean = false;

  constructor() {
    this.perifs = new PeripheralsManager(this.cpu);

    const desktop = document.getElementById('mdi-desktop') as HTMLElement;
    const taskbar = document.getElementById('mdi-taskbar-items') as HTMLElement;
    this.winManager = new MDIWindowManager(desktop, taskbar);

    this.initUI();
    this.setupMenu();
    this.setupShortcuts();
    this.setupExitHandlers();
    this.loadInitialProgram();
  }

  private initUI(): void {
    const desktopEl = document.getElementById('mdi-desktop');
    const availableW = desktopEl && desktopEl.clientWidth > 0 ? desktopEl.clientWidth : window.innerWidth;
    const availableH = desktopEl && desktopEl.clientHeight > 0 ? desktopEl.clientHeight : window.innerHeight - 80;

    const gap = 8;
    const windowH = Math.max(580, availableH - (gap * 2));

    // Editor on the left takes ~46% of desktop width
    const editorW = Math.max(480, Math.floor((availableW - (gap * 3)) * 0.46));
    // Main Console on the right takes the remaining width
    const consoleX = gap + editorW + gap;
    const consoleW = Math.max(740, availableW - consoleX - gap);

    // 1. EDITOR ASM (Left Window - Replica exacta de Imagen 1)
    const editorContainer = document.createElement('div');
    editorContainer.style.width = '100%';
    editorContainer.style.height = '100%';

    this.editor = new CodeEditor(editorContainer, '', {
      onChange: (code) => this.scheduleAutoSave(code),
      onTabChange: (filename, code) => {
        this.currentFileName = filename;
        this.winManager.setWindowTitle('editor', `Editor ASM - [${filename}] (F9 Ensamblar)`);
        try {
          localStorage.setItem('sim8085_current_filename', filename);
        } catch {}
        this.scheduleAutoSave(code);
      },
      onOpenDelayGen: () => this.openDelayGeneratorWindow(),
      onAssemble: () => this.assembleCode(),
      onStep: () => this.stepCpu(),
      onStepOver: () => this.stepOver(),
      onStepBack: () => this.stepBack(),
      onRun: () => this.toggleRun(),
      onReset: () => this.resetCpu(),
      onSave: () => this.saveAsmFile(),
      onSaveTab: async (tab) => this.saveAsmFile(false, tab),
      onToggleBreakpoint: (line, active) => this.handleEditorBreakpointToggle(line, active)
    });

    this.winManager.createWindow({
      id: 'editor',
      title: 'Editor ASM - [sin_titulo.asm] (F9 Ensamblar)',
      icon: '📝',
      x: gap,
      y: gap,
      width: editorW,
      height: windowH,
      minWidth: 420,
      minHeight: 400,
      content: editorContainer,
      isClosable: false
    });

    // 2. CONSOLA PRINCIPAL DE LA CPU (Right Window - Replica exacta de Imagen 1)
    this.mainConsole = createMainConsolePanel(this.cpu, this.perifs, {
      onStep: () => this.stepCpu(),
      onStepOver: () => this.stepOver(),
      onStepBack: () => this.stepBack(),
      onRun: () => this.startRun(),
      onStop: () => this.pauseRun(),
      onReset: () => this.resetCpu(),
      onToggleBreakpoint: (addr) => this.handleConsoleBreakpointToggle(addr)
    });

    this.winManager.createWindow({
      id: 'main-console',
      title: 'Simulador de 8085 (Consola Central de la CPU)',
      icon: '⚡',
      x: consoleX,
      y: gap,
      width: consoleW,
      height: windowH,
      minWidth: 740,
      minHeight: 520,
      content: this.mainConsole.element,
      isClosable: false
    });

    this.winManager.bringToFront('main-console');
  }

  public openTerminalWindow(): void {
    if (this.winManager.hasWindow('crt-terminal')) {
      this.winManager.bringToFront('crt-terminal');
      this.winManager.restoreWindow('crt-terminal');
      this.crtTerminalInstance?.update();
      return;
    }
    this.crtTerminalInstance = createCrtTerminalPanel(this.cpu, this.perifs, () => this.isRunning);
    this.winManager.createWindow({
      id: 'crt-terminal',
      title: 'Pantalla de Texto / Terminal CRT (0E000H)',
      icon: '📺',
      x: 100,
      y: 60,
      width: 560,
      height: 480,
      minWidth: 380,
      minHeight: 250,
      content: this.crtTerminalInstance.element,
      onClose: () => {
        this.crtTerminalInstance?.destroy();
        this.crtTerminalInstance = null;
      }
    });
    this.crtTerminalInstance.update();
  }

  public openDipSwitchesWindow(): void {
    if (this.winManager.hasWindow('dip-switches')) {
      this.winManager.bringToFront('dip-switches');
      this.winManager.restoreWindow('dip-switches');
      this.dipSwitchesInstance?.update();
      return;
    }
    this.dipSwitchesInstance = createDipSwitchesPanel(this.perifs);
    this.winManager.createWindow({
      id: 'dip-switches',
      title: 'Panel de Interruptores',
      icon: '🎚️',
      x: 40,
      y: 300,
      width: 340,
      height: 380,
      content: this.dipSwitchesInstance.element,
      onClose: () => {
        this.dipSwitchesInstance?.destroy();
        this.dipSwitchesInstance = null;
      }
    });
    this.dipSwitchesInstance.update();
  }

  public openLedsWindow(): void {
    if (this.winManager.hasWindow('leds')) {
      this.winManager.bringToFront('leds');
      this.winManager.restoreWindow('leds');
      this.ledsInstance?.update();
      return;
    }
    this.ledsInstance = createLedsPanel(this.perifs);
    this.winManager.createWindow({
      id: 'leds',
      title: 'Panel de LEDs',
      icon: '💡',
      x: 380,
      y: 300,
      width: 340,
      height: 380,
      content: this.ledsInstance.element,
      onClose: () => {
        this.ledsInstance?.destroy();
        this.ledsInstance = null;
      }
    });
    this.ledsInstance.update();
  }

  public openDisplays7Window(): void {
    if (this.winManager.hasWindow('displays7')) {
      this.winManager.bringToFront('displays7');
      this.winManager.restoreWindow('displays7');
      this.displays7Instance?.update();
      return;
    }
    this.displays7Instance = createDisplays7Panel(this.perifs);
    this.winManager.createWindow({
      id: 'displays7',
      title: 'Display 7 segmentos',
      icon: '🔢',
      x: 100,
      y: 180,
      width: 480,
      height: 180,
      content: this.displays7Instance.element,
      onClose: () => {
        this.displays7Instance?.destroy();
        this.displays7Instance = null;
      }
    });
    this.displays7Instance.update();
  }

  public openDisplays15Window(): void {
    if (this.winManager.hasWindow('displays15')) {
      this.winManager.bringToFront('displays15');
      this.winManager.restoreWindow('displays15');
      this.displays15Instance?.update();
      return;
    }
    this.displays15Instance = createDisplays15Panel(this.perifs);
    this.winManager.createWindow({
      id: 'displays15',
      title: 'Display 15 segmentos',
      icon: '🔤',
      x: 120,
      y: 220,
      width: 480,
      height: 180,
      content: this.displays15Instance.element,
      onClose: () => {
        this.displays15Instance?.destroy();
        this.displays15Instance = null;
      }
    });
    this.displays15Instance.update();
  }

  public openKeyboardWindow(): void {
    if (this.winManager.hasWindow('virtual-keyboard')) {
      this.winManager.bringToFront('virtual-keyboard');
      this.winManager.restoreWindow('virtual-keyboard');
      this.virtualKeyboardInstance?.update();
      return;
    }
    this.virtualKeyboardInstance = createVirtualKeyboardPanel(this.perifs);
    this.winManager.createWindow({
      id: 'virtual-keyboard',
      title: 'Teclado (Asociado a Puerto 00H / RST 5.5 / TRAP)',
      icon: '⌨️',
      x: 120,
      y: 180,
      width: 520,
      height: 240,
      minWidth: 420,
      minHeight: 200,
      content: this.virtualKeyboardInstance.element,
      onClose: () => {
        this.virtualKeyboardInstance?.destroy();
        this.virtualKeyboardInstance = null;
      }
    });
    this.virtualKeyboardInstance.update();
  }

  private async loadInitialProgram(): Promise<void> {
    const savedCode = localStorage.getItem('sim8085_saved_code');
    const savedName = localStorage.getItem('sim8085_current_filename') || 'sin_titulo.asm';
    if (savedCode !== null && savedCode.trim().length > 0) {
      this.editor.setValue(savedCode);
      this.setCurrentFileName(savedName);
      this.assembleCode();
      this.editor.setStatus(`💾 [${savedName}] restaurado de la sesión anterior`);
      return;
    }

    // Primera ejecución (o sesión limpia): Hoja completamente en blanco
    this.editor.setValue('');
    this.setCurrentFileName('sin_titulo.asm');
    this.editor.setStatus('Listo (Editor en blanco)');
  }

  public assembleCode(): boolean {
    const code = this.editor.getValue();
    this.saveToStorage(code);
    const result = this.assembler.assemble(code);

    if (!result.success) {
      const err = result.diagnostics.find(d => d.isError);
      this.editor.setStatus(`Error línea ${err?.line}: ${err?.message}`, true);
      alert(`Error en ensamblado:\nLínea ${err?.line}: ${err?.message}`);
      return false;
    }

    this.lastAssemblyResult = result;

    // Load to RAM
    this.cpu.memory.set(result.memory);
    this.cpu.regs.pc = result.entryPoint;
    this.cpu.halted = false;

    // Auto-detect interrupt handlers configured for keyboard in assembly program
    if (result.memory[0x0024] !== 0) {
      this.perifs.state.autoInterrupts.trap.mode = 'keyboard';
    }
    if (result.memory[0x002C] !== 0) {
      this.perifs.state.autoInterrupts.rst55.mode = 'keyboard';
    }
    if (result.memory[0x0034] !== 0) {
      this.perifs.state.autoInterrupts.rst65.mode = 'keyboard';
    }
    if (result.memory[0x003C] !== 0) {
      this.perifs.state.autoInterrupts.rst75.mode = 'keyboard';
    }

    // Trigger peripherals and terminal update with loaded memory & ports
    this.perifs.notify();
    this.perifs.notifyTerminal();

    // Synchronize breakpoints from editor line numbers to CPU addresses
    this.cpu.breakpoints.clear();
    for (const line of this.editor.breakpoints) {
      const addr = result.sourceLineToAddress.get(line);
      if (addr !== undefined) {
        this.cpu.breakpoints.add(addr);
      }
    }

    const startLine = result.addressToSourceLine.get(result.entryPoint) ?? -1;
    this.editor.setExecutionLine(startLine);

    this.editor.needsAssemble = false;
    const warnings = result.diagnostics.filter(d => !d.isError);
    if (warnings.length > 0) {
      const firstW = warnings[0];
      const count = warnings.length > 1 ? ` (+${warnings.length - 1} más)` : '';
      this.editor.setStatus(`⚠️ L.${firstW.line}: ${firstW.message}${count}`, false, true);
    } else {
      this.editor.setStatus(`Ensamblado con éxito. Origen: ${result.entryPoint.toString(16).padStart(4, '0').toUpperCase()}H (0 errores)`);
    }

    this.updateAllViews();
    return true;
  }

  private handleEditorBreakpointToggle(line: number, active: boolean): void {
    if (!this.lastAssemblyResult) return;
    const addr = this.lastAssemblyResult.sourceLineToAddress.get(line);
    if (addr !== undefined) {
      if (active) this.cpu.breakpoints.add(addr);
      else this.cpu.breakpoints.delete(addr);
      this.mainConsole.update();
    }
  }

  private handleConsoleBreakpointToggle(addr: number): void {
    if (!this.lastAssemblyResult) return;
    const line = this.lastAssemblyResult.addressToSourceLine.get(addr);
    if (line !== undefined) {
      if (this.cpu.hasBreakpoint(addr)) {
        this.editor.breakpoints.add(line);
      } else {
        this.editor.breakpoints.delete(line);
      }
      this.editor.setBreakpoints(this.editor.breakpoints);
    }
  }

  public stepCpu(): void {
    if (this.editor.needsAssemble || this.cpu.halted) {
      const ok = this.assembleCode();
      if (!ok) return;
    }

    this.cpu.recordHistory = true;
    this.cpu.step();
    const line = this.lastAssemblyResult?.addressToSourceLine.get(this.cpu.regs.pc) ?? -1;
    this.editor.setExecutionLine(line);
    this.updateAllViews();

    if (this.cpu.halted) {
      this.pauseRun();
      this.editor.setStatus('CPU detenido por instrucción HLT.');
    }
  }

  public stepOver(): void {
    if (this.editor.needsAssemble || this.cpu.halted) {
      const ok = this.assembleCode();
      if (!ok) return;
    }

    this.cpu.recordHistory = true;
    const pc = this.cpu.regs.pc;
    const op = this.cpu.readByte(pc);

    // Check if opcode is CALL or conditional CALL
    // 0xCD: CALL (unconditional)
    // 0xCC: CZ, 0xC4: CNZ, 0xDC: CC, 0xD4: CNC, 0xF4: CP, 0xFA: CM, 0xEC: CPE, 0xE4: CPO
    let isCall = false;
    let willBranch = false;

    if (op === 0xCD) {
      isCall = true;
      willBranch = true;
    } else if (op === 0xCC) { isCall = true; willBranch = this.cpu.flags.z; }
    else if (op === 0xC4) { isCall = true; willBranch = !this.cpu.flags.z; }
    else if (op === 0xDC) { isCall = true; willBranch = this.cpu.flags.cy; }
    else if (op === 0xD4) { isCall = true; willBranch = !this.cpu.flags.cy; }
    else if (op === 0xEC) { isCall = true; willBranch = this.cpu.flags.p; }
    else if (op === 0xE4) { isCall = true; willBranch = !this.cpu.flags.p; }
    else if (op === 0xF4) { isCall = true; willBranch = !this.cpu.flags.s; }
    else if (op === 0xFA) { isCall = true; willBranch = this.cpu.flags.s; }

    if (!isCall || !willBranch) {
      this.stepCpu();
      return;
    }

    const returnAddr = (pc + 3) & 0xffff;
    const maxInstructions = 300000;
    let executed = 0;

    // Execute first instruction (the CALL itself)
    this.cpu.step();
    executed++;

    while (this.cpu.regs.pc !== returnAddr && !this.cpu.halted && executed < maxInstructions) {
      // Check if internal breakpoint was reached
      if (this.cpu.hasBreakpoint(this.cpu.regs.pc)) {
        this.editor.setStatus(`Paso sobre subrutina pausado por punto de interrupción en ${this.cpu.regs.pc.toString(16).padStart(4, '0').toUpperCase()}H`);
        break;
      }
      this.cpu.step();
      executed++;
    }

    const line = this.lastAssemblyResult?.addressToSourceLine.get(this.cpu.regs.pc) ?? -1;
    this.editor.setExecutionLine(line);
    this.updateAllViews();

    if (this.cpu.halted) {
      this.pauseRun();
      this.editor.setStatus('CPU detenido por instrucción HLT.');
    } else if (executed >= maxInstructions) {
      this.editor.setStatus('Paso sobre subrutina pausado: límite de ciclos alcanzado.');
    }
  }

  public stepBack(): void {
    if (this.isRunning) {
      this.pauseRun();
    }
    const success = this.cpu.stepBack();
    if (success) {
      const line = this.lastAssemblyResult?.addressToSourceLine.get(this.cpu.regs.pc) ?? -1;
      this.editor.setExecutionLine(line);
      this.editor.setStatus(`Paso deshecho. PC = ${this.cpu.regs.pc.toString(16).padStart(4, '0').toUpperCase()}H (Historial: ${this.cpu.getHistoryLength()} pasos)`);
      this.updateAllViews();
    } else {
      this.editor.setStatus('No hay más pasos en el historial para retroceder.', true);
    }
  }

  public toggleRun(): void {
    if (this.isRunning) {
      this.pauseRun();
    } else {
      this.startRun();
    }
  }

  public startRun(): void {
    if (this.editor.needsAssemble || this.cpu.halted) {
      const ok = this.assembleCode();
      if (!ok) return;
    }
    this.isRunning = true;
    this.cpu.recordHistory = false;
    this.mainConsole.setRunningState(true);
    const runBtn = document.getElementById('btn-run');
    if (runBtn) runBtn.textContent = '⏸️ Pausar (F5)';

    this.runTimer = setInterval(() => {
      const targetCycles = Math.max(1, Math.round(this.clockFrequencyHz * (this.executionIntervalMs / 1000)));
      let cyclesRan = 0;
      while (cyclesRan < targetCycles) {
        if (this.cpu.halted) {
          this.pauseRun();
          break;
        }
        if (this.cpu.hasBreakpoint(this.cpu.regs.pc)) {
          this.pauseRun();
          this.editor.setStatus(`Pausado por punto de interrupción en ${this.cpu.regs.pc.toString(16).padStart(4, '0').toUpperCase()}H`);
          break;
        }
        const c = this.cpu.step();
        cyclesRan += c;
      }
      this.requestUiUpdate();
    }, this.executionIntervalMs);
  }

  public requestUiUpdate(): void {
    if (this.uiFrameRequested) return;
    this.uiFrameRequested = true;
    requestAnimationFrame(() => {
      this.uiFrameRequested = false;
      const line = this.lastAssemblyResult?.addressToSourceLine.get(this.cpu.regs.pc) ?? -1;
      this.editor.setExecutionLine(line);
      this.updateAllViews();
    });
  }

  public pauseRun(): void {
    this.isRunning = false;
    this.mainConsole.setRunningState(false);
    if (this.runTimer) {
      clearInterval(this.runTimer);
      this.runTimer = null;
    }
    const runBtn = document.getElementById('btn-run');
    if (runBtn) runBtn.textContent = '▶️ Ejecutar (F5)';
    this.updateAllViews();
  }

  public resetCpu(): void {
    this.pauseRun();
    if (this.editor.needsAssemble) {
      this.assembleCode();
    }
    this.cpu.reset();
    this.perifs.reset();
    this.editor.setExecutionLine(-1);
    this.editor.setStatus('CPU reiniciado a 0000H');
    this.updateAllViews();
  }

  public setSpeed(preset: string, fineValue: number = 80): void {
    switch (preset) {
      case '1hz':
        this.executionIntervalMs = 1000;
        this.clockFrequencyHz = 10;
        break;
      case '10hz':
        this.executionIntervalMs = 100;
        this.clockFrequencyHz = 100;
        break;
      case '50hz':
        this.executionIntervalMs = 40;
        this.clockFrequencyHz = 500;
        break;
      case '100hz':
        this.executionIntervalMs = 20;
        this.clockFrequencyHz = 2000;
        break;
      case '1khz':
        this.executionIntervalMs = 20;
        this.clockFrequencyHz = 10000;
        break;
      case '10khz':
        this.executionIntervalMs = 16;
        this.clockFrequencyHz = 50000;
        break;
      case '100khz':
        this.executionIntervalMs = 16;
        this.clockFrequencyHz = 100000;
        break;
      case '300khz':
      case 'normal':
      case 'realtime':
        this.executionIntervalMs = 16;
        this.clockFrequencyHz = 300000; // 300 kHz (cátedra 8085sim)
        break;
      case '500khz':
        this.executionIntervalMs = 16;
        this.clockFrequencyHz = 500000;
        break;
      case '1mhz':
        this.executionIntervalMs = 16;
        this.clockFrequencyHz = 1000000;
        break;
      case '2mhz':
        this.executionIntervalMs = 16;
        this.clockFrequencyHz = 2000000; // 2 MHz real hardware
        break;
      case 'max':
        this.executionIntervalMs = 10;
        this.clockFrequencyHz = 10000000; // Max Turbo
        break;
      default:
        this.executionIntervalMs = 16;
        if (fineValue <= 20) {
          this.clockFrequencyHz = fineValue * 500;
        } else if (fineValue <= 60) {
          this.clockFrequencyHz = 10000 + (fineValue - 20) * 5000;
        } else {
          this.clockFrequencyHz = 200000 + (fineValue - 60) * 20000;
        }
        break;
    }

    if (this.isRunning) {
      this.pauseRun();
      this.startRun();
    }
  }

  public openMemoryWindow(): void {
    this.memPanelInstance = createMemoryPanel(this.cpu, () => this.updateAllViews());
    this.winManager.createWindow({
      id: 'memory-viewer',
      title: 'Visor de Memoria RAM (Hex/ASCII - Doble clic para editar)',
      icon: '🗄️',
      x: 140,
      y: 100,
      width: 620,
      height: 480,
      minWidth: 480,
      minHeight: 320,
      content: this.memPanelInstance.element
    });
  }

  public openDisassemblerWindow(): void {
    this.disasmPanelInstance = createDisassemblerPanel(this.cpu);
    this.winManager.createWindow({
      id: 'disassembler-view',
      title: 'Desensamblador Inverso de Memoria RAM',
      icon: '🔍',
      x: 160,
      y: 120,
      width: 620,
      height: 480,
      minWidth: 440,
      minHeight: 300,
      content: this.disasmPanelInstance.element
    });
    this.winManager.bringToFront('disassembler-view');
  }

  public openStackVisualizerWindow(): void {
    this.stackPanelInstance = createStackVisualizerPanel(this.cpu);
    this.winManager.createWindow({
      id: 'stack-visualizer-view',
      title: 'Visualizador de Pila (Stack LIFO)',
      icon: '📚',
      x: 180,
      y: 140,
      width: 580,
      height: 460,
      minWidth: 420,
      minHeight: 280,
      content: this.stackPanelInstance.element
    });
    this.winManager.bringToFront('stack-visualizer-view');
  }

  public openDelayGeneratorWindow(): void {
    const dialogElem = createDelayGeneratorDialog((codeToInsert) => {
      const cur = this.editor.getValue();
      this.editor.setValue(cur + '\n\n' + codeToInsert);
      this.winManager.bringToFront('editor');
      this.editor.setStatus('✨ Subrutina de retardo insertada en el código');
    });

    this.winManager.createWindow({
      id: 'delay-gen-view',
      title: 'Calculador y Generador de Retardos ASM',
      icon: '⏱️',
      x: 200,
      y: 80,
      width: 660,
      height: 540,
      minWidth: 480,
      minHeight: 360,
      content: dialogElem
    });
    this.winManager.bringToFront('delay-gen-view');
  }

  public openFlowchartWindow(): void {
    this.flowchartPanelInstance = createFlowchartPanel(this.editor.getValue());
    this.winManager.createWindow({
      id: 'flowchart-view',
      title: 'Diagrama de Flujo del Algoritmo (Flujo de Ejecución)',
      icon: '🔀',
      x: 220,
      y: 100,
      width: 680,
      height: 560,
      minWidth: 480,
      minHeight: 350,
      content: this.flowchartPanelInstance.element
    });
    this.winManager.bringToFront('flowchart-view');
  }

  public openInstructionsDictionaryWindow(instructionToSelect?: string): void {
    if (this.winManager.getWindow('instructions-view')) {
      this.winManager.bringToFront('instructions-view');
      if (instructionToSelect && this.instructionsPanelInstance) {
        this.instructionsPanelInstance.selectInstruction(instructionToSelect);
      }
      return;
    }

    this.instructionsPanelInstance = createInstructionsPanel({
      onInsertCode: (code) => {
        this.editor.insertAtCursor(code);
        this.winManager.bringToFront('editor');
        this.editor.setStatus('✍️ Código insertado desde el Diccionario de Instrucciones');
      }
    });

    if (instructionToSelect) {
      this.instructionsPanelInstance.selectInstruction(instructionToSelect);
    }

    this.winManager.createWindow({
      id: 'instructions-view',
      title: 'Diccionario Técnico de Instrucciones Intel 8085 (F1)',
      icon: '📖',
      x: 180,
      y: 60,
      width: 820,
      height: 580,
      minWidth: 540,
      minHeight: 380,
      content: this.instructionsPanelInstance.element
    });
    this.winManager.bringToFront('instructions-view');
  }

  private updateAllViews(): void {
    this.mainConsole.update();
    if (this.memPanelInstance) {
      this.memPanelInstance.update();
    }
    if (this.disasmPanelInstance) {
      this.disasmPanelInstance.update();
    }
    if (this.stackPanelInstance) {
      this.stackPanelInstance.update();
    }
    if (this.crtTerminalInstance) {
      this.crtTerminalInstance.update();
    }
    if (this.displays7Instance) {
      this.displays7Instance.update();
    }
    if (this.displays15Instance) {
      this.displays15Instance.update();
    }
    if (this.ledsInstance) {
      this.ledsInstance.update();
    }
    if (this.dipSwitchesInstance) {
      this.dipSwitchesInstance.update();
    }
    if (this.virtualKeyboardInstance) {
      this.virtualKeyboardInstance.update();
    }
  }

  private setupMenu(): void {
    // Menu Dropdowns
    document.querySelectorAll('.menu-bar-item').forEach(item => {
      const btn = item.querySelector('.menu-btn');
      const dropdown = item.querySelector('.menu-dropdown') as HTMLElement;
      if (!btn || !dropdown) return;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('show');
        document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('show'));
        if (!isOpen) dropdown.classList.add('show');
      });
    });

    document.addEventListener('click', () => {
      document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('show'));
    });

    // File Actions
    document.getElementById('menu-file-new')?.addEventListener('click', () => {
      this.editor.newTab();
      const curTab = this.editor.tabs.find(t => t.id === this.editor.activeTabId);
      if (curTab) {
        this.setCurrentFileName(curTab.name);
      }
      this.winManager.bringToFront('editor');
    });

    document.getElementById('menu-file-open')?.addEventListener('click', () => this.openAsmFile());
    document.getElementById('menu-file-save')?.addEventListener('click', () => this.saveAsmFile(false));
    document.getElementById('menu-file-save-as')?.addEventListener('click', () => this.saveAsmFile(true));
    document.getElementById('menu-file-export-o')?.addEventListener('click', () => this.exportObjectFile());
    document.getElementById('menu-file-exit')?.addEventListener('click', () => this.handleAppExit());

    // Execute Actions
    document.getElementById('menu-exec-assemble')?.addEventListener('click', () => this.assembleCode());
    document.getElementById('menu-exec-step')?.addEventListener('click', () => this.stepCpu());
    document.getElementById('menu-exec-step-over')?.addEventListener('click', () => this.stepOver());
    document.getElementById('menu-exec-step-back')?.addEventListener('click', () => this.stepBack());
    document.getElementById('menu-exec-run')?.addEventListener('click', () => this.startRun());
    document.getElementById('menu-exec-pause')?.addEventListener('click', () => this.pauseRun());
    document.getElementById('menu-exec-reset')?.addEventListener('click', () => this.resetCpu());

    // Devices (Image 3)
    document.getElementById('menu-dev-editor')?.addEventListener('click', () => {
      this.winManager.bringToFront('editor');
    });

    document.getElementById('menu-dev-memory')?.addEventListener('click', () => {
      this.openMemoryWindow();
    });

    document.getElementById('menu-dev-disasm')?.addEventListener('click', () => {
      this.openDisassemblerWindow();
    });

    document.getElementById('menu-dev-stack')?.addEventListener('click', () => {
      this.openStackVisualizerWindow();
    });

    // Speed Controls in header
    const speedSelect = document.getElementById('speed-preset-select') as HTMLSelectElement;
    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;

    speedSelect?.addEventListener('change', () => {
      this.setSpeed(speedSelect.value, parseInt(speedSlider?.value || '50', 10));
    });

    speedSlider?.addEventListener('input', () => {
      this.setSpeed('slider', parseInt(speedSlider.value, 10));
    });

    document.getElementById('menu-dev-switches')?.addEventListener('click', () => {
      this.openDipSwitchesWindow();
    });

    document.getElementById('menu-dev-leds')?.addEventListener('click', () => {
      this.openLedsWindow();
    });

    document.getElementById('menu-dev-displays7')?.addEventListener('click', () => {
      this.openDisplays7Window();
    });

    document.getElementById('menu-dev-displays15')?.addEventListener('click', () => {
      this.openDisplays15Window();
    });

    document.getElementById('menu-dev-terminal')?.addEventListener('click', () => {
      this.openTerminalWindow();
    });

    document.getElementById('menu-dev-keypad')?.addEventListener('click', () => {
      this.openKeyboardWindow();
    });

    // Options - Instructions Dictionary, Delay Generator & Auto Interrupts
    document.getElementById('menu-opt-instructions')?.addEventListener('click', () => {
      this.openInstructionsDictionaryWindow();
    });

    document.getElementById('menu-opt-delay-gen')?.addEventListener('click', () => {
      this.openDelayGeneratorWindow();
    });

    document.getElementById('menu-opt-interrupts')?.addEventListener('click', () => {
      openInterruptsDialog(this.perifs);
    });

    // View - Flowchart & Word Wrap
    document.getElementById('menu-view-word-wrap')?.addEventListener('click', () => {
      this.editor.toggleWordWrap();
    });

    document.getElementById('menu-view-flowchart')?.addEventListener('click', () => {
      this.openFlowchartWindow();
    });

    // Help & About Dialog (UMSS - FCyT)
    document.getElementById('menu-help-instructions')?.addEventListener('click', () => {
      this.openInstructionsDictionaryWindow();
    });
    document.getElementById('menu-help-about')?.addEventListener('click', () => {
      showAboutDialog();
    });
    document.getElementById('btn-brand-about')?.addEventListener('click', () => {
      showAboutDialog();
    });

    // Theme Toggle with persistence
    const savedTheme = localStorage.getItem('sim8085_theme') || 'dark';
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      const qBtn = document.getElementById('btn-quick-theme');
      if (qBtn) qBtn.textContent = '☀️';
    }

    const toggleTheme = () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      try {
        localStorage.setItem('sim8085_theme', isLight ? 'light' : 'dark');
      } catch {}
      const qBtn = document.getElementById('btn-quick-theme');
      if (qBtn) qBtn.textContent = isLight ? '☀️' : '🌙';
    };

    document.getElementById('menu-view-theme')?.addEventListener('click', toggleTheme);
    document.getElementById('btn-quick-theme')?.addEventListener('click', toggleTheme);

    // Zoom Controls
    document.getElementById('menu-view-zoom-in')?.addEventListener('click', () => this.applyZoom(0.1));
    document.getElementById('menu-view-zoom-out')?.addEventListener('click', () => this.applyZoom(-0.1));
    document.getElementById('menu-view-zoom-reset')?.addEventListener('click', () => this.applyZoom(0));

    // Quick examples loader
    const setupExampleLoader = (elemId: string, filename: string, openTerminal: boolean = false) => {
      document.getElementById(elemId)?.addEventListener('click', async () => {
        try {
          const res = await fetch(`./examples/${filename}`);
          if (res.ok) {
            const text = await res.text();
            this.editor.openTab(filename, text);
            this.setCurrentFileName(filename);
            this.saveToStorage(text);
            this.assembleCode();
            this.startRun();
            if (openTerminal) {
              this.openTerminalWindow();
            }
          }
        } catch (e) {
          console.error(e);
        }
      });
    };

    setupExampleLoader('menu-example-cajero', 'cajero.asm', true);
    setupExampleLoader('menu-example-ejemplo25', 'ejemplo 25.asm', false);
    setupExampleLoader('menu-example-snake', 'Snake.asm', true);
    setupExampleLoader('menu-example-leds', 'Leds.asm', false);
  }

  public async openAsmFile(): Promise<void> {
    // 1. Modern Chromium / Edge WebView2 File System Access API
    if (typeof (window as any).showOpenFilePicker === 'function') {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          id: 'sim8085_asm_dir',
          types: [
            {
              description: 'Código Ensamblador Intel 8085 (*.asm, *.s, *.txt)',
              accept: { 'text/plain': ['.asm', '.s', '.txt'] }
            }
          ],
          multiple: false
        });

        const file = await handle.getFile();
        const text = await file.text();
        this.editor.openTab(file.name, text, handle);
        this.setCurrentFileName(file.name);
        this.saveToStorage(text);
        this.winManager.bringToFront('editor');
        this.assembleCode();
        this.editor.setStatus(`📂 Abierto: ${file.name}`);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('showOpenFilePicker failed, falling back:', err);
      }
    }

    // 2. Neutralino Native API
    const winNeu = (window as any).Neutralino;
    if (winNeu && winNeu.os && winNeu.filesystem) {
      try {
        const entries = await winNeu.os.showOpenDialog('Abrir archivo ASM', {
          filters: [{ name: 'Código Ensamblador (*.asm, *.s, *.txt)', extensions: ['asm', 's', 'txt'] }],
          multiSelections: false
        });
        if (entries && entries.length > 0) {
          const filePath = entries[0];
          const text = await winNeu.filesystem.readFile(filePath);
          const fileName = filePath.split(/[\\/]/).pop() || 'programa.asm';
          this.editor.openTab(fileName, text, undefined, filePath);
          this.setCurrentFileName(fileName);
          this.saveToStorage(text);
          this.winManager.bringToFront('editor');
          this.assembleCode();
          this.editor.setStatus(`📂 Abierto: ${fileName}`);
          return;
        }
      } catch (err) {
        console.warn('Neutralino openDialog failed:', err);
      }
    }

    // 3. Fallback input file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.asm,.s,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        if (typeof re.target?.result === 'string') {
          this.editor.openTab(file.name, re.target.result);
          this.setCurrentFileName(file.name);
          this.saveToStorage(re.target.result);
          this.winManager.bringToFront('editor');
          this.assembleCode();
          this.editor.setStatus(`📂 Abierto: ${file.name}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  public async saveAsmFile(forceSaveAs: boolean = false, targetTab?: EditorTab): Promise<boolean> {
    if (targetTab && targetTab.id !== this.editor.activeTabId) {
      this.editor.switchTab(targetTab.id);
    }
    const curTab = this.editor.getActiveTab();
    if (!curTab) return false;

    const content = this.editor.getValue();
    this.saveToStorage(content);

    // 1. Direct overwrite if file already has a handle/path and NOT forcing Save As
    if (!forceSaveAs && curTab.fileHandle) {
      try {
        const writable = await curTab.fileHandle.createWritable();
        await writable.write(content);
        await writable.close();

        curTab.isDirty = false;
        this.editor.isDirty = false;
        this.editor.renderTabs();
        this.editor.setStatus(`💾 Guardado: ${curTab.name}`);
        return true;
      } catch (err) {
        console.warn('Error sobrescribiendo mediante fileHandle, solicitando ubicación:', err);
      }
    }

    if (!forceSaveAs && curTab.filePath) {
      const winNeu = (window as any).Neutralino;
      if (winNeu && winNeu.filesystem) {
        try {
          await winNeu.filesystem.writeFile(curTab.filePath, content);
          curTab.isDirty = false;
          this.editor.isDirty = false;
          this.editor.renderTabs();
          this.editor.setStatus(`💾 Guardado: ${curTab.name}`);
          return true;
        } catch (err) {
          console.warn('Error sobrescribiendo mediante Neutralino filePath:', err);
        }
      }
    }

    // 2. Modern File System Access API (Prompts where to save, remembers path, NO downloads popup)
    if (typeof (window as any).showSaveFilePicker === 'function') {
      try {
        const handle = await (window as any).showSaveFilePicker({
          id: 'sim8085_asm_dir', // Remembers folder!
          suggestedName: curTab.name || 'programa.asm',
          types: [
            {
              description: 'Código Ensamblador Intel 8085 (*.asm)',
              accept: { 'text/plain': ['.asm', '.s', '.txt'] }
            }
          ]
        });

        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();

        curTab.fileHandle = handle;
        const file = await handle.getFile();
        curTab.name = file.name;
        this.setCurrentFileName(file.name);
        curTab.isDirty = false;
        this.editor.isDirty = false;
        this.editor.renderTabs();
        this.editor.setStatus(`💾 Guardado: ${file.name}`);
        return true;
      } catch (err: any) {
        if (err.name === 'AbortError') return false;
        console.warn('showSaveFilePicker failed:', err);
      }
    }

    // 3. Neutralino Native Dialog fallback
    const winNeu = (window as any).Neutralino;
    if (winNeu && winNeu.os && winNeu.filesystem) {
      try {
        const targetPath = await winNeu.os.showSaveDialog('Guardar programa ASM', {
          defaultPath: curTab.name || 'programa.asm',
          filters: [{ name: 'Código Ensamblador (*.asm)', extensions: ['asm', 's', 'txt'] }]
        });
        if (targetPath) {
          await winNeu.filesystem.writeFile(targetPath, content);
          curTab.filePath = targetPath;
          const fileName = targetPath.split(/[\\/]/).pop() || curTab.name;
          curTab.name = fileName;
          this.setCurrentFileName(fileName);
          curTab.isDirty = false;
          this.editor.isDirty = false;
          this.editor.renderTabs();
          this.editor.setStatus(`💾 Guardado: ${fileName}`);
          return true;
        } else {
          return false;
        }
      } catch (err) {
        console.warn('Neutralino showSaveDialog failed:', err);
      }
    }

    // 4. Last resort browser download fallback
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = curTab.name || 'programa.asm';
    a.click();
    URL.revokeObjectURL(url);
    curTab.isDirty = false;
    this.editor.isDirty = false;
    this.editor.renderTabs();
    this.editor.setStatus(`💾 Descargado: ${curTab.name}`);
    return true;
  }

  public async handleAppExit(): Promise<void> {
    if (!this.editor.hasUnsavedChanges()) {
      this.exitApp();
      return;
    }

    const unsaved = this.editor.getUnsavedTabs();
    const action = await showUnsavedChangesDialog({
      title: 'Archivos con cambios no guardados',
      message: 'Los siguientes archivos tienen modificaciones que no se han guardado. ¿Deseas guardarlas antes de salir?',
      files: unsaved,
      saveButtonText: unsaved.length > 1 ? 'Guardar Todo y Salir' : 'Guardar y Salir'
    });

    if (action === 'cancel') {
      return;
    }

    if (action === 'save') {
      for (const tab of unsaved) {
        const saved = await this.saveAsmFile(false, tab);
        if (!saved) {
          return;
        }
      }
      this.exitApp();
      return;
    }

    if (action === 'discard') {
      this.exitApp();
      return;
    }
  }

  private exitApp(): void {
    const winNeu = (window as any).Neutralino;
    if (winNeu && winNeu.app && typeof winNeu.app.exit === 'function') {
      winNeu.app.exit();
    } else {
      window.close();
    }
  }

  private setupExitHandlers(): void {
    // 1. Neutralino native window close event
    const winNeu = (window as any).Neutralino;
    if (winNeu) {
      if (typeof winNeu.init === 'function') {
        try {
          winNeu.init();
        } catch (e) {
          console.warn('Neutralino.init error:', e);
        }
      }
      if (winNeu.events && typeof winNeu.events.on === 'function') {
        winNeu.events.on('windowClose', async () => {
          await this.handleAppExit();
        });
      }
    }

    // 2. Browser beforeunload fallback
    window.addEventListener('beforeunload', (e) => {
      if (this.editor && this.editor.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    });
  }

  private async exportObjectFile(): Promise<void> {
    const code = this.editor.getValue();
    this.saveToStorage(code);
    const result = this.assembler.assemble(code);
    if (!result.success) {
      alert('Corrige los errores antes de exportar el archivo objeto .o');
      return;
    }

    const baseName = (this.currentFileName || 'programa').replace(/\.(asm|s|txt)$/i, '');

    // 1. File System Access API
    if (typeof (window as any).showSaveFilePicker === 'function') {
      try {
        const handle = await (window as any).showSaveFilePicker({
          id: 'sim8085_asm_dir',
          suggestedName: `${baseName}.o`,
          types: [
            {
              description: 'Archivo Objeto 8085sim (*.o)',
              accept: { 'text/plain': ['.o'] }
            }
          ]
        });
        const writable = await handle.createWritable();
        await writable.write(result.objectCodeText);
        await writable.close();
        this.editor.setStatus(`💾 Objeto exportado: ${baseName}.o`);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('showSaveFilePicker exportObject failed:', err);
      }
    }

    // 2. Neutralino Native API
    const winNeu = (window as any).Neutralino;
    if (winNeu && winNeu.os && winNeu.filesystem) {
      try {
        const targetPath = await winNeu.os.showSaveDialog('Exportar archivo objeto .o', {
          defaultPath: `${baseName}.o`,
          filters: [{ name: 'Archivo Objeto (*.o)', extensions: ['o'] }]
        });
        if (targetPath) {
          await winNeu.filesystem.writeFile(targetPath, result.objectCodeText);
          this.editor.setStatus(`💾 Objeto exportado: ${baseName}.o`);
          return;
        }
      } catch (err) {
        console.warn('Neutralino exportObject failed:', err);
      }
    }

    // 3. Last resort browser download
    const blob = new Blob([result.objectCodeText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.o`;
    a.click();
    URL.revokeObjectURL(url);
    this.editor.setStatus(`💾 Objeto descargado: ${baseName}.o`);
  }

  private currentFileName: string = 'programa.asm';

  public setCurrentFileName(name: string): void {
    this.currentFileName = name;
    try {
      localStorage.setItem('sim8085_current_filename', name);
    } catch {}
    this.editor.setFileName(name);
    this.winManager.setWindowTitle('editor', `Editor ASM - [${name}] (F9 Ensamblar)`);
  }

  private autoSaveTimeout: any = null;

  public saveToStorage(code?: string): void {
    const text = (code !== undefined) ? code : this.editor.getValue();
    try {
      localStorage.setItem('sim8085_saved_code', text);
    } catch (e) {
      console.warn('No se pudo guardar en localStorage:', e);
    }
  }

  public scheduleAutoSave(code: string): void {
    if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
    this.autoSaveTimeout = setTimeout(() => {
      this.saveToStorage(code);
    }, 300);
  }

  private currentZoom: number = 1.0;

  public applyZoom(delta: number): void {
    if (delta === 0) {
      this.currentZoom = 1.0;
    } else {
      this.currentZoom = Math.min(2.0, Math.max(0.75, Math.round((this.currentZoom + delta) * 100) / 100));
    }

    // Reset whole body zoom so windows are NEVER clipped or pushed out of bounds
    document.body.style.zoom = '';

    const root = document.documentElement;
    const editorFontSize = Math.round(13 * this.currentZoom);
    const editorLineHeight = Math.round(20 * this.currentZoom);

    root.style.setProperty('--ui-font-scale', `${this.currentZoom}`);
    root.style.setProperty('--editor-font-size', `${editorFontSize}px`);
    root.style.setProperty('--editor-line-height', `${editorLineHeight}px`);

    this.editor.syncScroll();
    this.editor.setStatus(`🔍 Zoom: ${Math.round(this.currentZoom * 100)}% (${editorFontSize}px)`);
  }

  private setupShortcuts(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Global shortcuts (Ctrl + S, Ctrl + O, Ctrl + / - / 0, Alt + Z, Alt + F4, Ctrl + Q)
      if (e.altKey && e.key === 'F4') {
        e.preventDefault();
        this.handleAppExit();
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.editor.toggleWordWrap();
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'q') {
          e.preventDefault();
          this.handleAppExit();
          return;
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          this.saveAsmFile(e.shiftKey);
          return;
        } else if (e.key.toLowerCase() === 'o') {
          e.preventDefault();
          this.openAsmFile();
          return;
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          this.applyZoom(0.1);
          return;
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          this.applyZoom(-0.1);
          return;
        } else if (e.key === '0') {
          e.preventDefault();
          this.applyZoom(0);
          return;
        }
      }

      // Simulator shortcuts
      if (e.key === 'F1') {
        e.preventDefault();
        this.openInstructionsDictionaryWindow();
      } else if (e.key === 'F9') {
        e.preventDefault();
        this.assembleCode();
      } else if (e.key === 'F8') {
        e.preventDefault();
        this.stepOver();
      } else if (e.key === 'F7' && e.shiftKey) {
        e.preventDefault();
        this.stepBack();
      } else if (e.key === 'F7') {
        e.preventDefault();
        this.stepCpu();
      } else if (e.key === 'F5') {
        e.preventDefault();
        this.toggleRun();
      } else if (e.key === 'F2') {
        e.preventDefault();
        this.resetCpu();
      }

      // Keyboard input forwarding to 8085 CPU (Port 00H & Interrupts)
      const target = e.target as HTMLElement | null;
      const activeTag = target?.tagName;
      const isInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';
      const isMonaco = !!target?.closest('.monaco-editor');
      const isCrtScreen = target?.id === 'crt-screen';

      if (!isInput && !isMonaco && !isCrtScreen && !e.ctrlKey && !e.altKey && !e.metaKey) {
        let char = e.key;
        if (char === 'Enter') char = '\r';
        else if (char === 'Escape') char = '\x1b';
        else if (char === 'Backspace') char = '\b';
        else if (char === 'Tab') char = '\t';

        if (char.length === 1 || char === '\r' || char === '\x1b' || char === '\b' || char === '\t') {
          this.perifs.pressKey(char);
        }
      }
    });

    document.addEventListener('keyup', (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const activeTag = target?.tagName;
      const isInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';
      const isMonaco = !!target?.closest('.monaco-editor');
      const isCrtScreen = target?.id === 'crt-screen';

      if (!isInput && !isMonaco && !isCrtScreen && !e.ctrlKey && !e.altKey && !e.metaKey) {
        this.perifs.releaseKey();
      }
    });

    // Ctrl + Mouse Wheel for smooth zooming
    window.addEventListener('wheel', (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          this.applyZoom(0.05);
        } else {
          this.applyZoom(-0.05);
        }
      }
    }, { passive: false });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // Desactivar menú contextual por defecto del navegador en toda la aplicación
  window.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
  }, { capture: true });

  new SimulatorApp();
});
