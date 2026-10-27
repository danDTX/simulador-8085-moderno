export interface AsciiTableOptions {
  onInsertCode?: (code: string) => void;
}

export interface AsciiTableInstance {
  element: HTMLElement;
  destroy: () => void;
}

interface AsciiEntry {
  code: number;
  char: string;
  name: string;
  isControl: boolean;
}

const CONTROL_NAMES: Record<number, string> = {
  0: 'NUL (Null char / Terminador de cadena)',
  1: 'SOH (Start of Header)',
  2: 'STX (Start of Text)',
  3: 'ETX (End of Text)',
  4: 'EOT (End of Transmission)',
  5: 'ENQ (Enquiry)',
  6: 'ACK (Acknowledge)',
  7: 'BEL (Bell / Timbre)',
  8: 'BS (Backspace / Retroceso)',
  9: 'HT (Horizontal Tab / Tabulación)',
  10: 'LF (Line Feed / Salto de línea)',
  11: 'VT (Vertical Tab)',
  12: 'FF (Form Feed / Salto de página)',
  13: 'CR (Carriage Return / Retorno de carro)',
  14: 'SO (Shift Out)',
  15: 'SI (Shift In)',
  16: 'DLE (Data Link Escape)',
  17: 'DC1 (Device Control 1 / XON)',
  18: 'DC2 (Device Control 2)',
  19: 'DC3 (Device Control 3 / XOFF)',
  20: 'DC4 (Device Control 4)',
  21: 'NAK (Negative Acknowledge)',
  22: 'SYN (Synchronous Idle)',
  23: 'ETB (End of Transmission Block)',
  24: 'CAN (Cancel)',
  25: 'EM (End of Medium)',
  26: 'SUB (Substitute)',
  27: 'ESC (Escape)',
  28: 'FS (File Separator)',
  29: 'GS (Group Separator)',
  30: 'RS (Record Separator)',
  31: 'US (Unit Separator)',
  32: 'Space (Espacio en blanco)',
  127: 'DEL (Delete / Borrar)'
};

const ASCII_DATA: AsciiEntry[] = [];
for (let i = 0; i < 128; i++) {
  const isCtrl = i < 32 || i === 127;
  let charDisplay = isCtrl ? '•' : String.fromCharCode(i);
  if (i === 32) charDisplay = '␣';
  const name = CONTROL_NAMES[i] || `Carácter '${charDisplay}'`;
  ASCII_DATA.push({
    code: i,
    char: charDisplay,
    name,
    isControl: isCtrl
  });
}

