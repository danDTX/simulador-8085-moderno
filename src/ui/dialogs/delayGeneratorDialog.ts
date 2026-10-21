export interface DelayCalculationResult {
  strategy: 'simple' | 'nested' | 'triple';
  regB: number;
  regC: number;
  regD: number;
  cyclesTarget: number;
  cyclesActual: number;
  realDelayMs: number;
  errorPercent: number;
  asmCode: string;
}

export class DelayGenerator {
  /**
   * Calculates optimal register counts for a requested delay in milliseconds.
   */
  public static calculate(delayMs: number, freqHz: number): DelayCalculationResult {
    const cyclesTarget = Math.round((delayMs / 1000) * freqHz);

    // Strategy 1: Nested loop with B and C (most versatile for 8085 cátedra)
    // Formula:
    // PUSH B: 12
    // MVI B, b: 7
    // LoopExt:
    //   MVI C, c: 7
    //   LoopInt:
    //     DCR C: 4
    //     JNZ LoopInt: 10 (except last 7) -> 14*c - 3
    //     DCR B: 4
    //     JNZ LoopExt: 10 (except last 7)
    // POP B: 10
    // RET: 10
    // Total = 12 + 7 + b * (7 + 14*c - 3 + 4 + 10) - 3 + 10 + 10 = 36 + b * (18 + 14*c) - 3 = 33 + b*(18 + 14*c)

    let bestB = 1;
    let bestC = 1;
    let bestDiff = Infinity;
    let bestCycles = 0;

    // Search optimal B and C (1 to 255)
    for (let b = 1; b <= 255; b++) {
      // cycles = 33 + b*(18 + 14*c)
      // (cycles - 33)/b - 18 = 14*c
      const cFloat = ((cyclesTarget - 33) / b - 18) / 14;
      const cCand = [Math.max(1, Math.min(255, Math.floor(cFloat))), Math.max(1, Math.min(255, Math.ceil(cFloat)))];

      for (const c of cCand) {
        const actual = 33 + b * (18 + 14 * c);
        const diff = Math.abs(actual - cyclesTarget);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestB = b;
          bestC = c;
          bestCycles = actual;
        }
      }
    }

    const realDelayMs = (bestCycles / freqHz) * 1000;
    const errorPercent = cyclesTarget > 0 ? (Math.abs(bestCycles - cyclesTarget) / cyclesTarget) * 100 : 0;

    const toHex = (n: number) => '0' + n.toString(16).toUpperCase() + 'H';
    const bHex = toHex(bestB);
    const cHex = toHex(bestC);

    const asmCode = `; =======================================================
; SUBRUTINA DE RETARDO GENERADA AUTOMÁTICAMENTE
; Tiempo objetivo: ${delayMs} ms @ ${(freqHz / 1000).toFixed(1)} kHz
; Ciclos T calculados: ${bestCycles.toLocaleString()} (Error: ${errorPercent.toFixed(2)}%)
; Tiempo real: ${realDelayMs.toFixed(3)} ms
; =======================================================
RETARDO_${Math.round(delayMs)}MS:
    PUSH B                  ; Guarda registros en la pila (12 T)
    MVI B, ${bHex}           ; Inicializa contador externo (7 T)
RET_EXTERNO:
    MVI C, ${cHex}           ; Inicializa contador interno (7 T)
RET_INTERNO:
    DCR C                   ; Decrementa contador interno (4 T)
    JNZ RET_INTERNO         ; Salta si C != 0 (10/7 T)
    DCR B                   ; Decrementa contador externo (4 T)
    JNZ RET_EXTERNO         ; Salta si B != 0 (10/7 T)
    POP B                   ; Restaura registros desde la pila (10 T)
    RET                     ; Retorna al programa principal (10 T)
`;

    return {
      strategy: 'nested',
      regB: bestB,
      regC: bestC,
      regD: 0,
      cyclesTarget,
      cyclesActual: bestCycles,
      realDelayMs,
      errorPercent,
      asmCode
    };
  }
}

