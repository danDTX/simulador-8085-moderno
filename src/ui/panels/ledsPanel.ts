import { PeripheralsManager } from '../../core/peripherals.js';

export interface LedsInstance {
  element: HTMLElement;
  update: () => void;
  destroy: () => void;
}

export function createLedsPanel(perifs: PeripheralsManager): LedsInstance {
  const panel = document.createElement('div');
  panel.className = 'panel-leds-multi';

  let basePort = 0x00;
  let numPorts = 8;
  const lastPortsState = new Uint8Array(256);
  let lastBasePort = -1;
  let lastNumPorts = -1;

  const render = (force: boolean = false) => {
    let changed = force || (basePort !== lastBasePort) || (numPorts !== lastNumPorts);
    if (!changed) {
      for (let i = 0; i < numPorts; i++) {
        const p = (basePort + i) & 0xff;
        if (perifs.state.portsOut[p] !== lastPortsState[p]) {
          changed = true;
          break;
        }
      }
    }
    if (!changed) return;

    lastBasePort = basePort;
    lastNumPorts = numPorts;
    for (let i = 0; i < numPorts; i++) {
      const p = (basePort + i) & 0xff;
      lastPortsState[p] = perifs.state.portsOut[p];
    }

    const endPort = (basePort + numPorts - 1) & 0xff;
    const baseHex = basePort.toString(16).padStart(2, '0').toUpperCase() + 'H';
    const endHex = endPort.toString(16).padStart(2, '0').toUpperCase() + 'H';

    let rowsHtml = '';
    for (let i = 0; i < numPorts; i++) {
      const port = (basePort + i) & 0xff;
      const portHex = port.toString(16).padStart(2, '0').toUpperCase() + 'H';
      const val = perifs.state.portsOut[port];

      let ledsRow = '';
      for (let b = 7; b >= 0; b--) {
        const isOn = ((val >> b) & 1) === 1;
        ledsRow += `
          <div class="mled-cell" title="Puerto ${portHex}, Bit ${b}: ${isOn ? '1 (ON)' : '0 (OFF)'}">
            <div class="mled-bulb ${isOn ? 'mled-on' : 'mled-off'}"></div>
          </div>
        `;
      }

      rowsHtml += `
        <div class="mled-row">
          <div class="mled-port-label">${portHex} (${val.toString(16).padStart(2, '0').toUpperCase()}H)</div>
          <div class="mled-bits-rack">${ledsRow}</div>
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="mled-container">
        <!-- Header (Image 2) -->
        <div class="mled-header-bar">
          <span class="mled-range-lbl">Puertos ${baseHex} - ${endHex}</span>
          <button class="mled-btn-cambiar" id="btn-mled-cambiar">cambiar</button>
          <input type="text" class="port-edit-inline" id="edit-mled-port" value="${basePort.toString(16).padStart(2, '0').toUpperCase()}" style="display: none; width: 45px;" maxlength="3" />
          <div class="mled-num-controls">
            <span>Nº</span>
            <input type="number" id="num-mled-count" value="${numPorts}" min="1" max="16" />
          </div>
        </div>

        <!-- 8 Rows of 8 LEDs -->
        <div class="mled-matrix">
          ${rowsHtml}
        </div>
      </div>
    `;

    const btnCambiar = panel.querySelector('#btn-mled-cambiar') as HTMLButtonElement;
    const inputPort = panel.querySelector('#edit-mled-port') as HTMLInputElement;

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
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 255) {
        basePort = parsed;
      }
      render(true);
    };

    inputPort?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        applyChange();
      } else if (e.key === 'Escape') {
        render(true);
      }
    });
    inputPort?.addEventListener('blur', applyChange);

    const numInput = panel.querySelector('#num-mled-count') as HTMLInputElement;
    numInput?.addEventListener('change', () => {
      const val = parseInt(numInput.value, 10);
      if (val >= 1 && val <= 16) {
        numPorts = val;
        render(true);
      }
    });
  };

  const unsub = perifs.subscribe(() => render());
  render(true);

  return {
    element: panel,
    update: () => render(true),
    destroy: () => unsub()
  };
}
