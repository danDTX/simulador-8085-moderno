import { PeripheralsManager } from '../../core/peripherals.js';

export interface DipSwitchesInstance {
  element: HTMLElement;
  update: () => void;
  destroy: () => void;
}

export function createDipSwitchesPanel(perifs: PeripheralsManager): DipSwitchesInstance {
  const panel = document.createElement('div');
  panel.className = 'panel-switches-multi';

  let basePort = 0x00;
  let numPorts = 8;

  const render = () => {
    const endPort = (basePort + numPorts - 1) & 0xff;
    const baseHex = basePort.toString(16).padStart(2, '0').toUpperCase() + 'H';
    const endHex = endPort.toString(16).padStart(2, '0').toUpperCase() + 'H';

    let rowsHtml = '';
    for (let i = 0; i < numPorts; i++) {
      const port = (basePort + i) & 0xff;
      const portHex = port.toString(16).padStart(2, '0').toUpperCase() + 'H';
      const val = perifs.state.portsIn[port];

      let switchesRow = '';
      for (let b = 7; b >= 0; b--) {
        const isUp = ((val >> b) & 1) === 1;
        switchesRow += `
          <div class="msw-slot" data-port="${port}" data-bit="${b}" title="Puerto ${portHex}, Bit ${b}: ${isUp ? '1 (Alto)' : '0 (Bajo)'}">
            <div class="msw-lever ${isUp ? 'msw-on' : 'msw-off'}"></div>
          </div>
        `;
      }

      rowsHtml += `
        <div class="msw-row">
          <div class="msw-port-label">${portHex} (${val.toString(16).padStart(2, '0').toUpperCase()}H)</div>
          <div class="msw-rail">
            ${switchesRow}
          </div>
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="msw-container">
        <!-- Header (Image 5) -->
        <div class="msw-header-bar">
          <span class="msw-range-lbl">Puertos ${baseHex} - ${endHex}</span>
          <button class="msw-btn-cambiar" id="btn-msw-cambiar">cambiar</button>
          <input type="text" class="port-edit-inline" id="edit-msw-port" value="${basePort.toString(16).padStart(2, '0').toUpperCase()}" style="display: none; width: 45px;" maxlength="3" />
          <div class="msw-num-controls">
            <span>Nº</span>
            <input type="number" id="num-msw-count" value="${numPorts}" min="1" max="16" />
          </div>
        </div>

        <!-- 8 Rows of 8 Switches (Image 5) -->
        <div class="msw-matrix">
          ${rowsHtml}
        </div>
      </div>
    `;

    // Click handler for micro-switches
    panel.querySelectorAll('.msw-slot').forEach(elem => {
      elem.addEventListener('click', () => {
        const port = parseInt(elem.getAttribute('data-port') || '0', 10);
        const bit = parseInt(elem.getAttribute('data-bit') || '0', 10);
        perifs.toggleInputPortBit(port, bit);
        render();
      });
    });

    const btnCambiar = panel.querySelector('#btn-msw-cambiar') as HTMLButtonElement;
    const inputPort = panel.querySelector('#edit-msw-port') as HTMLInputElement;

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

    const numInput = panel.querySelector('#num-msw-count') as HTMLInputElement;
    numInput?.addEventListener('change', () => {
      const val = parseInt(numInput.value, 10);
      if (val >= 1 && val <= 16) {
        numPorts = val;
        render();
      }
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