export function createDelayGeneratorDialog(onInsertCode: (code: string) => void): HTMLElement {
  const container = document.createElement('div');
  container.className = 'delay-gen-container';
  container.style.cssText = 'padding: 16px; background: var(--bg-window); color: var(--text-main); font-family: var(--font-sans); font-size: 13px; display: flex; flex-direction: column; gap: 14px; height: 100%; box-sizing: border-box; overflow-y: auto;';

  container.innerHTML = `
    <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
      <h3 style="margin: 0; color: #58a6ff; font-size: 15px; display: flex; align-items: center; gap: 8px;">
        ⏱️ Asistente Calculador de Retardos 8085
      </h3>
      <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 12px;">
        Genera el bucle exacto con conteo riguroso de ciclos de reloj ($T$-States) y registros $B$ y $C$.
      </p>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <div>
        <label style="display: block; font-size: 11px; font-weight: bold; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">
          Frecuencia de CPU:
        </label>
        <select id="delay-freq" style="width: 100%; background: #0d1117; color: #c9d1d9; border: 1px solid var(--border-color); border-radius: 4px; padding: 6px 8px; font-size: 12px;">
          <option value="300000" selected>⚡ 300 kHz (Simulador 8085sim Cátedra)</option>
          <option value="2000000">⏱️ 2.0 MHz (Intel 8085 Hardware)</option>
          <option value="3072000">⚡ 3.072 MHz (Cristal estándar 6.144 MHz / 2)</option>
          <option value="500000">🚀 500 kHz</option>
          <option value="1000000">⚡ 1.0 MHz</option>
        </select>
      </div>

      <div>
        <label style="display: block; font-size: 11px; font-weight: bold; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">
          Retardo deseado:
        </label>
        <div style="display: flex; gap: 6px;">
          <input type="number" id="delay-val" value="500" min="1" max="10000" style="flex: 1; background: #0d1117; color: #79c0ff; font-weight: bold; border: 1px solid var(--border-color); border-radius: 4px; padding: 6px 8px; font-size: 13px;" />
          <select id="delay-unit" style="background: #0d1117; color: #c9d1d9; border: 1px solid var(--border-color); border-radius: 4px; padding: 6px 8px; font-size: 12px;">
            <option value="ms" selected>Milisegundos (ms)</option>
            <option value="s">Segundos (s)</option>
            <option value="us">Microsegundos (μs)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Live Preview Card -->
    <div id="delay-stats-box" style="background: rgba(88, 166, 255, 0.08); border: 1px solid rgba(88, 166, 255, 0.2); border-radius: 6px; padding: 10px 14px; font-size: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <div><strong>Ciclos T Requeridos:</strong> <span id="stat-cycles" style="color: #58a6ff; font-weight: bold;">--</span></div>
      <div><strong>Bucle Ext (B):</strong> <span id="stat-b" style="color: #ffab70; font-weight: bold;">--</span></div>
      <div><strong>Bucle Int (C):</strong> <span id="stat-c" style="color: #ffab70; font-weight: bold;">--</span></div>
      <div><strong>Error:</strong> <span id="stat-error" style="color: #3fb950; font-weight: bold;">0.00%</span></div>
    </div>

    <!-- Code Output -->
    <div style="flex: 1; display: flex; flex-direction: column; min-height: 180px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="font-size: 11px; font-weight: bold; color: var(--text-muted); text-transform: uppercase;">Código Ensamblador Generado:</span>
        <button id="btn-copy-delay" class="tb-btn" style="padding: 2px 8px; font-size: 11px;">📋 Copiar Código</button>
      </div>
      <textarea id="delay-code-output" readonly style="flex: 1; width: 100%; box-sizing: border-box; background: #0d1117; border: 1px solid var(--border-color); border-radius: 6px; color: #79c0ff; font-family: var(--font-mono); font-size: 12px; line-height: 18px; padding: 10px; resize: none; outline: none;"></textarea>
    </div>

    <!-- Action Buttons -->
    <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 10px;">
      <button id="btn-insert-delay" style="background: var(--accent); color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
        ✨ Insertar en el Editor
      </button>
    </div>
  `;

  const freqSelect = container.querySelector('#delay-freq') as HTMLSelectElement;
  const valInput = container.querySelector('#delay-val') as HTMLInputElement;
  const unitSelect = container.querySelector('#delay-unit') as HTMLSelectElement;

  const statCycles = container.querySelector('#stat-cycles') as HTMLElement;
  const statB = container.querySelector('#stat-b') as HTMLElement;
  const statC = container.querySelector('#stat-c') as HTMLElement;
  const statError = container.querySelector('#stat-error') as HTMLElement;
  const codeOutput = container.querySelector('#delay-code-output') as HTMLTextAreaElement;

  const recalculate = () => {
    const freq = parseFloat(freqSelect.value) || 300000;
    const rawVal = parseFloat(valInput.value) || 1;
    const unit = unitSelect.value;

    let ms = rawVal;
    if (unit === 's') ms = rawVal * 1000;
    else if (unit === 'us') ms = rawVal / 1000;

    const res = DelayGenerator.calculate(ms, freq);

    statCycles.textContent = res.cyclesActual.toLocaleString() + ' T';
    statB.textContent = `${res.regB} (0${res.regB.toString(16).toUpperCase()}H)`;
    statC.textContent = `${res.regC} (0${res.regC.toString(16).toUpperCase()}H)`;
    statError.textContent = `${res.errorPercent.toFixed(2)}%`;
    codeOutput.value = res.asmCode;
  };

  freqSelect.addEventListener('change', recalculate);
  valInput.addEventListener('input', recalculate);
  unitSelect.addEventListener('change', recalculate);

  container.querySelector('#btn-copy-delay')?.addEventListener('click', () => {
    navigator.clipboard.writeText(codeOutput.value);
    alert('Código copiado al portapapeles');
  });

  container.querySelector('#btn-insert-delay')?.addEventListener('click', () => {
    onInsertCode(codeOutput.value);
  });

  recalculate();

  return container;
}
