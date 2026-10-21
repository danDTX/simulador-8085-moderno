import { Intel8085 } from '../../core/cpu8085.js';
import { PeripheralsManager } from '../../core/peripherals.js';

export interface CrtTerminalInstance {
  element: HTMLElement;
  update: () => void;
  destroy: () => void;
}

const CP437_EXTENDED: string[] = [
  // 128 - 143
  'Ç', 'ü', 'é', 'â', 'ä', 'à', 'å', 'ç', 'ê', 'ë', 'è', 'ï', 'î', 'ì', 'Ä', 'Å',
  // 144 - 159
  'É', 'æ', 'Æ', 'ô', 'ö', 'ò', 'û', 'ù', 'ÿ', 'Ö', 'Ü', '¢', '£', '¥', '₧', 'ƒ',
  // 160 - 175
  'á', 'í', 'ó', 'ú', 'ñ', 'Ñ', 'ª', 'º', '¿', '⌐', '¬', '½', '¼', '¡', '«', '»',
  // 176 - 191
  '░', '▒', '▓', '│', '┤', '╡', '╢', '╖', '╕', '╣', '║', '╗', '╝', '╜', '╛', '┐',
  // 192 - 207
  '└', '┴', '┬', '├', '─', '┼', '╞', '╟', '╚', '╔', '╩', '╦', '╠', '═', '╬', '╧',
  // 208 - 223
  '╨', '╤', '╥', '╙', '╘', '╒', '╓', '╫', '╪', '┘', '┌', '█', '▄', '▌', '▐', '▀',
  // 224 - 239
  'α', 'ß', 'Γ', 'π', 'Σ', 'σ', 'µ', 'τ', 'Φ', 'Θ', 'Ω', 'δ', '∞', 'φ', 'ε', '∩',
  // 240 - 255
  '≡', '±', '≥', '≤', '⌠', '⌡', '÷', '≈', '°', '∙', '·', '√', 'ⁿ', '²', '■', ' '
];

function decodeByteToChar(charCode: number): string {
  if (charCode >= 32 && charCode <= 126) {
    return String.fromCharCode(charCode);
  }
  if (charCode >= 128 && charCode <= 255) {
    return CP437_EXTENDED[charCode - 128];
  }
  return ' ';
}

