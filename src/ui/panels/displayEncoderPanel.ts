export interface DisplayEncoderOptions {
  onInsertCode?: (code: string) => void;
}

export interface DisplayEncoderInstance {
  element: HTMLElement;
  destroy: () => void;
}

// 7-segment bit positions in 8085sim:
// bit 0: F, bit 1: A, bit 2: B, bit 3: G, bit 4: E, bit 5: D, bit 6: C, bit 7: DP
const D7_MASKS: Record<string, number> = {
  F: 1 << 0,
  A: 1 << 1,
  B: 1 << 2,
  G: 1 << 3,
  E: 1 << 4,
  D: 1 << 5,
  C: 1 << 6,
  DP: 1 << 7
};

// 15-segment bit positions (8085sim Cátedra Oficial):
// Byte 1 (Puerto Par N): Trazos internos y especiales
// bit 0: H (Diag Sup-Izq), bit 1: J (Vert Central Sup), bit 2: K (Diag Sup-Der),
// bit 3: G1 (Media Izq),   bit 4: G2 (Media Der),        bit 5: N (Diag Inf-Izq),
// bit 6: M (Vert Central Inf), bit 7: L (Diag Inf-Der)
//
// Byte 2 (Puerto Impar N+1): Perímetro exterior (7 segmentos) y punto decimal
// bit 0: F (Sup-Izq), bit 1: A (Sup),     bit 2: B (Sup-Der),   bit 3: G (Media completa),
// bit 4: E (Inf-Izq), bit 5: D (Inf),     bit 6: C (Inf-Der),   bit 7: DP (Punto Decimal)
const D15_MASKS: Record<string, { byte: 'b1' | 'b2'; bit: number }> = {
  H:  { byte: 'b1', bit: 0 },
  J:  { byte: 'b1', bit: 1 },
  K:  { byte: 'b1', bit: 2 },
  G1: { byte: 'b1', bit: 3 },
  G2: { byte: 'b1', bit: 4 },
  N:  { byte: 'b1', bit: 5 },
  M:  { byte: 'b1', bit: 6 },
  L:  { byte: 'b1', bit: 7 },

  F:  { byte: 'b2', bit: 0 },
  A:  { byte: 'b2', bit: 1 },
  B:  { byte: 'b2', bit: 2 },
  E:  { byte: 'b2', bit: 4 },
  D:  { byte: 'b2', bit: 5 },
  C:  { byte: 'b2', bit: 6 },
  DP: { byte: 'b2', bit: 7 }
};

// Standard preset characters for 7-segment (Cathode Common 8085sim)
const D7_PRESETS: { char: string; hex: number; segs: string }[] = [
  { char: '0', hex: 0x77, segs: 'A,B,C,D,E,F' },
  { char: '1', hex: 0x44, segs: 'B,C' },
  { char: '2', hex: 0x3e, segs: 'A,B,G,E,D' },
  { char: '3', hex: 0x6e, segs: 'A,B,G,C,D' },
  { char: '4', hex: 0x4d, segs: 'F,G,B,C' },
  { char: '5', hex: 0x6b, segs: 'A,F,G,C,D' },
  { char: '6', hex: 0x7b, segs: 'A,F,E,D,C,G' },
  { char: '7', hex: 0x46, segs: 'A,B,C' },
  { char: '8', hex: 0x7f, segs: 'A,B,C,D,E,F,G' },
  { char: '9', hex: 0x6f, segs: 'A,B,C,D,F,G' },
  { char: 'A', hex: 0x5f, segs: 'A,B,C,E,F,G' },
  { char: 'b', hex: 0x79, segs: 'C,D,E,F,G' },
  { char: 'C', hex: 0x33, segs: 'A,D,E,F' },
  { char: 'd', hex: 0x7c, segs: 'B,C,D,E,G' },
  { char: 'E', hex: 0x3b, segs: 'A,D,E,F,G' },
  { char: 'F', hex: 0x1b, segs: 'A,E,F,G' },
  { char: 'H', hex: 0x5d, segs: 'B,C,E,F,G' },
  { char: 'L', hex: 0x31, segs: 'D,E,F' },
  { char: 'P', hex: 0x1f, segs: 'A,B,E,F,G' },
  { char: 'U', hex: 0x75, segs: 'B,C,D,E,F' },
  { char: '-', hex: 0x08, segs: 'G' },
  { char: '_', hex: 0x20, segs: 'D' },
  { char: '.', hex: 0x80, segs: 'DP' }
];

