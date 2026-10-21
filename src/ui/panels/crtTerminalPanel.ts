import { Intel8085 } from '../../core/cpu8085.js';
import { PeripheralsManager } from '../../core/peripherals.js';

export function createCrtTerminalPanel(cpu: Intel8085, perifs: PeripheralsManager): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'panel-crt-terminal';

  panel.innerHTML = `
    <div class="crt-wrapper">
      <div class="crt-toolbar">
        <span class="crt-badge">VRAM: 0E000H - 0E3E7H (40x25)</span>
        <div class="crt-theme-controls">
          <button class="small-btn crt-btn-green active" data-color="green">Fósforo Verde</button>
          <button class="small-btn crt-btn-amber" data-color="amber">Ámbar</button>
          <button class="small-btn crt-btn-white" data-color="white">Blanco B&N</button>
        </div>
      </div>
      <div class="crt-screen crt-phosphor-green" id="crt-screen">
        <div class="crt-scanlines"></div>
        <pre class="crt-text" id="crt-text"></pre>
      </div>
    </div>
  `;

  const screen = panel.querySelector('#crt-screen') as HTMLElement;
  const textElem = panel.querySelector('#crt-text') as HTMLElement;

  const render = () => {
    const start = perifs.state.terminalVramStart; // 0xE000
    const cols = perifs.state.terminalCols; // 40
    const rows = perifs.state.terminalRows; // 25

    let buffer = '';
    for (let r = 0; r < rows; r++) {
      let line = '';
      for (let c = 0; c < cols; c++) {
        const charCode = cpu.readByte(start + (r * cols) + c);
        // Printable ASCII
        if (charCode >= 32 && charCode <= 126) {
          line += String.fromCharCode(charCode);
        } else if (charCode === 0) {
          line += ' ';
        } else {
          line += ' ';
        }
      }
      buffer += line + '\n';
    }
    textElem.textContent = buffer;
  };

  // Color theme buttons
  panel.querySelectorAll('.crt-theme-controls button').forEach(btn => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('.crt-theme-controls button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const color = btn.getAttribute('data-color');
      screen.className = `crt-screen crt-phosphor-${color}`;
    });
  });

  perifs.onTerminalUpdate = () => render();
  render();

  return panel;
}
