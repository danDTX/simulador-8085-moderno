import { PeripheralsManager } from '../../core/peripherals.js';

export interface Displays15Instance {
  element: HTMLElement;
  update: () => void;
  destroy: () => void;
}

export function createDisplays15Panel(perifs: PeripheralsManager): Displays15Instance {
  const panel = document.createElement('div');
  panel.className = 'panel-displays-15-classic';

  let basePort = 0x00;
  const numDigits = 8;

  const render = () => {
    const endPort = (basePort + (numDigits * 2) - 1) & 0xff;
    const baseHex = basePort.toString(16).padStart(2, '0').toUpperCase() + 'H';
    const endHex = endPort.toString(16).padStart(2, '0').toUpperCase() + 'H';

    let digitsHtml = '';
    for (let i = 0; i < numDigits; i++) {
      const pLow = (basePort + (i * 2)) & 0xff;
      const pHigh = (basePort + (i * 2) + 1) & 0xff;
      const lowByte = perifs.state.portsOut[pLow];
      const highByte = perifs.state.portsOut[pHigh];

      const pLowHex = pLow.toString(16).padStart(2, '0').toUpperCase() + 'H';
      const pHighHex = pHigh.toString(16).padStart(2, '0').toUpperCase() + 'H';

      // Byte 1 (Puerto Par: pLow) -> Trazos internos y especiales de 8085sim:
      const segH = (lowByte & (1 << 0)) !== 0;     // Diagonal Top-Left
      const segJ = (lowByte & (1 << 1)) !== 0;     // Upper Vertical
      const segK = (lowByte & (1 << 2)) !== 0;     // Diagonal Top-Right
      const segG1_b1 = (lowByte & (1 << 3)) !== 0; // Middle-Left
      const segG2_b1 = (lowByte & (1 << 4)) !== 0; // Middle-Right
      const segN = (lowByte & (1 << 5)) !== 0;     // Diagonal Bottom-Left
      const segM = (lowByte & (1 << 6)) !== 0;     // Lower Vertical
      const segL = (lowByte & (1 << 7)) !== 0;     // Diagonal Bottom-Right

      // Byte 2 (Puerto Impar: pHigh) -> Perímetro exterior y punto decimal:
      const segF = (highByte & (1 << 0)) !== 0;    // Top-Left Vertical
      const segA = (highByte & (1 << 1)) !== 0;    // Top Horizontal
      const segB = (highByte & (1 << 2)) !== 0;    // Top-Right Vertical
      const segG_b2 = (highByte & (1 << 3)) !== 0; // Horizontal Central (activa G1 y G2)
      const segE = (highByte & (1 << 4)) !== 0;    // Bottom-Left Vertical
      const segD = (highByte & (1 << 5)) !== 0;    // Bottom Horizontal
      const segC = (highByte & (1 << 6)) !== 0;    // Bottom-Right Vertical
      const segDP = (highByte & (1 << 7)) !== 0;   // Decimal Point

      const segG1 = segG1_b1 || segG_b2;
      const segG2 = segG2_b1 || segG_b2;

      digitsHtml += `
        <div class="disp15-digit-box" title="Puertos ${pLowHex} / ${pHighHex}">
          <div class="disp7-port-label">${pLowHex}/${pHighHex}</div>
          <svg viewBox="0 0 50 80" class="disp15-svg">
            <!-- Top A -->
            <polygon points="13,8 37,8 33,13 17,13" class="d15-seg ${segA ? 'd15-on' : 'd15-off'}" />
            <!-- Top-Left F -->
            <polygon points="10,10 15,14 15,36 10,39" class="d15-seg ${segF ? 'd15-on' : 'd15-off'}" />
            <!-- Top-Right B -->
            <polygon points="35,14 40,10 40,39 35,36" class="d15-seg ${segB ? 'd15-on' : 'd15-off'}" />
            <!-- Middle-Left G1 -->
            <polygon points="14,38 23,38 22,42 15,42" class="d15-seg ${segG1 ? 'd15-on' : 'd15-off'}" />
            <!-- Middle-Right G2 -->
            <polygon points="27,38 36,38 35,42 28,42" class="d15-seg ${segG2 ? 'd15-on' : 'd15-off'}" />
            <!-- Upper Vertical J -->
            <polygon points="23.5,14 26.5,14 26.5,36 23.5,36" class="d15-seg ${segJ ? 'd15-on' : 'd15-off'}" />
            <!-- Diagonal Top-Left H -->
            <polygon points="16,15 19,14 24,35 22,37" class="d15-seg ${segH ? 'd15-on' : 'd15-off'}" />
            <!-- Diagonal Top-Right K -->
            <polygon points="31,14 34,15 28,37 26,35" class="d15-seg ${segK ? 'd15-on' : 'd15-off'}" />
            <!-- Lower Vertical M -->
            <polygon points="23.5,44 26.5,44 26.5,66 23.5,66" class="d15-seg ${segM ? 'd15-on' : 'd15-off'}" />
            <!-- Diagonal Bottom-Left N -->
            <polygon points="22,43 24,45 19,66 16,65" class="d15-seg ${segN ? 'd15-on' : 'd15-off'}" />
            <!-- Diagonal Bottom-Right L -->
            <polygon points="26,45 28,43 34,65 31,66" class="d15-seg ${segL ? 'd15-on' : 'd15-off'}" />
            <!-- Bottom-Left E -->
            <polygon points="10,41 15,44 15,66 10,70" class="d15-seg ${segE ? 'd15-on' : 'd15-off'}" />
            <!-- Bottom-Right C -->
            <polygon points="35,44 40,41 40,70 35,66" class="d15-seg ${segC ? 'd15-on' : 'd15-off'}" />
            <!-- Bottom D -->
            <polygon points="17,67 33,67 37,72 13,72" class="d15-seg ${segD ? 'd15-on' : 'd15-off'}" />
            <!-- Decimal Point DP -->
            <circle cx="45" cy="72" r="2.8" class="d15-seg ${segDP ? 'd15-on' : 'd15-off'}" />
          </svg>
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="disp15-container">
        <!-- Unified Bezel housing 8 green alphanumeric digits (Image 4) -->
        <div class="disp15-bezel">
          <div class="disp15-digits-strip">
            ${digitsHtml}
          </div>
        </div>

        <!-- Bottom bar (Image 4) -->
        <div class="disp15-bottom-bar">
          <span class="disp15-associated-lbl">Asociado a puertos ${baseHex} - ${endHex}</span>
          <button class="disp15-btn-cambiar" id="btn-disp15-cambiar">cambiar</button>
          <input type="text" class="port-edit-inline" id="edit-disp15-port" value="${basePort.toString(16).padStart(2, '0').toUpperCase()}" style="display: none; width: 45px;" maxlength="3" />
        </div>
      </div>
    `;

    const btnCambiar = panel.querySelector('#btn-disp15-cambiar') as HTMLButtonElement;
    const inputPort = panel.querySelector('#edit-disp15-port') as HTMLInputElement;

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
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 240) {
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
  };

  const unsub = perifs.subscribe(() => render());
  render();

  return {
    element: panel,
    update: render,
    destroy: () => unsub()
  };
}
