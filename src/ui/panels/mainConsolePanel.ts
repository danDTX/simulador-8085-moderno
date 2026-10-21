import { Intel8085 } from '../../core/cpu8085.js';
import { Disassembler8085 } from '../../core/disassembler.js';
import { PeripheralsManager } from '../../core/peripherals.js';
import { openInterruptsDialog } from './interruptsDialog.js';

export function createMainConsolePanel(
  cpu: Intel8085,
  perifs: PeripheralsManager,
  callbacks: {
    onStep: () => void;
    onRun: () => void;
    onStop: () => void;
    onReset: () => void;
  }
): { element: HTMLElement; update: () => void; setRunningState: (running: boolean) => void } {
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
          <button class="console-btn" id="cbtn-over" title="Paso sin entrar a subrutina">Over ⤴</button>
          <button class="console-btn" id="cbtn-step" title="Paso a Paso (F7)">Step ▷</button>
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
          <div class="box-title">Puertos E/S</div>
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
          <div class="box-title">Memoria (Datos)</div>
          <div class="mini-table-scroll">
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
          <div class="box-title">Memoria (Pila)</div>
          <div class="mini-table-scroll">
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
  panel.querySelector('#cbtn-run')?.addEventListener('click', callbacks.onRun);
  panel.querySelector('#cbtn-stop')?.addEventListener('click', callbacks.onStop);
  panel.querySelector('#cbtn-over')?.addEventListener('click', callbacks.onStep);
  panel.querySelector('#cbtn-reset')?.addEventListener('click', callbacks.onReset);

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

    // 3. Instructions Table (Window around PC)
    const tbodyInst = panel.querySelector('#console-inst-tbody');
    if (tbodyInst) {
      let instHtml = '';
      // Disassemble 16 instructions starting from current PC or a bit earlier
      const startAddr = Math.max(0, pc - 4);
      let curAddr = startAddr;
      for (let i = 0; i < 18; i++) {
        if (curAddr >= 0xffff) break;
        const d = Disassembler8085.disassemble(cpu.memory, curAddr);
        const isPc = (d.address === pc);
        const hexCodes = d.bytes.map(b => hex2(b)).join(' ');

        instHtml += `
          <tr class="${isPc ? 'row-pc-active' : ''}">
            <td class="inst-addr">${hex4(d.address)}</td>
            <td class="inst-mnem">${d.text}</td>
            <td class="inst-code">${hexCodes}</td>
          </tr>
        `;
        curAddr = (curAddr + d.size) & 0xffff;
      }
      tbodyInst.innerHTML = instHtml;
    }

    // 4. Ports Table (00H - 09H)
    const tbodyPorts = panel.querySelector('#console-ports-tbody');
    if (tbodyPorts) {
      let portsHtml = '';
      for (let p = 0; p <= 9; p++) {
        const inVal = hex2(perifs.state.portsIn[p] ?? 0);
        const outVal = hex2(perifs.state.portsOut[p] ?? 0);
        portsHtml += `
          <tr>
            <td>${hex2(p)}</td>
            <td>${inVal}</td>
            <td>${outVal}</td>
          </tr>
        `;
      }
      tbodyPorts.innerHTML = portsHtml;
    }

    // 5. Data Memory Table (0800H - 081FH or around 0050H)
    const tbodyData = panel.querySelector('#console-data-tbody');
    if (tbodyData) {
      let dataHtml = '';
      const dataBase = 0x0800; // Common variables area
      for (let d = 0; d < 10; d++) {
        const addr = dataBase + d;
        dataHtml += `
          <tr>
            <td>${hex4(addr)}</td>
            <td>${hex2(cpu.readByte(addr))}</td>
          </tr>
        `;
      }
      tbodyData.innerHTML = dataHtml;
    }

    // 6. Stack Memory Table (Around SP)
    const tbodyStack = panel.querySelector('#console-stack-tbody');
    if (tbodyStack) {
      let stackHtml = '';
      const stackBase = Math.min(0xfff0, sp);
      for (let s = 0; s < 10; s++) {
        const addr = stackBase + s;
        const isSp = (addr === sp);
        stackHtml += `
          <tr class="${isSp ? 'row-sp-active' : ''}">
            <td>${hex4(addr)}</td>
            <td>${hex2(cpu.readByte(addr))}</td>
          </tr>
        `;
      }
      tbodyStack.innerHTML = stackHtml;
    }

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
  update();
  return { element: panel, update, setRunningState };
}
