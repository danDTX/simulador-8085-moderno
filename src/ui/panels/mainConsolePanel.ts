import { Intel8085 } from '../../core/cpu8085.js';
import { Disassembler8085 } from '../../core/disassembler.js';
import { PeripheralsManager } from '../../core/peripherals.js';
import { openInterruptsDialog } from './interruptsDialog.js';

const hex2 = (v: number) => (v & 0xff).toString(16).padStart(2, '0').toUpperCase();
const hex4 = (v: number) => (v & 0xffff).toString(16).padStart(4, '0').toUpperCase();

export function createMainConsolePanel(
  cpu: Intel8085,
  perifs: PeripheralsManager,
  callbacks: {
    onStep: () => void;
    onStepOver?: () => void;
    onStepBack?: () => void;
    onRun: () => void;
    onStop: () => void;
    onReset: () => void;
    onToggleBreakpoint?: (addr: number) => void;
  }
): {
  element: HTMLElement;
  update: () => void;
  setRunningState: (running: boolean) => void;
  refreshInstructions: (codeAddresses?: Set<number>, entryPoint?: number) => void;
} {
  const panel = document.createElement('div');
  panel.className = 'panel-main-console';

  panel.innerHTML = `
    <div class="console-main-layout">
      <!-- TOP AREA: Instructions, Controls, Registers & Flags -->
      <div class="console-top-area">
        <!-- LEFT: Memoria (Instrucciones) -->
        <div class="console-box console-instructions-box">
          <div class="box-title">Memoria (Instrucciones)</div>
          <div class="instructions-table-container">
            <table class="inst-table">
              <thead>
                <tr>
                  <th style="width: 25%;">Dirección</th>
                  <th style="width: 45%;">Nemotécnico</th>
                  <th style="width: 30%;">Código</th>
                </tr>
              </thead>
              <tbody id="console-inst-tbody"></tbody>
            </table>
          </div>
        </div>

        <!-- CENTER: Execution Buttons & Gears -->
        <div class="console-center-controls">
          <button class="console-btn" id="cbtn-over" title="Paso sin entrar a subrutina / Step Over (F8)">Over ⤴</button>
          <button class="console-btn" id="cbtn-step" title="Paso a Paso / Step Into (F7)">Step ▷</button>
          <button class="console-btn" id="cbtn-back" title="Paso Atrás / Step Back (Shift+F7)">Back ◁</button>
          <button class="console-btn" id="cbtn-run" title="Ejecutar Continuo (F5)">Run ▷▷</button>
          <button class="console-btn" id="cbtn-stop" title="Detener Ejecución">Stop ⏹️</button>
          <div class="gears-container" id="gears-anim">
            <span class="gear-icon">⚙️</span>
          </div>
        </div>

        <!-- RIGHT: Registros + Flags -->
        <div class="console-right-rack">
          <!-- Registros de la CPU (Red LED Digital Displays) -->
          <div class="console-box console-registers-box">
            <div class="box-title">Registros de la CPU</div>
            <div class="digital-regs-rack">
              <!-- AF -->
              <div class="dreg-row">
                <span class="dreg-label">AF</span>
                <div class="dreg-bin" id="dreg-bin-af">00000000 00000000</div>
                <div class="dreg-hex" id="dreg-hex-af">0000</div>
              </div>
              <!-- BC -->
              <div class="dreg-row">
                <span class="dreg-label">BC</span>
                <div class="dreg-bin" id="dreg-bin-bc">00000000 00000000</div>
                <div class="dreg-hex" id="dreg-hex-bc">0000</div>
              </div>
              <!-- DE -->
              <div class="dreg-row">
                <span class="dreg-label">DE</span>
                <div class="dreg-bin" id="dreg-bin-de">00000000 00000000</div>
                <div class="dreg-hex" id="dreg-hex-de">0000</div>
              </div>
              <!-- HL -->
              <div class="dreg-row">
                <span class="dreg-label">HL</span>
                <div class="dreg-bin" id="dreg-bin-hl">00000000 00000000</div>
                <div class="dreg-hex" id="dreg-hex-hl">0000</div>
              </div>
              <!-- SP -->
              <div class="dreg-row">
                <span class="dreg-label dreg-sp-lbl">SP</span>
                <div class="dreg-bin" id="dreg-bin-sp">11111111 11111111</div>
                <div class="dreg-hex" id="dreg-hex-sp">FFFF</div>
              </div>
              <!-- PC -->
              <div class="dreg-row">
                <span class="dreg-label dreg-pc-lbl">PC</span>
                <div class="dreg-bin" id="dreg-bin-pc">0 0 0 0 0 0 0 0   0 0 0 0 0 0 0 0</div>
                <div class="dreg-hex" id="dreg-hex-pc">0000</div>
              </div>
              <!-- Bit Scale 7 6 5 4 3 2 1 0   7 6 5 4 3 2 1 0 exactly aligned -->
              <div class="dreg-row dreg-scale-row">
                <span class="dreg-label"></span>
                <div class="dreg-bin dreg-scale-text">7 6 5 4 3 2 1 0   7 6 5 4 3 2 1 0</div>
                <div class="dreg-hex"></div>
              </div>
            </div>
            <div style="text-align: right; margin-top: 6px;">
              <button class="console-reset-btn" id="cbtn-reset">RESET IN</button>
            </div>
          </div>

          <!-- Bits de Estado (Flags LEDs) -->
          <div class="console-box console-flags-box">
            <div class="box-title">Bits de Estado</div>
            <div class="classic-flags-row">
              <div class="cflag-col"><span>S</span><div class="cflag-led" id="cled-s"></div></div>
              <div class="cflag-col"><span>Z</span><div class="cflag-led" id="cled-z"></div></div>
              <div class="cflag-col"><span>-</span><div class="cflag-led" id="cled-b5"></div></div>
              <div class="cflag-col"><span>A</span><div class="cflag-led" id="cled-ac"></div></div>
              <div class="cflag-col"><span>-</span><div class="cflag-led" id="cled-b3"></div></div>
              <div class="cflag-col"><span>P</span><div class="cflag-led" id="cled-p"></div></div>
              <div class="cflag-col"><span>-</span><div class="cflag-led" id="cled-b1"></div></div>
              <div class="cflag-col"><span>C</span><div class="cflag-led" id="cled-cy"></div></div>
            </div>
          </div>
        </div>
      </div>

      <!-- BOTTOM AREA: 4 Responsive Tables Side by Side -->
      <div class="console-bottom-area">
        <!-- 1: E/S Serie & Interrupciones -->
        <div class="console-box console-bottom-box console-intr-box">
          <div class="intr-box-header">
            <div class="intr-serial-compact">
              <span class="box-title" style="margin-bottom: 0;">E/S Serie:</span>
              <label><input type="checkbox" id="chk-sid" /> SID</label>
              <label><input type="checkbox" id="chk-sod" disabled /> SOD</label>
            </div>
            <button class="console-conf-btn" id="cbtn-config-intr" title="Configurar interrupciones automáticas">⚙️ Configurar</button>
          </div>
          <div style="display: flex; flex-direction: column; flex: 1; min-height: 0; margin-top: 4px;">
            <div class="box-title" style="margin-bottom: 2px;">Interrupciones</div>
            <div class="mini-table-scroll" style="flex: 1;">
              <table class="mini-table">
                <thead>
                  <tr><th style="width: 44%;">Tipo</th><th style="width: 28%;">Hab.</th><th style="width: 28%;">Petic.</th></tr>
                </thead>
                <tbody>
                  <tr><td>TRAP <span id="badge-trap" class="intr-badge" style="display:none;"></span></td><td><input type="checkbox" checked disabled /></td><td><input type="checkbox" id="chk-req-trap" /></td></tr>
                  <tr><td>RST 7.5 <span id="badge-rst75" class="intr-badge" style="display:none;"></span></td><td><input type="checkbox" id="chk-hab-75" disabled /></td><td><input type="checkbox" id="chk-req-75" /></td></tr>
                  <tr><td>RST 6.5 <span id="badge-rst65" class="intr-badge" style="display:none;"></span></td><td><input type="checkbox" id="chk-hab-65" disabled /></td><td><input type="checkbox" id="chk-req-65" /></td></tr>
                  <tr><td>RST 5.5 <span id="badge-rst55" class="intr-badge" style="display:none;"></span></td><td><input type="checkbox" id="chk-hab-55" disabled /></td><td><input type="checkbox" id="chk-req-55" /></td></tr>
                  <tr><td>Interrup.</td><td><input type="checkbox" id="chk-hab-inte" disabled /></td><td><input type="checkbox" id="chk-req-intr" /></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 2: Puertos E/S -->
        <div class="console-box console-bottom-box">
          <div class="box-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Puertos E/S</span>
            <span style="font-size: 10px; color: var(--text-muted); font-weight: normal;">256 puertos (00-FF)</span>
          </div>
          <div class="mini-table-scroll">
            <table class="mini-table">
              <thead>
                <tr><th style="width: 38%;">Puerto</th><th style="width: 31%;">E</th><th style="width: 31%;">S</th></tr>
              </thead>
              <tbody id="console-ports-tbody"></tbody>
            </table>
          </div>
        </div>

        <!-- 3: Memoria (Datos) -->
        <div class="console-box console-bottom-box">
          <div class="box-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span title="Memoria completa de 64 KB (0000H - FFFFH)">Memoria (Datos)</span>
            <div style="display: flex; align-items: center; gap: 3px;">
              <span style="font-size: 10px; color: var(--text-muted);">Dir:</span>
              <input id="cdata-addr-input" type="text" value="0800" maxlength="4" style="width: 44px; font-family: var(--font-mono); font-size: 10px; padding: 1px 3px; background: #0d1117; color: #58a6ff; border: 1px solid #30363d; border-radius: 3px; text-align: center;" title="Ir a dirección hex (0000-FFFF) - Presione Enter" />
              <button id="cbtn-data-prev" class="btn-tool" style="padding: 1px 4px; font-size: 9px;" title="Subir (-16 direcciones)">▲</button>
              <button id="cbtn-data-next" class="btn-tool" style="padding: 1px 4px; font-size: 9px;" title="Bajar (+16 direcciones)">▼</button>
            </div>
          </div>
          <div class="mini-table-scroll" id="console-data-scroll">
            <table class="mini-table">
              <thead>
                <tr><th style="width: 55%;">Dirección</th><th style="width: 45%;">Dato</th></tr>
              </thead>
              <tbody id="console-data-tbody"></tbody>
            </table>
          </div>
        </div>

        <!-- 4: Memoria (Pila) -->
        <div class="console-box console-bottom-box">
          <div class="box-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span title="Pila en memoria RAM de 64 KB (0000H - FFFFH)">Memoria (Pila)</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span id="cstack-sp-badge" style="font-family: var(--font-mono); font-size: 10px; color: #3fb950; font-weight: bold;">SP: FFFF</span>
              <button id="cbtn-stack-sp" class="btn-tool" style="padding: 1px 4px; font-size: 9px;" title="Ir a dirección apuntada por SP">SP</button>
              <button id="cbtn-stack-top" class="btn-tool" style="padding: 1px 4px; font-size: 9px;" title="Ir al tope superior (FFFFH)">Tope</button>
              <button id="cbtn-stack-bot" class="btn-tool" style="padding: 1px 4px; font-size: 9px;" title="Ir al inicio (0000H)">0000</button>
            </div>
          </div>
          <div class="mini-table-scroll" id="console-stack-scroll">
            <table class="mini-table">
              <thead>
                <tr><th style="width: 55%;">Direcc.</th><th style="width: 45%;">Dato</th></tr>
              </thead>
              <tbody id="console-stack-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach button events
  panel.querySelector('#cbtn-step')?.addEventListener('click', callbacks.onStep);
  panel.querySelector('#cbtn-over')?.addEventListener('click', () => {
    if (callbacks.onStepOver) callbacks.onStepOver();
    else callbacks.onStep();
  });
  panel.querySelector('#cbtn-back')?.addEventListener('click', () => {
    if (callbacks.onStepBack) callbacks.onStepBack();
  });
  panel.querySelector('#cbtn-run')?.addEventListener('click', callbacks.onRun);
  panel.querySelector('#cbtn-stop')?.addEventListener('click', callbacks.onStop);
  panel.querySelector('#cbtn-reset')?.addEventListener('click', callbacks.onReset);

  // Click on instruction address to toggle breakpoint
  panel.querySelector('#console-inst-tbody')?.addEventListener('click', (e: Event) => {
    const target = (e.target as HTMLElement).closest('.inst-addr') as HTMLElement;
    if (!target) return;
    const addr = parseInt(target.getAttribute('data-addr') || '', 10);
    if (!isNaN(addr)) {
      cpu.toggleBreakpoint(addr);
      update();
      if (callbacks.onToggleBreakpoint) {
        callbacks.onToggleBreakpoint(addr);
      }
    }
  });

  // Configure automatic interrupts button
  panel.querySelector('#cbtn-config-intr')?.addEventListener('click', () => {
    openInterruptsDialog(perifs);
  });

  // Interrupt manual trigger checkboxes
  panel.querySelector('#chk-req-trap')?.addEventListener('change', (e) => {
    cpu.interrupts.trap = (e.target as HTMLInputElement).checked;
  });
  panel.querySelector('#chk-req-75')?.addEventListener('change', (e) => {
    cpu.interrupts.rst75 = (e.target as HTMLInputElement).checked;
  });
  panel.querySelector('#chk-req-65')?.addEventListener('change', (e) => {
    cpu.interrupts.rst65 = (e.target as HTMLInputElement).checked;
  });
  panel.querySelector('#chk-req-55')?.addEventListener('change', (e) => {
    cpu.interrupts.rst55 = (e.target as HTMLInputElement).checked;
  });
  panel.querySelector('#chk-req-intr')?.addEventListener('change', (e) => {
    cpu.interrupts.intr = (e.target as HTMLInputElement).checked;
  });

  // Pre-render Ports Table once to eliminate DOM destruction/reconstruction on each tick
  const tbodyPorts = panel.querySelector('#console-ports-tbody') as HTMLElement;
  const portInCells: HTMLElement[] = [];
  const portOutCells: HTMLElement[] = [];
  const lastPortsIn: string[] = new Array(256).fill('');
  const lastPortsOut: string[] = new Array(256).fill('');
  let lastRenderedPc: number = -1;

  if (tbodyPorts) {
    let portsInitialHtml = '';
    for (let p = 0; p < 256; p++) {
      const hexP = (p & 0xff).toString(16).padStart(2, '0').toUpperCase();
      portsInitialHtml += `
        <tr>
          <td>${hexP}</td>
          <td class="port-in-val" id="cport-in-${p}" data-port="${p}" style="cursor: pointer;" title="Doble clic para simular entrada">00</td>
          <td class="port-out-val" id="cport-out-${p}">00</td>
        </tr>
      `;
    }
    tbodyPorts.innerHTML = portsInitialHtml;
    for (let p = 0; p < 256; p++) {
      portInCells[p] = panel.querySelector(`#cport-in-${p}`) as HTMLElement;
      portOutCells[p] = panel.querySelector(`#cport-out-${p}`) as HTMLElement;
    }
  }

  // 64 KB Memory Virtual Scroller Constants & Setup (0000H - FFFFH)
  const ROW_HEIGHT = 20;
  const TOTAL_MEMORY = 65536;

  const dataScroll = panel.querySelector('#console-data-scroll') as HTMLElement;
  const stackScroll = panel.querySelector('#console-stack-scroll') as HTMLElement;
  const tbodyData = panel.querySelector('#console-data-tbody') as HTMLElement;
  const tbodyStack = panel.querySelector('#console-stack-tbody') as HTMLElement;
  const dataInput = panel.querySelector('#cdata-addr-input') as HTMLInputElement;

  let lastSp = cpu.regs.sp;

  const renderDataVirtual = () => {
    if (!dataScroll || !tbodyData) return;
    const scrollTop = dataScroll.scrollTop;
    const clientH = dataScroll.clientHeight || 180;
    const visibleCount = Math.ceil(clientH / ROW_HEIGHT) + 4;
    const startIdx = Math.max(0, Math.min(TOTAL_MEMORY - visibleCount, Math.floor(scrollTop / ROW_HEIGHT)));
    const endIdx = Math.min(TOTAL_MEMORY, startIdx + visibleCount);

    const topHeight = startIdx * ROW_HEIGHT;
    const bottomHeight = (TOTAL_MEMORY - endIdx) * ROW_HEIGHT;

    const hex2 = (v: number) => (v & 0xff).toString(16).padStart(2, '0').toUpperCase();
    const hex4 = (v: number) => (v & 0xffff).toString(16).padStart(4, '0').toUpperCase();

    let html = '';
    if (topHeight > 0) {
      html += `<tr style="height: ${topHeight}px;"><td colspan="2" style="padding:0; border:none;"></td></tr>`;
    }
    for (let addr = startIdx; addr < endIdx; addr++) {
      html += `
        <tr class="vrow">
          <td>${hex4(addr)}</td>
          <td class="mem-data-val" data-addr="${addr}" style="cursor: pointer;" title="Doble clic para modificar dato">${hex2(cpu.readByte(addr))}</td>
        </tr>
      `;
    }
    if (bottomHeight > 0) {
      html += `<tr style="height: ${bottomHeight}px;"><td colspan="2" style="padding:0; border:none;"></td></tr>`;
    }
    tbodyData.innerHTML = html;

    if (dataInput && document.activeElement !== dataInput) {
      dataInput.value = hex4(startIdx);
    }
  };

  const renderStackVirtual = () => {
    if (!stackScroll || !tbodyStack) return;
    const sp = cpu.regs.sp;
    if (lastSp !== sp) {
      lastSp = sp;
      stackScroll.scrollTop = Math.max(0, (sp - 3)) * ROW_HEIGHT;
    }

    const scrollTop = stackScroll.scrollTop;
    const clientH = stackScroll.clientHeight || 180;
    const visibleCount = Math.ceil(clientH / ROW_HEIGHT) + 4;
    const startIdx = Math.max(0, Math.min(TOTAL_MEMORY - visibleCount, Math.floor(scrollTop / ROW_HEIGHT)));
    const endIdx = Math.min(TOTAL_MEMORY, startIdx + visibleCount);

    const topHeight = startIdx * ROW_HEIGHT;
    const bottomHeight = (TOTAL_MEMORY - endIdx) * ROW_HEIGHT;

    const hex2 = (v: number) => (v & 0xff).toString(16).padStart(2, '0').toUpperCase();
    const hex4 = (v: number) => (v & 0xffff).toString(16).padStart(4, '0').toUpperCase();

    let html = '';
    if (topHeight > 0) {
      html += `<tr style="height: ${topHeight}px;"><td colspan="2" style="padding:0; border:none;"></td></tr>`;
    }
    for (let addr = startIdx; addr < endIdx; addr++) {
      const isSp = (addr === sp);
      const spStyle = isSp ? 'font-weight: bold; color: #3fb950;' : '';
      html += `
        <tr class="vrow ${isSp ? 'row-sp-active' : ''}">
          <td style="${spStyle}">${isSp ? '👉 ' : ''}${hex4(addr)}</td>
          <td class="mem-stack-val" data-addr="${addr}" style="${spStyle} cursor: pointer;" title="Doble clic para modificar dato">${hex2(cpu.readByte(addr))}</td>
        </tr>
      `;
    }
    if (bottomHeight > 0) {
      html += `<tr style="height: ${bottomHeight}px;"><td colspan="2" style="padding:0; border:none;"></td></tr>`;
    }
    tbodyStack.innerHTML = html;

    const badgeSp = panel.querySelector('#cstack-sp-badge');
    if (badgeSp) badgeSp.textContent = `SP: ${hex4(sp)}`;
  };

  dataScroll?.addEventListener('scroll', renderDataVirtual);
  stackScroll?.addEventListener('scroll', renderStackVirtual);

  const applyDataAddr = () => {
    if (!dataInput || !dataScroll) return;
    const parsed = parseInt(dataInput.value.replace(/[^0-9a-fA-F]/g, ''), 16);
    if (!isNaN(parsed)) {
      const addr = Math.max(0, Math.min(TOTAL_MEMORY - 1, parsed));
      dataScroll.scrollTop = addr * ROW_HEIGHT;
      renderDataVirtual();
    }
  };
  dataInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyDataAddr();
  });
  dataInput?.addEventListener('blur', applyDataAddr);

  panel.querySelector('#cbtn-data-prev')?.addEventListener('click', () => {
    if (dataScroll) {
      dataScroll.scrollTop = Math.max(0, dataScroll.scrollTop - 16 * ROW_HEIGHT);
      renderDataVirtual();
    }
  });

  panel.querySelector('#cbtn-data-next')?.addEventListener('click', () => {
    if (dataScroll) {
      dataScroll.scrollTop = Math.min(TOTAL_MEMORY * ROW_HEIGHT, dataScroll.scrollTop + 16 * ROW_HEIGHT);
      renderDataVirtual();
    }
  });

  panel.querySelector('#cbtn-stack-sp')?.addEventListener('click', () => {
    if (stackScroll) {
      stackScroll.scrollTop = Math.max(0, cpu.regs.sp - 3) * ROW_HEIGHT;
      renderStackVirtual();
    }
  });

  panel.querySelector('#cbtn-stack-top')?.addEventListener('click', () => {
    if (stackScroll) {
      stackScroll.scrollTop = (0xffff - 5) * ROW_HEIGHT;
      renderStackVirtual();
    }
  });

  panel.querySelector('#cbtn-stack-bot')?.addEventListener('click', () => {
    if (stackScroll) {
      stackScroll.scrollTop = 0;
      renderStackVirtual();
    }
  });

  // Double-click to edit data memory cell
  panel.querySelector('#console-data-tbody')?.addEventListener('dblclick', (e) => {
    const td = (e.target as HTMLElement).closest('.mem-data-val') as HTMLElement;
    if (!td) return;
    const addr = parseInt(td.getAttribute('data-addr') || '', 10);
    if (!isNaN(addr)) {
      const currentVal = cpu.readByte(addr);
      const valStr = prompt(`Modificar byte en ${addr.toString(16).padStart(4, '0').toUpperCase()}H (Hex):`, (currentVal & 0xff).toString(16).padStart(2, '0').toUpperCase());
      if (valStr !== null) {
        const parsed = parseInt(valStr.trim(), 16);
        if (!isNaN(parsed)) {
          cpu.writeByte(addr, parsed & 0xff);
          update();
        }
      }
    }
  });

  // Double-click to edit stack memory cell
  panel.querySelector('#console-stack-tbody')?.addEventListener('dblclick', (e) => {
    const td = (e.target as HTMLElement).closest('.mem-stack-val') as HTMLElement;
    if (!td) return;
    const addr = parseInt(td.getAttribute('data-addr') || '', 10);
    if (!isNaN(addr)) {
      const currentVal = cpu.readByte(addr);
      const valStr = prompt(`Modificar pila en ${addr.toString(16).padStart(4, '0').toUpperCase()}H (Hex):`, (currentVal & 0xff).toString(16).padStart(2, '0').toUpperCase());
      if (valStr !== null) {
        const parsed = parseInt(valStr.trim(), 16);
        if (!isNaN(parsed)) {
          cpu.writeByte(addr, parsed & 0xff);
          update();
        }
      }
    }
  });

  // Double-click to edit port input value
  panel.querySelector('#console-ports-tbody')?.addEventListener('dblclick', (e) => {
    const td = (e.target as HTMLElement).closest('.port-in-val') as HTMLElement;
    if (!td) return;
    const port = parseInt(td.getAttribute('data-port') || '', 10);
    if (!isNaN(port)) {
      const currentVal = perifs.state.portsIn[port] ?? 0;
      const valStr = prompt(`Simular valor de entrada en Puerto ${port.toString(16).padStart(2, '0').toUpperCase()}H (Hex):`, (currentVal & 0xff).toString(16).padStart(2, '0').toUpperCase());
      if (valStr !== null) {
        const parsed = parseInt(valStr.trim(), 16);
        if (!isNaN(parsed)) {
          perifs.setInputPortByte(port, parsed & 0xff);
          update();
        }
      }
    }
  });

  // Instructions Table State: Holds full disassembled program
  let activeCodeAddresses: Set<number> | null = null;
  let activeEntryPoint: number = 0x0000;

  const refreshInstructions = (codeAddresses?: Set<number>, entryPoint?: number) => {
    if (codeAddresses !== undefined) activeCodeAddresses = codeAddresses;
    if (entryPoint !== undefined) activeEntryPoint = entryPoint;

    const tbodyInst = panel.querySelector('#console-inst-tbody');
    if (!tbodyInst) return;

    let startAddr = activeEntryPoint;
    let endAddr = activeEntryPoint + 64;

    if (activeCodeAddresses && activeCodeAddresses.size > 0) {
      let minA = 0xffff;
      let maxA = 0x0000;
      for (const a of activeCodeAddresses) {
        if (a < minA) minA = a;
        if (a > maxA) maxA = a;
      }
      startAddr = Math.min(minA, activeEntryPoint);
      endAddr = maxA;
    } else {
      startAddr = cpu.regs.pc;
      endAddr = Math.min(0xffff, startAddr + 64);
    }

    let instHtml = '';
    let curAddr = startAddr;
    let count = 0;
    const maxInstructions = 2500;

    while (count < maxInstructions && curAddr <= 0xffff) {
      const d = Disassembler8085.disassemble(cpu.memory, curAddr);
      const isPc = (d.address === cpu.regs.pc);
      const hasBp = cpu.hasBreakpoint(d.address);
      const hexCodes = d.bytes.map(b => hex2(b)).join(' ');

      instHtml += `
        <tr class="${isPc ? 'row-pc-active' : ''} ${hasBp ? 'row-bp-active' : ''}" data-rowaddr="${d.address}">
          <td class="inst-addr" data-addr="${d.address}" style="cursor: pointer;" title="${hasBp ? 'Punto de interrupción activo (clic para quitar)' : 'Clic para alternar breakpoint'}">${hasBp ? '🔴 ' : ''}${hex4(d.address)}</td>
          <td class="inst-mnem">${d.text}</td>
          <td class="inst-code">${hexCodes}</td>
        </tr>
      `;

      curAddr = (curAddr + d.size) & 0xffff;
      count++;
      if (curAddr > endAddr) {
        if (d.text.toUpperCase() === 'HLT' || curAddr >= endAddr + 4) {
          break;
        }
      }
    }

    tbodyInst.innerHTML = instHtml;
    lastRenderedPc = cpu.regs.pc;

    const activeRow = tbodyInst.querySelector('.row-pc-active');
    activeRow?.scrollIntoView({ block: 'nearest' });
  };

  const update = () => {
    const hex2 = (v: number) => (v & 0xff).toString(16).padStart(2, '0').toUpperCase();
    const hex4 = (v: number) => (v & 0xffff).toString(16).padStart(4, '0').toUpperCase();
    const bin8Spaced = (v: number) => {
      const b = (v & 0xff).toString(2).padStart(8, '0');
      return b.split('').join(' ');
    };

    const af = (cpu.regs.a << 8) | cpu.getPSW();
    const bc = (cpu.regs.b << 8) | cpu.regs.c;
    const de = (cpu.regs.d << 8) | cpu.regs.e;
    const hl = (cpu.regs.h << 8) | cpu.regs.l;
    const sp = cpu.regs.sp;
    const pc = cpu.regs.pc;

    // 1. Digital LED Registers
    const setReg = (id: string, val16: number) => {
      const high = (val16 >> 8) & 0xff;
      const low = val16 & 0xff;
      const binElem = panel.querySelector(`#dreg-bin-${id}`);
      const hexElem = panel.querySelector(`#dreg-hex-${id}`);
      if (binElem) binElem.textContent = `${bin8Spaced(high)}   ${bin8Spaced(low)}`;
      if (hexElem) hexElem.textContent = hex4(val16);
    };

    setReg('af', af);
    setReg('bc', bc);
    setReg('de', de);
    setReg('hl', hl);
    setReg('sp', sp);
    setReg('pc', pc);

    // 2. Flags LEDs
    const psw = cpu.getPSW();
    const setLed = (id: string, on: boolean) => {
      const elem = panel.querySelector(`#cled-${id}`);
      elem?.classList.toggle('led-on', on);
    };
    setLed('s', cpu.flags.s);
    setLed('z', cpu.flags.z);
    setLed('b5', (psw & 0x20) !== 0);
    setLed('ac', cpu.flags.ac);
    setLed('b3', (psw & 0x08) !== 0);
    setLed('p', cpu.flags.p);
    setLed('b1', (psw & 0x02) !== 0);
    setLed('cy', cpu.flags.cy);

    // 3. Instructions Table (Track active PC row smoothly without destroying full table)
    const tbodyInst = panel.querySelector('#console-inst-tbody');
    if (tbodyInst && lastRenderedPc !== pc) {
      const prevRow = tbodyInst.querySelector('.row-pc-active');
      if (prevRow) prevRow.classList.remove('row-pc-active');

      const curRow = tbodyInst.querySelector(`tr[data-rowaddr="${pc}"]`);
      if (curRow) {
        curRow.classList.add('row-pc-active');
        curRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        lastRenderedPc = pc;
      } else {
        // PC jumped outside the currently loaded table range, refresh around new PC
        refreshInstructions();
      }
    }

    // 4. Ports Table (Optimized: Direct cell updates without rebuilding 256 DOM elements)
    for (let p = 0; p < 256; p++) {
      const inVal = hex2(perifs.state.portsIn[p] ?? 0);
      const outVal = hex2(perifs.state.portsOut[p] ?? 0);
      if (lastPortsIn[p] !== inVal) {
        lastPortsIn[p] = inVal;
        if (portInCells[p]) portInCells[p].textContent = inVal;
      }
      if (lastPortsOut[p] !== outVal) {
        lastPortsOut[p] = outVal;
        if (portOutCells[p]) portOutCells[p].textContent = outVal;
      }
    }

    // 5. Data & Stack Virtual Memory Tables (Full 64 KB Space: 0000H - FFFFH)
    renderDataVirtual();
    renderStackVirtual();

    // 7. Interrupt Masks & State Checkboxes
    const chkHab75 = panel.querySelector('#chk-hab-75') as HTMLInputElement;
    const chkHab65 = panel.querySelector('#chk-hab-65') as HTMLInputElement;
    const chkHab55 = panel.querySelector('#chk-hab-55') as HTMLInputElement;
    const chkHabInte = panel.querySelector('#chk-hab-inte') as HTMLInputElement;

    if (chkHab75) chkHab75.checked = !cpu.interrupts.mask75;
    if (chkHab65) chkHab65.checked = !cpu.interrupts.mask65;
    if (chkHab55) chkHab55.checked = !cpu.interrupts.mask55;
    if (chkHabInte) chkHabInte.checked = cpu.interrupts.inte;

    const chkReqTrap = panel.querySelector('#chk-req-trap') as HTMLInputElement;
    const chkReq75 = panel.querySelector('#chk-req-75') as HTMLInputElement;
    const chkReq65 = panel.querySelector('#chk-req-65') as HTMLInputElement;
    const chkReq55 = panel.querySelector('#chk-req-55') as HTMLInputElement;
    const chkReqIntr = panel.querySelector('#chk-req-intr') as HTMLInputElement;

    if (chkReqTrap) chkReqTrap.checked = cpu.interrupts.trap;
    if (chkReq75) chkReq75.checked = cpu.interrupts.rst75;
    if (chkReq65) chkReq65.checked = cpu.interrupts.rst65;
    if (chkReq55) chkReq55.checked = cpu.interrupts.rst55;
    if (chkReqIntr) chkReqIntr.checked = cpu.interrupts.intr;

    // 8. Interrupt Configuration Badges
    const updateBadge = (id: string, mode: string, timerMs: number) => {
      const badge = panel.querySelector(`#badge-${id}`) as HTMLElement;
      if (!badge) return;
      if (mode === 'no') {
        badge.style.display = 'none';
      } else if (mode === 'keyboard') {
        badge.style.display = 'inline-block';
        badge.textContent = '⌨';
        badge.title = 'Disparo automático al pulsar Teclado';
      } else if (mode === 'invalid_inst') {
        badge.style.display = 'inline-block';
        badge.textContent = '⚠ Opcode';
        badge.title = 'Disparo automático al ejecutar instrucción no válida';
      } else if (mode === 'timer') {
        badge.style.display = 'inline-block';
        badge.textContent = `⏱ ${timerMs}ms`;
        badge.title = `Disparo automático cada ${timerMs} ms`;
      }
    };

    const auto = perifs.state.autoInterrupts;
    if (auto) {
      updateBadge('trap', auto.trap.mode, auto.trap.timerMs);
      updateBadge('rst75', auto.rst75.mode, auto.rst75.timerMs);
      updateBadge('rst65', auto.rst65.mode, auto.rst65.timerMs);
      updateBadge('rst55', auto.rst55.mode, auto.rst55.timerMs);
    }

    // Serial
    const chkSod = panel.querySelector('#chk-sod') as HTMLInputElement;
    if (chkSod) chkSod.checked = cpu.sodBit;
  };

  const setRunningState = (running: boolean) => {
    const btnOver = panel.querySelector('#cbtn-over') as HTMLButtonElement;
    const btnStep = panel.querySelector('#cbtn-step') as HTMLButtonElement;
    const btnRun = panel.querySelector('#cbtn-run') as HTMLButtonElement;
    const btnStop = panel.querySelector('#cbtn-stop') as HTMLButtonElement;
    const gears = panel.querySelector('#gears-anim');

    if (running) {
      if (btnOver) btnOver.disabled = true;
      if (btnStep) btnStep.disabled = true;
      if (btnRun) btnRun.disabled = true;
      if (btnStop) btnStop.disabled = false;
      gears?.classList.add('spinning');
    } else {
      if (btnOver) btnOver.disabled = false;
      if (btnStep) btnStep.disabled = false;
      if (btnRun) btnRun.disabled = false;
      if (btnStop) btnStop.disabled = true;
      gears?.classList.remove('spinning');
    }
  };

  setRunningState(false);
  setTimeout(() => {
    if (dataScroll) dataScroll.scrollTop = 0x0800 * ROW_HEIGHT;
    if (stackScroll) stackScroll.scrollTop = Math.max(0, (cpu.regs.sp - 3)) * ROW_HEIGHT;
  }, 0);
  update();
  refreshInstructions();
  return { element: panel, update, setRunningState, refreshInstructions };
}