export function createAsciiTablePanel(options: AsciiTableOptions = {}): AsciiTableInstance {
  const container = document.createElement('div');
  container.className = 'ascii-table-container';
  container.style.cssText = 'display: flex; flex-direction: column; height: 100%; padding: 12px; box-sizing: border-box; overflow-y: hidden; gap: 10px; font-family: var(--font-sans); color: var(--text-main); font-size: 13px;';

  let selectedCode: number = 65; // 'A' by default

  container.innerHTML = `
    <!-- Top Section: String to dB Generator -->
    <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 6px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 11px; font-weight: bold; color: var(--text-muted); text-transform: uppercase;">
          🔤 Generador de Cadenas de Texto a Ensamblador ('dB'):
        </span>
        <span style="font-size: 10px; color: #7ee787;">Regla de Cátedra: Lista en una sola línea</span>
      </div>

      <div style="display: flex; gap: 6px;">
        <input id="ascii-string-input" type="text" placeholder="Escribe un texto aquí... (ej. HOLA MUNDO)" value="HOLA MUNDO" style="flex: 1; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 4px; padding: 6px 10px; font-size: 13px;" />
      </div>

      <div style="display: flex; gap: 14px; align-items: center; flex-wrap: wrap; font-size: 11px;">
        <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
          <input type="checkbox" id="ascii-opt-null" checked />
          <span>Agregar terminador NUL (00H)</span>
        </label>
        <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
          <input type="checkbox" id="ascii-opt-crlf" />
          <span>Agregar salto de línea (0DH, 0AH)</span>
        </label>
        <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
          <input type="checkbox" id="ascii-opt-hexonly" checked />
          <span>Códigos Hexadecimales puros (XXH)</span>
        </label>
      </div>

      <!-- Realtime Output Snippet -->
      <div style="display: flex; gap: 6px; align-items: center; background: var(--bg-input); padding: 6px 10px; border-radius: 4px; border: 1px solid var(--border-color);">
        <code id="ascii-generated-db" style="flex: 1; font-family: var(--font-mono); font-size: 11px; color: #79c0ff; overflow-x: auto; white-space: nowrap;">dB ...</code>
        <button id="ascii-btn-copy-db" class="tb-btn" style="padding: 3px 8px; font-size: 11px; white-space: nowrap;">📋 Copiar</button>
        <button id="ascii-btn-insert-db" class="tb-btn" style="padding: 3px 8px; font-size: 11px; white-space: nowrap; background: var(--accent); color: #fff; border: none;">✍️ Insertar</button>
      </div>
    </div>

    <!-- Middle Section: Search & Quick Detail -->
    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
      <div style="display: flex; align-items: center; gap: 6px; flex: 1;">
        <span style="font-size: 11px; font-weight: bold; color: var(--text-muted); text-transform: uppercase;">Buscar:</span>
        <input id="ascii-search-input" type="text" placeholder="Filtrar por Hex, Dec, Carácter o Nombre (ej. 41, A, CR)..." style="flex: 1; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; font-size: 12px;" />
      </div>
      <div id="ascii-selection-banner" style="font-family: var(--font-mono); font-size: 12px; color: #e3b341; font-weight: bold; white-space: nowrap;"></div>
    </div>

    <!-- Table Section -->
    <div style="flex: 1; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; overflow: hidden; display: flex; flex-direction: column;">
      <div style="display: grid; grid-template-columns: 60px 50px 90px 60px 1fr 110px; background: var(--bg-input); padding: 6px 10px; border-bottom: 1px solid var(--border-color); font-size: 11px; font-weight: bold; color: var(--text-muted); text-transform: uppercase;">
        <span>HEX</span>
        <span>DEC</span>
        <span>BIN</span>
        <span>GLIFO</span>
        <span>DESCRIPCIÓN / CONTROL</span>
        <span style="text-align: right;">ACCIÓN</span>
      </div>
      <div id="ascii-table-body" style="flex: 1; overflow-y: auto;"></div>
    </div>
  `;

  // DOM Elements
  const stringInput = container.querySelector('#ascii-string-input') as HTMLInputElement;
  const optNull = container.querySelector('#ascii-opt-null') as HTMLInputElement;
  const optCrlf = container.querySelector('#ascii-opt-crlf') as HTMLInputElement;
  const optHexOnly = container.querySelector('#ascii-opt-hexonly') as HTMLInputElement;
  const generatedDb = container.querySelector('#ascii-generated-db') as HTMLElement;
  const copyDbBtn = container.querySelector('#ascii-btn-copy-db') as HTMLButtonElement;
  const insertDbBtn = container.querySelector('#ascii-btn-insert-db') as HTMLButtonElement;

  const searchInput = container.querySelector('#ascii-search-input') as HTMLInputElement;
  const selectionBanner = container.querySelector('#ascii-selection-banner') as HTMLElement;
  const tableBody = container.querySelector('#ascii-table-body') as HTMLElement;

  // Realtime string generator logic
  const updateGeneratedDb = () => {
    const rawText = stringInput.value;
    const parts: string[] = [];

    for (let i = 0; i < rawText.length; i++) {
      const code = rawText.charCodeAt(i);
      if (optHexOnly.checked) {
        parts.push(code.toString(16).padStart(2, '0').toUpperCase() + 'H');
      } else {
        if (code >= 32 && code <= 126 && rawText[i] !== "'") {
          parts.push(`'${rawText[i]}'`);
        } else {
          parts.push(code.toString(16).padStart(2, '0').toUpperCase() + 'H');
        }
      }
    }

    if (optCrlf.checked) {
      parts.push('0DH', '0AH');
    }

    if (optNull.checked) {
      parts.push('00H');
    }

    const snippet = parts.length > 0 ? `dB ${parts.join(', ')}` : 'dB 00H';
    generatedDb.textContent = snippet;
  };

  // Render Table rows
  const renderTable = (filter = '') => {
    const q = filter.trim().toLowerCase();
    const filtered = ASCII_DATA.filter(item => {
      if (!q) return true;
      const hexStr = item.code.toString(16).padStart(2, '0').toLowerCase();
      const decStr = item.code.toString(10);
      return (
        hexStr.includes(q) ||
        (hexStr + 'h').includes(q) ||
        decStr === q ||
        item.char.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q)
      );
    });

    tableBody.innerHTML = '';
    filtered.forEach(item => {
      const isSelected = item.code === selectedCode;
      const row = document.createElement('div');
      row.style.cssText = `
        display: grid;
        grid-template-columns: 60px 50px 90px 60px 1fr 110px;
        align-items: center;
        padding: 4px 10px;
        border-bottom: 1px solid var(--border-color);
        font-family: var(--font-mono);
        font-size: 11px;
        cursor: pointer;
        background: ${isSelected ? 'rgba(56, 139, 253, 0.15)' : 'transparent'};
      `;

      const hexStr = item.code.toString(16).padStart(2, '0').toUpperCase() + 'H';
      const decStr = item.code.toString(10);
      const binStr = item.code.toString(2).padStart(8, '0');
      const glyphColor = item.isControl ? '#8b949e' : '#7ee787';

      row.innerHTML = `
        <span style="color: #ff7b72; font-weight: bold;">${hexStr}</span>
        <span style="color: var(--text-main);">${decStr}</span>
        <span style="color: #e3b341;">${binStr}</span>
        <span style="font-weight: bold; font-size: 13px; color: ${glyphColor};">${item.char}</span>
        <span style="color: var(--text-muted); font-family: var(--font-sans); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</span>
        <div style="text-align: right; display: flex; gap: 4px; justify-content: flex-end;">
          <button class="ascii-row-btn tb-btn" data-action="mvi" data-code="${item.code}" style="padding: 2px 6px; font-size: 10px;" title="Insertar MVI A, ${hexStr}">MVI</button>
          <button class="ascii-row-btn tb-btn" data-action="copy" data-code="${item.code}" style="padding: 2px 6px; font-size: 10px;" title="Copiar ${hexStr}">📋</button>
        </div>
      `;

      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
        selectedCode = item.code;
        renderTable(searchInput.value);
        updateBanner();
      });

      row.querySelectorAll('.ascii-row-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = (btn as HTMLElement).getAttribute('data-action');
          if (action === 'mvi') {
            const codeSnippet = `MVI A, ${hexStr} ; '${item.char}' (${decStr})`;
            if (options.onInsertCode) options.onInsertCode(codeSnippet);
            else navigator.clipboard.writeText(codeSnippet);
          } else if (action === 'copy') {
            navigator.clipboard.writeText(hexStr);
          }
        });
      });

      tableBody.appendChild(row);
    });
  };

  const updateBanner = () => {
    const sel = ASCII_DATA[selectedCode];
    if (sel) {
      const hex = sel.code.toString(16).padStart(2, '0').toUpperCase() + 'H';
      selectionBanner.textContent = `Selección: ${hex} (${sel.code}d) = '${sel.char}'`;
    }
  };

  // Event Listeners
  stringInput.addEventListener('input', updateGeneratedDb);
  optNull.addEventListener('change', updateGeneratedDb);
  optCrlf.addEventListener('change', updateGeneratedDb);
  optHexOnly.addEventListener('change', updateGeneratedDb);

  copyDbBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(generatedDb.textContent || '');
  });

  insertDbBtn.addEventListener('click', () => {
    const snippet = generatedDb.textContent || '';
    if (options.onInsertCode) options.onInsertCode(snippet);
    else navigator.clipboard.writeText(snippet);
  });

  searchInput.addEventListener('input', () => {
    renderTable(searchInput.value);
  });

  // Initial runs
  updateGeneratedDb();
  renderTable();
  updateBanner();

  return {
    element: container,
    destroy: () => {}
  };
}
