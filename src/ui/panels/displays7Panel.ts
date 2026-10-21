import { PeripheralsManager } from '../../core/peripherals.js';

export function createDisplays7Panel(perifs: PeripheralsManager): HTMLElement {
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
        <div class="disp7-digit-box">
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
          <button class="disp7-btn-cambiar" id="btn-disp7-cambiar">cambiar</button>
          <input type="text" class="port-edit-inline" id="edit-disp7-port" value="${basePort.toString(16).padStart(2, '0').toUpperCase()}" style="display: none;" maxlength="3" />
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

    let applied = false;
    const applyChange = () => {
      if (applied) return;
      applied = true;
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
        applied = true;
        render();
      }
    });
    inputPort?.addEventListener('blur', applyChange);
  };

  const oldOnState = perifs.onStateChange;
  perifs.onStateChange = (st) => {
    if (oldOnState) oldOnState(st);
    render();
  };
  render();

  return panel;
}