// Tabla Oficial de 15 Segmentos de la Cátedra (8085sim):
// b1 = Byte 1 (Puerto Par N, Trazos Internos), b2 = Byte 2 (Puerto Impar N+1, Perímetro)
const D15_PRESETS: { char: string; b1: number; b2: number }[] = [
  { char: '0', b1: 0x24, b2: 0x77 }, // Cero con diagonal técnica
  { char: '1', b1: 0x00, b2: 0x44 },
  { char: '2', b1: 0x00, b2: 0x3e },
  { char: '3', b1: 0x00, b2: 0x6e },
  { char: '4', b1: 0x00, b2: 0x4d },
  { char: '5', b1: 0x00, b2: 0x6b },
  { char: '6', b1: 0x00, b2: 0x7b },
  { char: '7', b1: 0x00, b2: 0x46 },
  { char: '8', b1: 0x00, b2: 0x7f }, // Corregido: 7FH activa el segmento central G (bit 3=1)
  { char: '9', b1: 0x00, b2: 0x4f },
  { char: 'A', b1: 0x00, b2: 0x5f },
  { char: 'B', b1: 0x52, b2: 0x66 },
  { char: 'C', b1: 0x00, b2: 0x33 },
  { char: 'D', b1: 0x42, b2: 0x66 },
  { char: 'E', b1: 0x00, b2: 0x3b },
  { char: 'F', b1: 0x00, b2: 0x1b },
  { char: 'G', b1: 0x10, b2: 0x73 },
  { char: 'H', b1: 0x00, b2: 0x5d },
  { char: 'I', b1: 0x42, b2: 0x22 },
  { char: 'J', b1: 0x00, b2: 0x74 },
  { char: 'K', b1: 0xc6, b2: 0x00 },
  { char: 'L', b1: 0x00, b2: 0x31 },
  { char: 'M', b1: 0x05, b2: 0x55 },
  { char: 'N', b1: 0x81, b2: 0x55 },
  { char: 'Ñ', b1: 0x81, b2: 0x57 },
  { char: 'O', b1: 0x00, b2: 0x77 },
  { char: 'P', b1: 0x00, b2: 0x1f },
  { char: 'Q', b1: 0x80, b2: 0x77 },
  { char: 'R', b1: 0x80, b2: 0x1f },
  { char: 'S', b1: 0x18, b2: 0x63 },
  { char: 'T', b1: 0x42, b2: 0x02 },
  { char: 'U', b1: 0x00, b2: 0x75 },
  { char: 'V', b1: 0x24, b2: 0x11 },
  { char: 'W', b1: 0xa0, b2: 0x55 },
  { char: 'X', b1: 0xa5, b2: 0x00 },
  { char: 'Y', b1: 0x45, b2: 0x00 },
  { char: 'Z', b1: 0x24, b2: 0x22 }
];