export function createCrtTerminalPanel(cpu: Intel8085, perifs: PeripheralsManager, isCpuRunning?: () => boolean): CrtTerminalInstance {
  const panel = document.createElement('div');
  panel.className = 'panel-crt-terminal';

  panel.innerHTML = `
    <div class="crt-wrapper">
      <div class="crt-toolbar">
        <div class="crt-addr-controls">
          <span class="crt-badge" id="crt-addr-lbl">VRAM: 0E000H - 0E3E7H (40x25)</span>
          <button class="small-btn" id="btn-crt-change-addr" title="Cambiar dirección base de VRAM">cambiar</button>
          <input type="text" class="port-edit-inline" id="edit-crt-addr" value="E000" style="display: none; width: 60px;" maxlength="5" />
          <button class="small-btn" id="btn-crt-clear" title="Borrar pantalla rellenando con espacios">🧹 Borrar</button>
          <button class="small-btn" id="btn-crt-copy" title="Copiar texto de la pantalla al portapapeles">📋 Copiar</button>
        </div>
        <div class="crt-theme-controls">
          <button class="small-btn crt-btn-green active" data-color="green" title="Fósforo Verde clásico">Verde</button>
          <button class="small-btn crt-btn-amber" data-color="amber" title="Fósforo Ámbar cálido">Ámbar</button>
          <button class="small-btn crt-btn-white" data-color="white" title="Blanco y Negro monocromático">B&N</button>
        </div>
      </div>
      <div class="crt-screen crt-phosphor-green" id="crt-screen" tabindex="0" title="Haz clic para escribir directamente con tu teclado">
        <div class="crt-scanlines"></div>
        <pre class="crt-text" id="crt-text"></pre>
      </div>
      <div class="crt-footer-hint" id="crt-footer-hint">⌨️ Haz clic en la pantalla negra para escribir con tu teclado físico (Puerto 00H)</div>
    </div>
  `;

  const screen = panel.querySelector('#crt-screen') as HTMLElement;
  const textElem = panel.querySelector('#crt-text') as HTMLElement;
  const footerHint = panel.querySelector('#crt-footer-hint') as HTMLElement;
  const addrLbl = panel.querySelector('#crt-addr-lbl') as HTMLElement;
  const btnChangeAddr = panel.querySelector('#btn-crt-change-addr') as HTMLButtonElement;
  const editAddr = panel.querySelector('#edit-crt-addr') as HTMLInputElement;
  const btnClear = panel.querySelector('#btn-crt-clear') as HTMLButtonElement;
  const btnCopy = panel.querySelector('#btn-crt-copy') as HTMLButtonElement;

  let lastBuffer = '';

  const render = () => {
    const start = perifs.state.terminalVramStart & 0xffff;
    const cols = perifs.state.terminalCols || 40;
    const rows = perifs.state.terminalRows || 25;
    const end = (start + (rows * cols) - 1) & 0xffff;

    const startHex = start.toString(16).padStart(4, '0').toUpperCase() + 'H';
    const endHex = end.toString(16).padStart(4, '0').toUpperCase() + 'H';
    if (addrLbl) {
      addrLbl.textContent = `VRAM: ${startHex} - ${endHex} (${cols}x${rows})`;
    }

    let buffer = '';
    for (let r = 0; r < rows; r++) {
      let line = '';
      const rowOffset = start + (r * cols);
      for (let c = 0; c < cols; c++) {
        const charCode = cpu.readByte((rowOffset + c) & 0xffff);
        line += decodeByteToChar(charCode);
      }
      buffer += line + '\n';
    }
    if (lastBuffer !== buffer) {
      lastBuffer = buffer;
      textElem.textContent = buffer;
    }
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

  // Change address handler
  btnChangeAddr?.addEventListener('click', () => {
    btnChangeAddr.style.display = 'none';
    editAddr.style.display = 'inline-block';
    editAddr.value = perifs.state.terminalVramStart.toString(16).toUpperCase();
    editAddr.focus();
    editAddr.select();
  });

  const applyAddrChange = () => {
    editAddr.style.display = 'none';
    btnChangeAddr.style.display = 'inline-block';
    const raw = editAddr.value.trim().replace(/h$/i, '');
    const parsed = parseInt(raw, 16);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 0xFFFF) {
      perifs.state.terminalVramStart = parsed;
    }
    render();
  };

  editAddr?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      applyAddrChange();
    } else if (e.key === 'Escape') {
      editAddr.style.display = 'none';
      btnChangeAddr.style.display = 'inline-block';
    }
  });
  editAddr?.addEventListener('blur', applyAddrChange);

  // Clear VRAM
  btnClear?.addEventListener('click', () => {
    const start = perifs.state.terminalVramStart & 0xffff;
    const total = (perifs.state.terminalCols || 40) * (perifs.state.terminalRows || 25);
    for (let i = 0; i < total; i++) {
      cpu.memory[(start + i) & 0xffff] = 0x20; // fill with spaces
    }
    render();
  });

  // Copy Screen Buffer
  btnCopy?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(textElem.textContent || '');
      const oldText = btnCopy.textContent;
      btnCopy.textContent = '✅ Copiado';
      setTimeout(() => { btnCopy.textContent = oldText; }, 1200);
    } catch {}
  });

  // Direct keyboard input inside CRT terminal
  screen.addEventListener('focus', () => {
    if (footerHint) {
      const running = isCpuRunning ? isCpuRunning() : true;
      if (running) {
        footerHint.textContent = '🟢 Teclado activo | Pulsa teclas y observa la pantalla';
      } else {
        footerHint.textContent = '🟢 Teclado activo | Pulsa ▶️ Ejecutar (F5) si el programa espera interrupciones';
      }
      footerHint.classList.add('crt-hint-focused');
    }
  });

  screen.addEventListener('blur', () => {
    if (footerHint) {
      footerHint.textContent = '⌨️ Haz clic en la pantalla negra para escribir con tu teclado físico (Puerto 00H)';
      footerHint.classList.remove('crt-hint-focused');
    }
  });

  screen.addEventListener('keydown', (e: KeyboardEvent) => {
    // Avoid interfering with browser shortcuts if Ctrl or Alt are pressed
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    let char = e.key;
    if (char === 'Enter') {
      char = '\r';
      e.preventDefault();
    } else if (char === 'Escape') {
      char = '\x1b';
      e.preventDefault();
    } else if (char === 'Backspace') {
      char = '\b';
      e.preventDefault();
    } else if (char === 'Tab') {
      char = '\t';
      e.preventDefault();
    }

    if (char.length === 1 || char === '\r' || char === '\x1b' || char === '\b' || char === '\t') {
      perifs.pressKey(char);
    }
  });

  screen.addEventListener('keyup', (e: KeyboardEvent) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    perifs.releaseKey();
  });

  const unsubTerminal = perifs.subscribeTerminal(() => render());
  const unsubPerifs = perifs.subscribe(() => render());

  render();

  return {
    element: panel,
    update: render,
    destroy: () => {
      unsubTerminal();
      unsubPerifs();
    }
  };
}
