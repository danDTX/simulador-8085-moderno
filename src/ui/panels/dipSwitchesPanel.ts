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
  const lastPortsState = new Uint8Array(256);

  // Sync initial state cache
  for (let p = 0; p < 256; p++) {
    lastPortsState[p] = perifs.state.portsIn[p];
  }

  const render = () => {
    const endPort = (basePort + numPorts - 1) & 0xff;
    const baseHex = basePort.toString(16).padStart(2, '0').toUpperCase() + 'H';
    const endHex = endPort.toString(16).padStart(2, '0').toUpperCase() + 'H';

    let rowsHtml = '';
    for (let i = 0; i < numPorts; i++) {
      const port = (basePort + i) & 0xff;
      const portHex = port.toString(16).padStart(2, '0').toUpperCase() + 'H';
      const val = perifs.state.portsIn[port];
      lastPortsState[port] = val;

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
          <div class="msw-port-label" data-port="${port}">${portHex} (${val.toString(16).padStart(2, '0').toUpperCase()}H)</div>
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

  // Instant in-place DOM updater (without destroying nodes)
  const updateSwitchesView = () => {
    for (let i = 0; i < numPorts; i++) {
      const port = (basePort + i) & 0xff;
      const val = perifs.state.portsIn[port];

      // Update port label
      const labelElem = panel.querySelector(`.msw-port-label[data-port="${port}"]`);
      if (labelElem) {
        const portHex = port.toString(16).padStart(2, '0').toUpperCase() + 'H';
        const valHex = val.toString(16).padStart(2, '0').toUpperCase() + 'H';
        labelElem.textContent = `${portHex} (${valHex})`;
      }

      // Update bits
      for (let b = 0; b < 8; b++) {
        const isUp = ((val >> b) & 1) === 1;
        const slot = panel.querySelector(`.msw-slot[data-port="${port}"][data-bit="${b}"]`);
        if (slot) {
          const lever = slot.querySelector('.msw-lever');
          if (lever) {
            lever.className = `msw-lever ${isUp ? 'msw-on' : 'msw-off'}`;
          }
          slot.setAttribute('title', `Puerto ${port.toString(16).padStart(2, '0').toUpperCase()}H, Bit ${b}: ${isUp ? '1 (Alto)' : '0 (Bajo)'}`);
        }
      }
    }
  };

  // Ultra-responsive click/pointerdown delegation:
  panel.addEventListener('pointerdown', (e) => {
    const slot = (e.target as HTMLElement).closest('.msw-slot') as HTMLElement;
    if (!slot) return;
    const port = parseInt(slot.getAttribute('data-port') || '0', 10);
    const bit = parseInt(slot.getAttribute('data-bit') || '0', 10);
    perifs.toggleInputPortBit(port, bit);
    lastPortsState[port] = perifs.state.portsIn[port];
    updateSwitchesView();
  });

  // Only update DOM if an input port actually changed value
  const onPerifsUpdate = () => {
    let changed = false;
    for (let i = 0; i < numPorts; i++) {
      const port = (basePort + i) & 0xff;
      if (perifs.state.portsIn[port] !== lastPortsState[port]) {
        lastPortsState[port] = perifs.state.portsIn[port];
        changed = true;
      }
    }
    if (changed) {
      updateSwitchesView();
    }
  };

  const unsub = perifs.subscribe(() => onPerifsUpdate());
  render();

  return {
    element: panel,
    update: onPerifsUpdate,
    destroy: () => unsub()
  };
}