export function createDisplayEncoderPanel(options: DisplayEncoderOptions = {}): DisplayEncoderInstance {
  const container = document.createElement('div');
  container.className = 'display-encoder-container';
  container.style.cssText = 'display: flex; flex-direction: column; height: 100%; padding: 12px; box-sizing: border-box; overflow-y: auto; gap: 12px; font-family: var(--font-sans); color: var(--text-main); font-size: 13px;';

  let currentMode: '7' | '15' = '7';
  let isAnode = false; // False = Cathode Common (8085sim, bit 1 = ON), True = Anode Common (0 = ON)

  // Segment states
  const state7: Record<string, boolean> = {
    A: false, B: false, C: false, D: false, E: false, F: false, G: false, DP: false
  };

  const state15: Record<string, boolean> = {
    A: false, B: false, C: false, D: false, E: false, F: false, G1: false, DP: false,
    G2: false, J: false, H: false, K: false, N: false, L: false, M: false
  };

  container.innerHTML = `
    <!-- Top Bar: Mode Toggle & Polarity Toggle -->
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; flex-wrap: wrap; gap: 8px;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-weight: 600; font-size: 12px;">Tipo de Display:</span>
        <div style="display: inline-flex; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 2px;">
          <button id="disp-mode-7" class="active" style="border: none; background: var(--accent); color: #fff; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;">7 Segmentos</button>
          <button id="disp-mode-15" style="border: none; background: transparent; color: var(--text-muted); padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;">15 Segmentos (Alfa)</button>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-weight: 600; font-size: 12px;">Polaridad:</span>
        <select id="disp-polarity-select" class="tb-btn" style="padding: 3px 6px; font-size: 11px; font-weight: 600; cursor: pointer;">
          <option value="cathode" selected>Cátodo Común (8085sim, 1 = ON)</option>
          <option value="anode">Ánodo Común (0 = ON, Invertido)</option>
        </select>
        <button id="disp-btn-clear" class="tb-btn" style="padding: 3px 8px; font-size: 11px; color: #f85149;" title="Apagar todos los segmentos">Apagar</button>
        <button id="disp-btn-all" class="tb-btn" style="padding: 3px 8px; font-size: 11px;" title="Encender todos los segmentos">Todos</button>
      </div>
    </div>

    <!-- Main Workspace: Interactive SVG Display + Realtime Codes -->
    <div style="display: grid; grid-template-columns: 200px 1fr; gap: 14px; background: var(--bg-card); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); align-items: center;">
      <!-- Interactive SVG Canvas -->
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0b0f14; border: 1px solid #21262d; border-radius: 8px; padding: 12px; position: relative;">
        <span style="font-size: 10px; color: #8b949e; margin-bottom: 6px; font-weight: bold; text-transform: uppercase;">Haz clic en los segmentos:</span>
        <div id="disp-interactive-host" style="width: 120px; height: 180px; display: flex; align-items: center; justify-content: center;"></div>
      </div>

      <!-- Realtime Value & Code Outputs -->
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <!-- Hex & Bin summary -->
        <div style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 12px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <span style="font-size: 11px; font-weight: bold; color: var(--text-muted);">VALOR HEXADECIMAL:</span>
            <span id="disp-out-hex" style="font-family: var(--font-mono); font-size: 20px; font-weight: bold; color: #ff7b72;">00H</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px;">
            <span style="font-size: 11px; font-weight: bold; color: var(--text-muted);">VALOR BINARIO:</span>
            <span id="disp-out-bin" style="font-family: var(--font-mono); font-size: 13px; color: #e3b341; letter-spacing: 1px;">00000000B</span>
          </div>
          <div id="disp-15-details" style="display: none; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border-color); font-size: 11px; font-family: var(--font-mono);">
            <span id="disp-out-15-bytes" style="color: #79c0ff;"></span>
          </div>
        </div>

        <!-- Segments summary -->
        <div style="font-size: 11px;">
          <span style="font-weight: bold; color: var(--text-muted);">Segmentos Encendidos: </span>
          <span id="disp-out-segs" style="font-family: var(--font-mono); color: #7ee787; font-weight: bold;">(Ninguno)</span>
        </div>

        <!-- Action / Insertion Buttons -->
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px;">
          <button id="disp-btn-copy-hex" class="tb-btn" style="flex: 1; min-width: 110px; padding: 6px; font-size: 11px; font-weight: 600;">📋 Copiar Hex</button>
          <button id="disp-btn-insert-db" class="tb-btn" style="flex: 1; min-width: 120px; padding: 6px; font-size: 11px; font-weight: 600;">📦 Insertar dB / dW</button>
          <button id="disp-btn-insert-mvi" class="tb-btn" style="flex: 1; min-width: 130px; padding: 6px; font-size: 11px; font-weight: 600; background: var(--accent); color: #fff; border: none;">✍️ Insertar Código MVI</button>
        </div>
      </div>
    </div>

    <!-- Glyph Catalog / Quick Reference Table -->
    <div style="flex: 1; display: flex; flex-direction: column; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color); padding: 10px; min-height: 180px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 11px; font-weight: bold; color: var(--text-muted); text-transform: uppercase;">
          Catálogo Rápido de Caracteres (Haz clic para cargar en el display):
        </span>
        <span style="font-size: 11px; color: var(--text-muted);">Haz clic en cualquier botón</span>
      </div>

      <!-- Preset Glyphs Grid -->
      <div id="disp-glyph-grid" style="display: flex; gap: 6px; flex-wrap: wrap; overflow-y: auto; max-height: 140px; padding: 2px;"></div>
    </div>
  `;

  // DOM references
  const mode7Btn = container.querySelector('#disp-mode-7') as HTMLButtonElement;
  const mode15Btn = container.querySelector('#disp-mode-15') as HTMLButtonElement;
  const polaritySelect = container.querySelector('#disp-polarity-select') as HTMLSelectElement;
  const clearBtn = container.querySelector('#disp-btn-clear') as HTMLButtonElement;
  const allBtn = container.querySelector('#disp-btn-all') as HTMLButtonElement;

  const svgHost = container.querySelector('#disp-interactive-host') as HTMLElement;
  const outHex = container.querySelector('#disp-out-hex') as HTMLElement;
  const outBin = container.querySelector('#disp-out-bin') as HTMLElement;
  const outSegs = container.querySelector('#disp-out-segs') as HTMLElement;
  const details15 = container.querySelector('#disp-15-details') as HTMLElement;
  const out15Bytes = container.querySelector('#disp-out-15-bytes') as HTMLElement;

  const copyHexBtn = container.querySelector('#disp-btn-copy-hex') as HTMLButtonElement;
  const insertDbBtn = container.querySelector('#disp-btn-insert-db') as HTMLButtonElement;
  const insertMviBtn = container.querySelector('#disp-btn-insert-mvi') as HTMLButtonElement;
  const glyphGrid = container.querySelector('#disp-glyph-grid') as HTMLElement;

  // Calculation helpers
  const calculate7Value = (): number => {
    let raw = 0;
    for (const [seg, on] of Object.entries(state7)) {
      if (on && D7_MASKS[seg] !== undefined) {
        raw |= D7_MASKS[seg];
      }
    }
    return isAnode ? (~raw & 0xff) : raw;
  };

  const calculate15Value = (): { b1: number; b2: number; word: number } => {
    let rawB1 = 0;
    let rawB2 = 0;

    // Perímetro (Byte 2)
    if (state15.F) rawB2 |= (1 << 0);
    if (state15.A) rawB2 |= (1 << 1);
    if (state15.B) rawB2 |= (1 << 2);
    if (state15.E) rawB2 |= (1 << 4);
    if (state15.D) rawB2 |= (1 << 5);
    if (state15.C) rawB2 |= (1 << 6);
    if (state15.DP) rawB2 |= (1 << 7);

    // Barra media horizontal (G1 y G2)
    if (state15.G1 && state15.G2) {
      // Ambas mitades encendidas -> activa bit 3 de Byte 2 (estándar 7 y 15 segmentos)
      rawB2 |= (1 << 3);
    } else {
      if (state15.G1) rawB1 |= (1 << 3);
      if (state15.G2) rawB1 |= (1 << 4);
    }

    // Trazos internos y diagonales (Byte 1)
    if (state15.H) rawB1 |= (1 << 0);
    if (state15.J) rawB1 |= (1 << 1);
    if (state15.K) rawB1 |= (1 << 2);
    if (state15.N) rawB1 |= (1 << 5);
    if (state15.M) rawB1 |= (1 << 6);
    if (state15.L) rawB1 |= (1 << 7);

    const finalB1 = isAnode ? (~rawB1 & 0xff) : rawB1;
    const finalB2 = isAnode ? (~rawB2 & 0xff) : rawB2;
    const word = (finalB2 << 8) | finalB1;
    return { b1: finalB1, b2: finalB2, word };
  };

  // Render SVG Display
  const renderSvg = () => {
    if (currentMode === '7') {
      const segStyle = (on: boolean) => `
        cursor: pointer;
        fill: ${on ? '#ff3838' : '#220808'};
        stroke: ${on ? '#ff8080' : '#331111'};
        stroke-width: 1;
        transition: fill 0.1s ease;
      `;

      svgHost.innerHTML = `
        <svg viewBox="0 0 50 80" style="width: 100%; height: 100%; filter: drop-shadow(0 0 6px rgba(255, 50, 50, 0.4));">
          <!-- A -->
          <polygon data-seg="A" points="12,8 38,8 34,14 16,14" style="${segStyle(state7.A)}" />
          <!-- B -->
          <polygon data-seg="B" points="38,9 43,14 40,38 35,35" style="${segStyle(state7.B)}" />
          <!-- C -->
          <polygon data-seg="C" points="40,42 43,66 38,71 35,45" style="${segStyle(state7.C)}" />
          <!-- D -->
          <polygon data-seg="D" points="16,66 34,66 38,72 12,72" style="${segStyle(state7.D)}" />
          <!-- E -->
          <polygon data-seg="E" points="12,42 15,45 15,66 10,71" style="${segStyle(state7.E)}" />
          <!-- F -->
          <polygon data-seg="F" points="10,9 15,14 15,35 12,38" style="${segStyle(state7.F)}" />
          <!-- G -->
          <polygon data-seg="G" points="15,38 35,38 33,42 17,42" style="${segStyle(state7.G)}" />
          <!-- DP -->
          <circle data-seg="DP" cx="45" cy="72" r="3.5" style="${segStyle(state7.DP)}" />
        </svg>
      `;

      svgHost.querySelectorAll('[data-seg]').forEach(el => {
        el.addEventListener('click', () => {
          const seg = el.getAttribute('data-seg');
          if (seg && state7[seg] !== undefined) {
            state7[seg] = !state7[seg];
            update();
          }
        });
      });
    } else {
      // 15 Segment SVG
      const segStyle = (on: boolean) => `
        cursor: pointer;
        fill: ${on ? '#ff3838' : '#220808'};
        stroke: ${on ? '#ff8080' : '#331111'};
        stroke-width: 0.8;
        transition: fill 0.1s ease;
      `;

      svgHost.innerHTML = `
        <svg viewBox="0 0 50 80" style="width: 100%; height: 100%; filter: drop-shadow(0 0 6px rgba(255, 50, 50, 0.4));">
          <!-- A (Top) -->
          <polygon data-seg="A" points="13,8 37,8 33,13 17,13" style="${segStyle(state15.A)}" />
          <!-- F (Top-Left) -->
          <polygon data-seg="F" points="10,10 15,14 15,36 10,39" style="${segStyle(state15.F)}" />
          <!-- B (Top-Right) -->
          <polygon data-seg="B" points="35,14 40,10 40,39 35,36" style="${segStyle(state15.B)}" />
          <!-- G1 (Mid-Left) -->
          <polygon data-seg="G1" points="16,38 23,38 22,41 16,41" style="${segStyle(state15.G1)}" />
          <!-- G2 (Mid-Right) -->
          <polygon data-seg="G2" points="27,38 34,38 34,41 28,41" style="${segStyle(state15.G2)}" />
          <!-- E (Bot-Left) -->
          <polygon data-seg="E" points="10,41 15,44 15,66 10,70" style="${segStyle(state15.E)}" />
          <!-- C (Bot-Right) -->
          <polygon data-seg="C" points="35,44 40,41 40,70 35,66" style="${segStyle(state15.C)}" />
          <!-- D (Bottom) -->
          <polygon data-seg="D" points="17,67 33,67 37,72 13,72" style="${segStyle(state15.D)}" />
          <!-- J (Top-Center Vertical) -->
          <polygon data-seg="J" points="23,15 27,15 27,36 23,36" style="${segStyle(state15.J)}" />
          <!-- M (Bot-Center Vertical) -->
          <polygon data-seg="M" points="23,43 27,43 27,65 23,65" style="${segStyle(state15.M)}" />
          <!-- H (Top-Left Diagonal) -->
          <line data-seg="H" x1="16" y1="15" x2="23" y2="36" stroke="${state15.H ? '#ff3838' : '#220808'}" stroke-width="3" stroke-linecap="round" style="cursor: pointer;" />
          <!-- K (Top-Right Diagonal) -->
          <line data-seg="K" x1="34" y1="15" x2="27" y2="36" stroke="${state15.K ? '#ff3838' : '#220808'}" stroke-width="3" stroke-linecap="round" style="cursor: pointer;" />
          <!-- N (Bot-Left Diagonal) -->
          <line data-seg="N" x1="23" y1="43" x2="16" y2="65" stroke="${state15.N ? '#ff3838' : '#220808'}" stroke-width="3" stroke-linecap="round" style="cursor: pointer;" />
          <!-- L (Bot-Right Diagonal) -->
          <line data-seg="L" x1="27" y1="43" x2="34" y2="65" stroke="${state15.L ? '#ff3838' : '#220808'}" stroke-width="3" stroke-linecap="round" style="cursor: pointer;" />
          <!-- DP -->
          <circle data-seg="DP" cx="44" cy="71" r="3" style="${segStyle(state15.DP)}" />
        </svg>
      `;

      svgHost.querySelectorAll('[data-seg]').forEach(el => {
        el.addEventListener('click', () => {
          const seg = el.getAttribute('data-seg');
          if (seg && state15[seg] !== undefined) {
            state15[seg] = !state15[seg];
            update();
          }
        });
      });
    }
  };

  // Render presets catalog
  const renderPresets = () => {
    glyphGrid.innerHTML = '';
    if (currentMode === '7') {
      D7_PRESETS.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'tb-btn';
        btn.style.cssText = 'padding: 4px 8px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;';
        const hexDisplay = item.hex.toString(16).padStart(2, '0').toUpperCase() + 'H';
        btn.innerHTML = `<span style="font-weight: bold; color: #79c0ff; font-size: 13px;">${item.char}</span> <span style="font-family: var(--font-mono); color: var(--text-muted); font-size: 10px;">${hexDisplay}</span>`;
        btn.title = `Cargar '${item.char}' (${item.segs}) en el display`;
        btn.addEventListener('click', () => {
          for (const s of Object.keys(state7)) {
            state7[s] = (item.hex & D7_MASKS[s]) !== 0;
          }
          update();
        });
        glyphGrid.appendChild(btn);
      });
    } else {
      D15_PRESETS.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'tb-btn';
        btn.style.cssText = 'padding: 4px 8px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;';
        const b1Hex = item.b1.toString(16).padStart(2, '0').toUpperCase();
        const b2Hex = item.b2.toString(16).padStart(2, '0').toUpperCase();
        btn.innerHTML = `<span style="font-weight: bold; color: #79c0ff; font-size: 13px;">${item.char}</span> <span style="font-family: var(--font-mono); color: var(--text-muted); font-size: 10px;">${b1Hex}, ${b2Hex}H</span>`;
        btn.title = `Cargar '${item.char}' (Byte 1: ${b1Hex}H, Byte 2: ${b2Hex}H)`;
        btn.addEventListener('click', () => {
          const b1 = item.b1;
          const b2 = item.b2;
          const g_b2 = (b2 & (1 << 3)) !== 0;

          state15.H = (b1 & (1 << 0)) !== 0;
          state15.J = (b1 & (1 << 1)) !== 0;
          state15.K = (b1 & (1 << 2)) !== 0;
          state15.G1 = (b1 & (1 << 3)) !== 0 || g_b2;
          state15.G2 = (b1 & (1 << 4)) !== 0 || g_b2;
          state15.N = (b1 & (1 << 5)) !== 0;
          state15.M = (b1 & (1 << 6)) !== 0;
          state15.L = (b1 & (1 << 7)) !== 0;

          state15.F = (b2 & (1 << 0)) !== 0;
          state15.A = (b2 & (1 << 1)) !== 0;
          state15.B = (b2 & (1 << 2)) !== 0;
          state15.E = (b2 & (1 << 4)) !== 0;
          state15.D = (b2 & (1 << 5)) !== 0;
          state15.C = (b2 & (1 << 6)) !== 0;
          state15.DP = (b2 & (1 << 7)) !== 0;

          update();
        });
        glyphGrid.appendChild(btn);
      });
    }
  };

  // Main update loop
  const update = () => {
    renderSvg();

    if (currentMode === '7') {
      details15.style.display = 'none';
      const val = calculate7Value();
      const hex = val.toString(16).padStart(2, '0').toUpperCase() + 'H';
      const bin = val.toString(2).padStart(8, '0') + 'B';
      outHex.textContent = hex;
      outBin.textContent = bin;

      const activeSegs = Object.entries(state7).filter(([, on]) => on).map(([s]) => s);
      outSegs.textContent = activeSegs.length > 0 ? activeSegs.join(', ') : '(Ninguno)';

      copyHexBtn.textContent = `📋 Copiar ${hex}`;
      insertDbBtn.textContent = `📦 Insertar dB ${hex}`;
      insertMviBtn.textContent = `✍️ Insertar MVI A, ${hex}`;
    } else {
      details15.style.display = 'block';
      const { b1, b2, word } = calculate15Value();
      const b1Hex = b1.toString(16).padStart(2, '0').toUpperCase() + 'H';
      const b2Hex = b2.toString(16).padStart(2, '0').toUpperCase() + 'H';
      const wordHex = word.toString(16).padStart(4, '0').toUpperCase() + 'H';
      const binB1 = b1.toString(2).padStart(8, '0');
      const binB2 = b2.toString(2).padStart(8, '0');

      outHex.textContent = `${b1Hex}, ${b2Hex}`;
      outBin.textContent = `B1:${binB1} B2:${binB2}`;
      out15Bytes.textContent = `Puerto N (Byte 1, Interno): ${b1Hex} | Puerto N+1 (Byte 2, Perímetro): ${b2Hex}`;

      const activeSegs = Object.entries(state15).filter(([, on]) => on).map(([s]) => s);
      outSegs.textContent = activeSegs.length > 0 ? activeSegs.join(', ') : '(Ninguno)';

      copyHexBtn.textContent = `📋 Copiar ${b1Hex}, ${b2Hex}`;
      insertDbBtn.textContent = `📦 Insertar dB ${b1Hex}, ${b2Hex}`;
      insertMviBtn.textContent = `✍️ Insertar Código MVI`;
    }
  };

  // Event Listeners
  mode7Btn.addEventListener('click', () => {
    currentMode = '7';
    mode7Btn.style.background = 'var(--accent)';
    mode7Btn.style.color = '#fff';
    mode15Btn.style.background = 'transparent';
    mode15Btn.style.color = 'var(--text-muted)';
    renderPresets();
    update();
  });

  mode15Btn.addEventListener('click', () => {
    currentMode = '15';
    mode15Btn.style.background = 'var(--accent)';
    mode15Btn.style.color = '#fff';
    mode7Btn.style.background = 'transparent';
    mode7Btn.style.color = 'var(--text-muted)';
    renderPresets();
    update();
  });

  polaritySelect.addEventListener('change', () => {
    isAnode = polaritySelect.value === 'anode';
    update();
  });

  clearBtn.addEventListener('click', () => {
    if (currentMode === '7') {
      for (const k of Object.keys(state7)) state7[k] = false;
    } else {
      for (const k of Object.keys(state15)) state15[k] = false;
    }
    update();
  });

  allBtn.addEventListener('click', () => {
    if (currentMode === '7') {
      for (const k of Object.keys(state7)) state7[k] = true;
    } else {
      for (const k of Object.keys(state15)) state15[k] = true;
    }
    update();
  });

  copyHexBtn.addEventListener('click', () => {
    const text = outHex.textContent || '';
    navigator.clipboard.writeText(text);
  });

  insertDbBtn.addEventListener('click', () => {
    let snippet = '';
    if (currentMode === '7') {
      snippet = `dB ${outHex.textContent}`;
    } else {
      const { b1, b2, word } = calculate15Value();
      const b1Hex = b1.toString(16).padStart(2, '0').toUpperCase() + 'H';
      const b2Hex = b2.toString(16).padStart(2, '0').toUpperCase() + 'H';
      const wordHex = word.toString(16).padStart(4, '0').toUpperCase() + 'H';
      snippet = `dB ${b1Hex}, ${b2Hex} ; o dW ${wordHex}`;
    }
    if (options.onInsertCode) options.onInsertCode(snippet);
    else navigator.clipboard.writeText(snippet);
  });

  insertMviBtn.addEventListener('click', () => {
    let snippet = '';
    if (currentMode === '7') {
      const hex = calculate7Value().toString(16).padStart(2, '0').toUpperCase() + 'H';
      snippet = `MVI A, ${hex}\nOUT 00H ; Mostrar en display 7 seg`;
    } else {
      const { b1, b2 } = calculate15Value();
      const b1Hex = b1.toString(16).padStart(2, '0').toUpperCase() + 'H';
      const b2Hex = b2.toString(16).padStart(2, '0').toUpperCase() + 'H';
      snippet = `MVI A, ${b1Hex}\nOUT 00H ; Puerto N (Byte 1: Trazos internos)\nMVI A, ${b2Hex}\nOUT 01H ; Puerto N+1 (Byte 2: Perímetro exterior)`;
    }
    if (options.onInsertCode) options.onInsertCode(snippet);
    else navigator.clipboard.writeText(snippet);
  });

  // Initial load
  renderPresets();
  update();

  return {
    element: container,
    destroy: () => {}
  };
}
