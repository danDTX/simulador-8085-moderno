import { Intel8085 } from '../../core/cpu8085.js';

export function createRegistersPanel(cpu: Intel8085): { element: HTMLElement; update: () => void } {
  const panel = document.createElement('div');
  panel.className = 'panel-registers';

  const update = () => {
    const hex2 = (v: number) => v.toString(16).padStart(2, '0').toUpperCase();
    const hex4 = (v: number) => v.toString(16).padStart(4, '0').toUpperCase();

    const psw = cpu.getPSW();

    panel.innerHTML = `
      <div class="regs-container">
        <!-- 8-Bit Registers -->
        <div class="regs-section">
          <div class="section-title">Registros Principales (8-Bit)</div>
          <div class="regs-grid">
            <div class="reg-item" data-reg="a">
              <span class="reg-label">A (Acumulador)</span>
              <span class="reg-val">${hex2(cpu.regs.a)}H</span>
              <span class="reg-dec">${cpu.regs.a}</span>
            </div>
            <div class="reg-item" data-reg="b">
              <span class="reg-label">B</span>
              <span class="reg-val">${hex2(cpu.regs.b)}H</span>
              <span class="reg-dec">${cpu.regs.b}</span>
            </div>
            <div class="reg-item" data-reg="c">
              <span class="reg-label">C</span>
              <span class="reg-val">${hex2(cpu.regs.c)}H</span>
              <span class="reg-dec">${cpu.regs.c}</span>
            </div>
            <div class="reg-item" data-reg="d">
              <span class="reg-label">D</span>
              <span class="reg-val">${hex2(cpu.regs.d)}H</span>
              <span class="reg-dec">${cpu.regs.d}</span>
            </div>
            <div class="reg-item" data-reg="e">
              <span class="reg-label">E</span>
              <span class="reg-val">${hex2(cpu.regs.e)}H</span>
              <span class="reg-dec">${cpu.regs.e}</span>
            </div>
            <div class="reg-item" data-reg="h">
              <span class="reg-label">H</span>
              <span class="reg-val">${hex2(cpu.regs.h)}H</span>
              <span class="reg-dec">${cpu.regs.h}</span>
            </div>
            <div class="reg-item" data-reg="l">
              <span class="reg-label">L</span>
              <span class="reg-val">${hex2(cpu.regs.l)}H</span>
              <span class="reg-dec">${cpu.regs.l}</span>
            </div>
            <div class="reg-item reg-pair" title="Memoria apuntada por HL">
              <span class="reg-label">M (en [HL])</span>
              <span class="reg-val">${hex2(cpu.readByte((cpu.regs.h << 8) | cpu.regs.l))}H</span>
              <span class="reg-dec">HL=${hex4((cpu.regs.h << 8) | cpu.regs.l)}H</span>
            </div>
          </div>
        </div>

        <!-- 16-Bit Pointers -->
        <div class="regs-section">
          <div class="section-title">Punteros de 16-Bit y Control</div>
          <div class="regs-grid-16">
            <div class="reg-item" data-reg="pc">
              <span class="reg-label">PC (Program Counter)</span>
              <span class="reg-val">${hex4(cpu.regs.pc)}H</span>
            </div>
            <div class="reg-item" data-reg="sp">
              <span class="reg-label">SP (Stack Pointer)</span>
              <span class="reg-val">${hex4(cpu.regs.sp)}H</span>
            </div>
            <div class="reg-item">
              <span class="reg-label">Ciclos Reloj (T)</span>
              <span class="reg-val">${cpu.totalCycles}</span>
            </div>
            <div class="reg-item ${cpu.halted ? 'cpu-halted' : 'cpu-running'}">
              <span class="reg-label">Estado CPU</span>
              <span class="reg-val">${cpu.halted ? 'HALTED' : 'ACTIVO'}</span>
            </div>
          </div>
        </div>

        <!-- Flags PSW -->
        <div class="regs-section">
          <div class="section-title">Registro PSW y Banderas (${hex2(psw)}H)</div>
          <div class="flags-row">
            <div class="flag-pill ${cpu.flags.s ? 'flag-on' : 'flag-off'}" data-flag="s" title="Sign (Signo: Bit 7)">S: ${cpu.flags.s ? '1' : '0'}</div>
            <div class="flag-pill ${cpu.flags.z ? 'flag-on' : 'flag-off'}" data-flag="z" title="Zero (Cero: Bit 6)">Z: ${cpu.flags.z ? '1' : '0'}</div>
            <div class="flag-pill ${cpu.flags.ac ? 'flag-on' : 'flag-off'}" data-flag="ac" title="Auxiliary Carry (Acarreo Auxiliar BCD: Bit 4)">AC: ${cpu.flags.ac ? '1' : '0'}</div>
            <div class="flag-pill ${cpu.flags.p ? 'flag-on' : 'flag-off'}" data-flag="p" title="Parity (Paridad Par: Bit 2)">P: ${cpu.flags.p ? '1' : '0'}</div>
            <div class="flag-pill ${cpu.flags.cy ? 'flag-on' : 'flag-off'}" data-flag="cy" title="Carry (Acarreo / Préstamo: Bit 0)">CY: ${cpu.flags.cy ? '1' : '0'}</div>
            <div class="flag-pill ${cpu.interrupts.inte ? 'flag-on' : 'flag-off'}" title="Interrupt Enable Flip-Flop">IE: ${cpu.interrupts.inte ? '1' : '0'}</div>
          </div>
        </div>
      </div>
    `;

    // Flag toggle clicks
    panel.querySelectorAll('.flag-pill[data-flag]').forEach(elem => {
      elem.addEventListener('click', () => {
        const flagName = elem.getAttribute('data-flag') as keyof typeof cpu.flags;
        if (flagName && cpu.flags[flagName] !== undefined) {
          cpu.flags[flagName] = !cpu.flags[flagName];
          update();
        }
      });
    });
  };

  update();
  return { element: panel, update };
}
