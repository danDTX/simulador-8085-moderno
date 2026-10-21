import { Intel8085 } from './core/cpu8085.js';
import { Assembler8085 } from './core/assembler.js';
import { PeripheralsManager } from './core/peripherals.js';
import { MDIWindowManager } from './ui/windowManager.js';
import { CodeEditor } from './ui/editor.js';
import { createMainConsolePanel } from './ui/panels/mainConsolePanel.js';
import { createVirtualKeyboardPanel } from './ui/panels/virtualKeyboardPanel.js';
import { createDipSwitchesPanel } from './ui/panels/dipSwitchesPanel.js';
import { createLedsPanel } from './ui/panels/ledsPanel.js';
import { createDisplays7Panel } from './ui/panels/displays7Panel.js';
import { createDisplays15Panel } from './ui/panels/displays15Panel.js';
import { createCrtTerminalPanel } from './ui/panels/crtTerminalPanel.js';
import { openInterruptsDialog } from './ui/panels/interruptsDialog.js';

class SimulatorApp {
  private cpu = new Intel8085();
  private assembler = new Assembler8085();
  private perifs: PeripheralsManager;
  private winManager: MDIWindowManager;

  private editor!: CodeEditor;
  private mainConsole!: ReturnType<typeof createMainConsolePanel>;

  private isRunning: boolean = false;
  private runTimer: any = null;
  private executionSpeedMs: number = 10;

