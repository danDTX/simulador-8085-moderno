import { PeripheralsManager } from '../../core/peripherals.js';

export interface Displays7Instance {
  element: HTMLElement;
  update: () => void;
  destroy: () => void;
}

export function createDisplays7Panel(perifs: PeripheralsManager): Displays7Instance {
  const panel = document.createElement('div');
  panel.className = 'panel-displays-7-classic';

  let basePort = 0x00;
  const numDigits = 8;

  const render = () => {
    const endPort = (basePort + numDigits - 1) & 0xff;
    const baseHex = basePort.toString(16).padStart(2, '0').toUpperCase() + 'H';
    const endHex = endPort.toString(16).padStart(2, '0').toUpperCase() + 'H';

    let digitsHtml = '';
    for (let i = 0; i < numDigits; i++) {
      const port = (basePort + i) & 0xff;
      const portHex = port.toString(16).padStart(2, '0').toUpperCase() + 'H';
      const byteVal = perifs.state.portsOut[port];

      // Segment mapping in 8085sim:
      // bit 1: A, bit 2: B, bit 6: C, bit 5: D, bit 4: E, bit 0: F, bit 3: G, bit 7: DP
      const segA = (byteVal & (1 << 1)) !== 0;
      const segB = (byteVal & (1 << 2)) !== 0;
      const segC = (byteVal & (1 << 6)) !== 0;
      const segD = (byteVal & (1 << 5)) !== 0;
      const segE = (byteVal & (1 << 4)) !== 0;
      const segF = (byteVal & (1 << 0)) !== 0;
      const segG = (byteVal & (1 << 3)) !== 0;
      const segDP = (byteVal & (1 << 7)) !== 0;

      digitsHtml += `
        <div class="disp7-digit-box" title="Puerto ${portHex} (Valor: ${byteVal.toString(16).padStart(2, '0').toUpperCase()}H)">
          <div class="disp7-port-label">${portHex}</div>
          <svg viewBox="0 0 50 80" class="disp7-svg">
            <!-- A -->
            <polygon points="12,8 38,8 34,14 16,14" class="d7-seg ${segA ? 'd7-on' : 'd7-off'}" />
            <!-- B -->
            <polygon points="38,9 43,14 40,38 35,35" class="d7-seg ${segB ? 'd7-on' : 'd7-off'}" />
            <!-- C -->
            <polygon points="40,42 43,66 38,71 35,45" class="d7-seg ${segC ? 'd7-on' : 'd7-off'}" />
            <!-- D -->
            <polygon points="16,66 34,66 38,72 12,72" class="d7-seg ${segD ? 'd7-on' : 'd7-off'}" />
            <!-- E -->
            <polygon points="12,42 15,45 15,66 10,71" class="d7-seg ${segE ? 'd7-on' : 'd7-off'}" />
            <!-- F -->
            <polygon points="10,9 15,14 15,35 12,38" class="d7-seg ${segF ? 'd7-on' : 'd7-off'}" />
            <!-- G -->
            <polygon points="15,38 35,38 33,42 17,42" class="d7-seg ${segG ? 'd7-on' : 'd7-off'}" />
            <!-- DP -->
            <circle cx="45" cy="72" r="3" class="d7-seg ${segDP ? 'd7-on' : 'd7-off'}" />
          </svg>
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="disp7-container">
        <!-- Unified Bezel housing 8 green digits (Image 3) -->
        <div class="disp7-bezel">
          <div class="disp7-digits-strip">
            ${digitsHtml}
          </div>
        </div>

        <!-- Bottom bar (Image 3) -->
        <div class="disp7-bottom-bar">
          <span class="disp7-associated-lbl">Asociado a puertos ${baseHex} - ${endHex}</span>
          <button class="disp7-btn-cambiar" id="btn-disp7-cambiar" title="Cambiar puerto inicial">cambiar</button>
          <input type="text" class="port-edit-inline" id="edit-disp7-port" value="${basePort.toString(16).padStart(2, '0').toUpperCase()}" style="display: none; width: 45px;" maxlength="3" />
          <div class="disp7-quick-presets">
            <button class="small-btn ${basePort === 0 ? 'active' : ''}" data-base="0">00H-07H</button>
            <button class="small-btn ${basePort === 2 ? 'active' : ''}" data-base="2">02H-09H</button>
            <button class="small-btn ${basePort === 8 ? 'active' : ''}" data-base="8">08H-0FH</button>
          </div>
        </div>
      </div>
    `;

    const btnCambiar = panel.querySelector('#btn-disp7-cambiar') as HTMLButtonElement;
    const inputPort = panel.querySelector('#edit-disp7-port') as HTMLInputElement;

    btnCambiar?.addEventListener('click', () => {
      btnCambiar.style.display = 'none';
      inputPort.style.display = 'inline-block';
      inputPort.value = basePort.toString(16).padStart(2, '0').toUpperCase();
      inputPort.focus();
      inputPort.select();
    });

    const applyChange = () => {
      const raw = inputPort.value.trim().replace(/h$/i, '');
      const parsed = parseInt(raw, 16);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 248) {
        basePort = parsed;
      }
      render();
    };

    inputPort?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        applyChange();
      } else if (e.key === 'Escape') {
        render();
      }
    });
    inputPort?.addEventListener('blur', applyChange);

    panel.querySelectorAll('.disp7-quick-presets button').forEach(btn => {
      btn.addEventListener('click', () => {
        const b = parseInt(btn.getAttribute('data-base') || '0', 10);
        basePort = b;
        render();
      });
    });
  };

  const unsub = perifs.subscribe(() => render());
  render();

  return {
    element: panel,
    update: render,
    destroy: () => unsub()
  };
}
