import { PeripheralsManager, AutoInterruptsSettings, AutoInterruptMode } from '../../core/peripherals.js';

export function openInterruptsDialog(perifs: PeripheralsManager): void {
  // Check if dialog is already open
  const existing = document.getElementById('dialog-auto-interrupts');
  if (existing) {
    existing.remove();
  }

  const currentConfig: AutoInterruptsSettings = JSON.parse(JSON.stringify(perifs.state.autoInterrupts));

  const overlay = document.createElement('div');
  overlay.id = 'dialog-auto-interrupts';
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-window">
      <div class="modal-header">
        <span class="modal-title">⚡ Interrupciones externas generadas automáticamente</span>
        <button class="modal-close-btn" id="btn-dialog-close">✕</button>
      </div>

      <div class="modal-body">
        <table class="intr-matrix-table">
          <thead>
            <tr>
              <th class="col-question">¿Generar?</th>
              <th class="col-vector">TRAP</th>
              <th class="col-vector">RST 7.5</th>
              <th class="col-vector">RST 6.5</th>
              <th class="col-vector">RST 5.5</th>
            </tr>
          </thead>
          <tbody>
            <!-- Fila 1: No -->
            <tr>
              <td class="row-label">No</td>
              <td class="col-cell"><input type="radio" name="rad-trap" value="no" ${currentConfig.trap.mode === 'no' ? 'checked' : ''} /></td>
              <td class="col-cell"><input type="radio" name="rad-rst75" value="no" ${currentConfig.rst75.mode === 'no' ? 'checked' : ''} /></td>
              <td class="col-cell"><input type="radio" name="rad-rst65" value="no" ${currentConfig.rst65.mode === 'no' ? 'checked' : ''} /></td>
              <td class="col-cell"><input type="radio" name="rad-rst55" value="no" ${currentConfig.rst55.mode === 'no' ? 'checked' : ''} /></td>
            </tr>

            <!-- Fila 2: Sí, al ejecutar Instr. no Válida -->
            <tr>
              <td class="row-label">Sí, al ejecutar Instr. no Válida</td>
              <td class="col-cell"><input type="radio" name="rad-trap" value="invalid_inst" ${currentConfig.trap.mode === 'invalid_inst' ? 'checked' : ''} /></td>
              <td class="col-cell text-muted">-</td>
              <td class="col-cell text-muted">-</td>
              <td class="col-cell text-muted">-</td>
            </tr>

            <!-- Fila 3: Sí, al pulsar Teclado -->
            <tr>
              <td class="row-label">Sí, al pulsar Teclado</td>
              <td class="col-cell"><input type="radio" name="rad-trap" value="keyboard" ${currentConfig.trap.mode === 'keyboard' ? 'checked' : ''} /></td>
              <td class="col-cell"><input type="radio" name="rad-rst75" value="keyboard" ${currentConfig.rst75.mode === 'keyboard' ? 'checked' : ''} /></td>
              <td class="col-cell"><input type="radio" name="rad-rst65" value="keyboard" ${currentConfig.rst65.mode === 'keyboard' ? 'checked' : ''} /></td>
              <td class="col-cell"><input type="radio" name="rad-rst55" value="keyboard" ${currentConfig.rst55.mode === 'keyboard' ? 'checked' : ''} /></td>
            </tr>

            <!-- Fila 4: Sí, cada x milisegundos -->
            <tr>
              <td class="row-label">Sí, cada x milisegundos</td>
              <td class="col-cell">
                <div class="timer-cell-group">
                  <input type="radio" name="rad-trap" value="timer" ${currentConfig.trap.mode === 'timer' ? 'checked' : ''} />
                  <input type="number" id="inp-trap-ms" class="matrix-num-input" value="${currentConfig.trap.timerMs || 0}" min="0" max="60000" step="50" ${currentConfig.trap.mode !== 'timer' ? 'disabled' : ''} />
                </div>
              </td>
              <td class="col-cell">
                <div class="timer-cell-group">
                  <input type="radio" name="rad-rst75" value="timer" ${currentConfig.rst75.mode === 'timer' ? 'checked' : ''} />
                  <input type="number" id="inp-rst75-ms" class="matrix-num-input" value="${currentConfig.rst75.timerMs || 0}" min="0" max="60000" step="50" ${currentConfig.rst75.mode !== 'timer' ? 'disabled' : ''} />
                </div>
              </td>
              <td class="col-cell">
                <div class="timer-cell-group">
                  <input type="radio" name="rad-rst65" value="timer" ${currentConfig.rst65.mode === 'timer' ? 'checked' : ''} />
                  <input type="number" id="inp-rst65-ms" class="matrix-num-input" value="${currentConfig.rst65.timerMs || 0}" min="0" max="60000" step="50" ${currentConfig.rst65.mode !== 'timer' ? 'disabled' : ''} />
                </div>
              </td>
              <td class="col-cell">
                <div class="timer-cell-group">
                  <input type="radio" name="rad-rst55" value="timer" ${currentConfig.rst55.mode === 'timer' ? 'checked' : ''} />
                  <input type="number" id="inp-rst55-ms" class="matrix-num-input" value="${currentConfig.rst55.timerMs || 0}" min="0" max="60000" step="50" ${currentConfig.rst55.mode !== 'timer' ? 'disabled' : ''} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="btn-dialog-cancel">Cancelar</button>
        <button class="modal-btn modal-btn-ok" id="btn-dialog-ok">Aceptar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Hook input enabling/disabling on radio click
  const bindRadioEnable = (radName: string, inpId: string) => {
    const radios = overlay.querySelectorAll<HTMLInputElement>(`input[name="${radName}"]`);
    const input = overlay.querySelector<HTMLInputElement>(`#${inpId}`);
    radios.forEach(r => {
      r.addEventListener('change', () => {
        if (input) {
          input.disabled = (r.value !== 'timer');
          if (r.value === 'timer') {
            if (parseInt(input.value, 10) <= 0) input.value = '500';
            input.focus();
          }
        }
      });
    });
  };

  bindRadioEnable('rad-trap', 'inp-trap-ms');
  bindRadioEnable('rad-rst75', 'inp-rst75-ms');
  bindRadioEnable('rad-rst65', 'inp-rst65-ms');
  bindRadioEnable('rad-rst55', 'inp-rst55-ms');

  const closeDialog = () => {
    overlay.remove();
  };

  overlay.querySelector('#btn-dialog-close')?.addEventListener('click', closeDialog);
  overlay.querySelector('#btn-dialog-cancel')?.addEventListener('click', closeDialog);

  // Save changes
  overlay.querySelector('#btn-dialog-ok')?.addEventListener('click', () => {
    const getVal = (name: string): AutoInterruptMode => {
      const checked = overlay.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`);
      return (checked?.value as AutoInterruptMode) || 'no';
    };

    const getMs = (id: string): number => {
      const inp = overlay.querySelector<HTMLInputElement>(`#${id}`);
      return Math.max(0, parseInt(inp?.value || '0', 10));
    };

    const newConfig: AutoInterruptsSettings = {
      trap: {
        mode: getVal('rad-trap'),
        timerMs: getVal('rad-trap') === 'timer' ? getMs('inp-trap-ms') : 0
      },
      rst75: {
        mode: getVal('rad-rst75'),
        timerMs: getVal('rad-rst75') === 'timer' ? getMs('inp-rst75-ms') : 0
      },
      rst65: {
        mode: getVal('rad-rst65'),
        timerMs: getVal('rad-rst65') === 'timer' ? getMs('inp-rst65-ms') : 0
      },
      rst55: {
        mode: getVal('rad-rst55'),
        timerMs: getVal('rad-rst55') === 'timer' ? getMs('inp-rst55-ms') : 0
      }
    };

    if (newConfig.rst75.mode === 'keyboard') {
      perifs.state.keyboardInterruptType = '7.5';
    } else if (newConfig.rst65.mode === 'keyboard') {
      perifs.state.keyboardInterruptType = '6.5';
    } else if (newConfig.rst55.mode === 'keyboard') {
      perifs.state.keyboardInterruptType = '5.5';
    } else {
      perifs.state.keyboardInterruptType = 'NONE';
    }

    perifs.setAutoInterrupts(newConfig);
    closeDialog();
  });
}
