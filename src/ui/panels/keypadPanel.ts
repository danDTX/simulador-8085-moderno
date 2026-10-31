import { Intel8085 } from '../../core/cpu8085.js';
import { PeripheralsManager } from '../../core/peripherals.js';

export function createKeypadPanel(cpu: Intel8085, perifs: PeripheralsManager): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'panel-keypad';

  panel.innerHTML = `
    <div class="keypad-wrapper">
      <div class="keypad-section">
        <div class="section-title">Entrada de Teclado (ASCII)</div>
        <div class="keypad-input-row">
          <input type="text" id="keypad-quick-input" placeholder="Escribe aquí para enviar caracteres al CPU..." maxlength="1" />
          <button class="tb-btn" id="btn-send-enter">Enviar Enter (0DH)</button>
        </div>
        <div class="keypad-matrix">
          <button class="key-btn" data-key="1">1</button>
          <button class="key-btn" data-key="2">2</button>
          <button class="key-btn" data-key="3">3</button>
          <button class="key-btn key-action" data-key="A">A</button>

          <button class="key-btn" data-key="4">4</button>
          <button class="key-btn" data-key="5">5</button>
          <button class="key-btn" data-key="6">6</button>
          <button class="key-btn key-action" data-key="B">B</button>

          <button class="key-btn" data-key="7">7</button>
          <button class="key-btn" data-key="8">8</button>
          <button class="key-btn" data-key="9">9</button>
          <button class="key-btn key-action" data-key="C">C</button>

          <button class="key-btn key-clear" id="key-clear">C</button>
          <button class="key-btn" data-key="0">0</button>
          <button class="key-btn key-enter" data-key="\r">E</button>
          <button class="key-btn key-action" data-key="D">D</button>
        </div>
      </div>

      <div class="keypad-section">
        <div class="section-title">Disparo de Interrupciones Externas</div>
        <div class="interrupts-grid">
          <button class="intr-btn" id="btn-trap">TRAP (0024H)</button>
          <button class="intr-btn" id="btn-rst75">RST 7.5 (003CH)</button>
          <button class="intr-btn" id="btn-rst65">RST 6.5 (0034H)</button>
          <button class="intr-btn" id="btn-rst55">RST 5.5 (002CH)</button>
          <button class="intr-btn" id="btn-intr">INTR</button>
        </div>

        <div class="timer-config-box">
          <div class="config-row">
            <label>Interrupción de Teclado:</label>
            <select id="sel-keypad-intr">
              <option value="NONE" ${perifs.state.keyboardInterruptType === 'NONE' ? 'selected' : ''}>Ninguna</option>
              <option value="5.5" ${perifs.state.keyboardInterruptType === '5.5' ? 'selected' : ''}>RST 5.5</option>
              <option value="6.5" ${perifs.state.keyboardInterruptType === '6.5' ? 'selected' : ''}>RST 6.5</option>
              <option value="7.5" ${perifs.state.keyboardInterruptType === '7.5' ? 'selected' : ''}>RST 7.5</option>
              <option value="INTR" ${perifs.state.keyboardInterruptType === 'INTR' ? 'selected' : ''}>INTR</option>
            </select>
          </div>
          <div class="config-row">
            <label>Temporizador Periódico:</label>
            <input type="checkbox" id="chk-timer-enable" />
            <input type="number" id="num-timer-interval" value="500" min="50" max="5000" style="width: 70px;" /> ms
            <select id="sel-timer-intr">
              <option value="6.5" selected>RST 6.5</option>
              <option value="5.5">RST 5.5</option>
              <option value="7.5">RST 7.5</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  `;

  // Quick typing input
  const quickInput = panel.querySelector('#keypad-quick-input') as HTMLInputElement;
  quickInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      perifs.injectKeyPress('\r');
      quickInput.value = '';
    } else if (e.key.length === 1) {
      perifs.injectKeyPress(e.key);
      setTimeout(() => quickInput.value = '', 50);
    }
  });

  panel.querySelector('#btn-send-enter')?.addEventListener('click', () => {
    perifs.injectKeyPress('\r');
  });

  // Buttons in matrix
  panel.querySelectorAll('.key-btn[data-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key') || '';
      perifs.injectKeyPress(key);
    });
  });

  // Interrupt manual buttons
  panel.querySelector('#btn-trap')?.addEventListener('click', () => { cpu.interrupts.trap = true; });
  panel.querySelector('#btn-rst75')?.addEventListener('click', () => { cpu.interrupts.rst75 = true; });
  panel.querySelector('#btn-rst65')?.addEventListener('click', () => { cpu.interrupts.rst65 = true; });
  panel.querySelector('#btn-rst55')?.addEventListener('click', () => { cpu.interrupts.rst55 = true; });
  panel.querySelector('#btn-intr')?.addEventListener('click', () => { cpu.interrupts.intr = true; });

  // Settings
  const selKeyIntr = panel.querySelector('#sel-keypad-intr') as HTMLSelectElement;
  selKeyIntr.addEventListener('change', () => {
    const val = selKeyIntr.value;
    perifs.setKeyboardInterrupt(val as any);
  });

  perifs.subscribe((state) => {
    if (selKeyIntr && selKeyIntr.value !== state.keyboardInterruptType) {
      selKeyIntr.value = state.keyboardInterruptType;
    }
  });

  const chkTimer = panel.querySelector('#chk-timer-enable') as HTMLInputElement;
  const numTimer = panel.querySelector('#num-timer-interval') as HTMLInputElement;
  const selTimerIntr = panel.querySelector('#sel-timer-intr') as HTMLSelectElement;

  const updateTimer = () => {
    perifs.state.timerEnabled = chkTimer.checked;
    perifs.state.timerIntervalMs = parseInt(numTimer.value, 10) || 500;
    perifs.state.timerInterruptType = selTimerIntr.value as any;
    if (chkTimer.checked) {
      perifs.startTimer();
    } else {
      perifs.stopTimer();
    }
  };

  chkTimer.addEventListener('change', updateTimer);
  numTimer.addEventListener('change', updateTimer);
  selTimerIntr.addEventListener('change', updateTimer);

  return panel;
}