  constructor() {
    this.perifs = new PeripheralsManager(this.cpu);

    const desktop = document.getElementById('mdi-desktop') as HTMLElement;
    const taskbar = document.getElementById('mdi-taskbar-items') as HTMLElement;
    this.winManager = new MDIWindowManager(desktop, taskbar);

    this.initUI();
    this.setupMenu();
    this.setupShortcuts();
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
      onAssemble: () => this.assembleCode(),
      onStep: () => this.stepCpu(),
      onRun: () => this.toggleRun(),
      onSave: () => this.saveAsmFile()
    });

    this.winManager.createWindow({
      id: 'editor',
      title: 'Editor ASM (F9 Ensamblar)',
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
      onRun: () => this.startRun(),
      onStop: () => this.pauseRun(),
      onReset: () => this.resetCpu()
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
    const crtPanel = createCrtTerminalPanel(this.cpu, this.perifs);
    this.winManager.createWindow({
      id: 'crt-terminal',
      title: 'Pantalla de Texto / Terminal CRT (0E000H)',
      icon: '📺',
      x: 100,
      y: 60,
      width: 520,
      height: 440,
      minWidth: 380,
      minHeight: 250,
      content: crtPanel
    });
  }

  public openKeyboardWindow(): void {
    const keyboardPanel = createVirtualKeyboardPanel(this.perifs);
    this.winManager.createWindow({
      id: 'virtual-keyboard',
      title: 'Teclado (Asociado a Puerto 00H / RST 5.5)',
      icon: '⌨️',
      x: 120,
      y: 180,
      width: 520,
      height: 240,
      minWidth: 420,
      minHeight: 200,
      content: keyboardPanel
    });
  }

  private async loadInitialProgram(): Promise<void> {
    try {
      // Try to load ejemplo 25 by default so the user can test ATM immediately
      const res = await fetch('./examples/ejemplo 25.asm');
      if (res.ok) {
        const text = await res.text();
        this.editor.setValue(text);
        this.assembleCode();
        this.startRun();
        return;
      }
    } catch {
      // Fallback
    }

    // Fallback default code
    const defaultAsm = `.org 0100H\nINICIO:\n    MVI A, 55H\n    OUT 01H\n    HLT\n`;
    this.editor.setValue(defaultAsm);
    this.assembleCode();
  }

  public assembleCode(): boolean {
    const code = this.editor.getValue();
    const result = this.assembler.assemble(code);

    if (!result.success) {
      const err = result.diagnostics.find(d => d.isError);
      this.editor.setStatus(`Error línea ${err?.line}: ${err?.message}`, true);
      alert(`Error en ensamblado:\nLínea ${err?.line}: ${err?.message}`);
      return false;
    }

    // Load to RAM
    this.cpu.memory.set(result.memory);
    this.cpu.regs.pc = result.entryPoint;
    this.cpu.halted = false;

    this.editor.setStatus(`Ensamblado con éxito. Origen: ${result.entryPoint.toString(16).padStart(4, '0').toUpperCase()}H (0 errores)`);
    this.updateAllViews();
    return true;
  }

  public stepCpu(): void {
    if (this.cpu.halted) {
      this.editor.setStatus('CPU detenido (HLT). Pulsa Reset para reiniciar.', true);
      return;
    }

    this.cpu.step();
    this.updateAllViews();

    if (this.cpu.halted) {
      this.pauseRun();
      this.editor.setStatus('CPU detenido por instrucción HLT.');
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
    if (this.cpu.halted) {
      this.assembleCode();
    }
    this.isRunning = true;
    this.mainConsole.setRunningState(true);
    const runBtn = document.getElementById('btn-run');
    if (runBtn) runBtn.textContent = '⏸️ Pausar (F5)';

    this.runTimer = setInterval(() => {
      // Step a batch of instructions per frame for responsive real-time animation
      for (let i = 0; i < 150; i++) {
        if (this.cpu.halted) {
          this.pauseRun();
          break;
        }
        this.cpu.step();
      }
      this.updateAllViews();
    }, this.executionSpeedMs);
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
    this.cpu.reset();
    this.perifs.reset();
    this.editor.setExecutionLine(-1);
    this.editor.setStatus('CPU reiniciado a 0000H');
    this.updateAllViews();
  }

  private updateAllViews(): void {
    this.mainConsole.update();
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
      if (confirm('¿Crear nuevo programa vacío?')) {
        this.editor.setValue('.org 0100H\n\ninicio:\n    HLT\n');
        this.winManager.bringToFront('editor');
      }
    });

    document.getElementById('menu-file-open')?.addEventListener('click', () => this.openAsmFile());
    document.getElementById('menu-file-save')?.addEventListener('click', () => this.saveAsmFile());
    document.getElementById('menu-file-export-o')?.addEventListener('click', () => this.exportObjectFile());

    // Execute Actions
    document.getElementById('menu-exec-assemble')?.addEventListener('click', () => this.assembleCode());
    document.getElementById('menu-exec-step')?.addEventListener('click', () => this.stepCpu());
    document.getElementById('menu-exec-run')?.addEventListener('click', () => this.startRun());
    document.getElementById('menu-exec-pause')?.addEventListener('click', () => this.pauseRun());
    document.getElementById('menu-exec-reset')?.addEventListener('click', () => this.resetCpu());

    // Devices (Image 3)
    document.getElementById('menu-dev-editor')?.addEventListener('click', () => {
      this.winManager.bringToFront('editor');
    });

    document.getElementById('menu-dev-switches')?.addEventListener('click', () => {
      this.winManager.createWindow({
        id: 'dip-switches',
        title: 'Panel de Interruptores',
        icon: '🎚️',
        x: 40, y: 300,
        width: 320, height: 380,
        content: createDipSwitchesPanel(this.perifs)
      });
    });

    document.getElementById('menu-dev-leds')?.addEventListener('click', () => {
      this.winManager.createWindow({
        id: 'leds',
        title: 'Panel de LEDs',
        icon: '💡',
        x: 380, y: 300,
        width: 320, height: 380,
        content: createLedsPanel(this.perifs)
      });
    });

    document.getElementById('menu-dev-displays7')?.addEventListener('click', () => {
      this.winManager.createWindow({
        id: 'displays7',
        title: 'Display 7 segmentos',
        icon: '🔢',
        x: 100, y: 180,
        width: 440, height: 160,
        content: createDisplays7Panel(this.perifs)
      });
    });

    document.getElementById('menu-dev-displays15')?.addEventListener('click', () => {
      this.winManager.createWindow({
        id: 'displays15',
        title: 'Display 15 segmentos',
        icon: '🔤',
        x: 120, y: 220,
        width: 460, height: 160,
        content: createDisplays15Panel(this.perifs)
      });
    });

    document.getElementById('menu-dev-terminal')?.addEventListener('click', () => {
      this.openTerminalWindow();
    });

    document.getElementById('menu-dev-keypad')?.addEventListener('click', () => {
      this.openKeyboardWindow();
    });

    // Options - Auto Interrupts
    document.getElementById('menu-opt-interrupts')?.addEventListener('click', () => {
      openInterruptsDialog(this.perifs);
    });

    // Theme Toggle
    document.getElementById('menu-view-theme')?.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
    });

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
            this.editor.setValue(text);
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

  private openAsmFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.asm,.s,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        if (typeof re.target?.result === 'string') {
          this.editor.setValue(re.target.result);
          this.winManager.bringToFront('editor');
          this.assembleCode();
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  private saveAsmFile(): void {
    const content = this.editor.getValue();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'programa.asm';
    a.click();
    URL.revokeObjectURL(url);
  }

  private exportObjectFile(): void {
    const code = this.editor.getValue();
    const result = this.assembler.assemble(code);
    if (!result.success) {
      alert('Corrige los errores antes de exportar el archivo objeto .o');
      return;
    }
    const blob = new Blob([result.objectCodeText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'programa.o';
    a.click();
    URL.revokeObjectURL(url);
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

    this.editor.setStatus(`Tamaño de letra: ${Math.round(this.currentZoom * 100)}% (${editorFontSize}px)`);
  }

  private setupShortcuts(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Zoom shortcuts (Ctrl + / Ctrl - / Ctrl 0)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '+' || e.key === '=') {
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
      if (e.key === 'F9') {
        e.preventDefault();
        this.assembleCode();
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
  new SimulatorApp();
});
