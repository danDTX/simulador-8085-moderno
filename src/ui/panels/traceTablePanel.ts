import { Intel8085 } from '../../core/cpu8085.js';
import { ConfigManager } from '../../core/configManager.js';
import {
  TraceRow,
  generateExecutionTrace,
  generateTSV,
  generateCSV,
  generateStyledHTMLTable,
  formatRegVal
} from '../../core/traceEngine.js';

export interface TraceTableOptions {
  cpu: Intel8085;
}

export interface TraceTableInstance {
  element: HTMLElement;
  destroy: () => void;
  runTrace: () => void;
}

export function createTraceTablePanel(options: TraceTableOptions): TraceTableInstance {
  const container = document.createElement('div');
  container.className = 'trace-table-panel';
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: var(--bg-main, #0d1117);
    color: var(--text-main, #c9d1d9);
    font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    overflow: hidden;
  `;

  container.innerHTML = `
    <!-- Top Toolbar Controls -->
    <div style="padding: 8px 12px; background: var(--bg-card, #161b22); border-bottom: 1px solid var(--border-color, #30363d); display: flex; flex-direction: column; gap: 8px;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
        <!-- Left: Execution Configuration -->
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px;">
          <label style="display: flex; align-items: center; gap: 4px; font-weight: bold; color: var(--text-main);">
            <span>📍 PC Inicio:</span>
            <input id="trace-pc-input" type="text" value="0000H" style="width: 70px; background: var(--bg-input, #0d1117); color: var(--accent); border: 1px solid var(--border-color, #30363d); border-radius: 4px; padding: 3px 6px; font-family: var(--font-mono, monospace); font-weight: bold; text-align: center; text-transform: uppercase;" title="Dirección de arranque en hexadecimal (por defecto 0000H)" />
          </label>

          <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: var(--text-main); font-size: 11px;">
            <input id="trace-skip-nops" type="checkbox" checked />
            <span>Auto-saltar NOPs si 0000H está vacío</span>
          </label>

          <label style="display: flex; align-items: center; gap: 4px; color: var(--text-main);">
            <span style="color: var(--text-muted, #8b949e);">Máx. Pasos:</span>
            <input id="trace-max-steps" type="number" value="1000" min="10" max="50000" step="100" style="width: 75px; background: var(--bg-input, #0d1117); color: var(--text-main, #c9d1d9); border: 1px solid var(--border-color, #30363d); border-radius: 4px; padding: 3px 6px; font-size: 11px; text-align: center;" title="Límite de seguridad contra bucles infinitos" />
          </label>

          <button id="trace-btn-run" class="tb-btn" style="background: #238636; color: #ffffff; border: 1px solid #2ea043; border-radius: 4px; padding: 4px 12px; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            ▶️ Generar Traza
          </button>
        </div>

        <!-- Right: Actions & Exports -->
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <button id="trace-btn-copy" class="tb-btn" style="padding: 4px 10px; font-size: 11px; background: var(--bg-input, #21262d); color: var(--trace-btn-copy-color, #58a6ff); border: 1px solid var(--border-color, #30363d); border-radius: 4px; cursor: pointer; font-weight: 600;" title="Copia en formato tabla para pegar directamente con Ctrl+V en Excel o Google Sheets">
            📋 Copiar Tabla
          </button>
          <button id="trace-btn-export-xls" class="tb-btn" style="padding: 4px 10px; font-size: 11px; background: #238636; color: #ffffff; border: 1px solid #2ea043; border-radius: 4px; cursor: pointer; font-weight: 600;" title="Descarga archivo .xls con formato y colores completos para Excel">
            📥 Exportar Excel (.xls)
          </button>
          <button id="trace-btn-export-csv" class="tb-btn" style="padding: 4px 10px; font-size: 11px; background: var(--bg-input, #21262d); color: var(--text-main, #c9d1d9); border: 1px solid var(--border-color, #30363d); border-radius: 4px; cursor: pointer;" title="Descarga archivo CSV delimitado por comas">
            📄 CSV
          </button>
          <button id="trace-btn-clear" class="tb-btn" style="padding: 4px 8px; font-size: 11px; background: transparent; color: var(--danger, #f85149); border: 1px solid var(--danger, #da3633); border-radius: 4px; cursor: pointer;" title="Limpiar resultados actuales">
            🧹 Limpiar
          </button>
        </div>
      </div>

      <!-- Status & Diagnostics Ribbon -->
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; border-top: 1px solid var(--border-color); padding-top: 4px;">
        <div id="trace-status" style="color: var(--text-muted, #8b949e); display: flex; align-items: center; gap: 6px;">
          <span>💡 Presiona <strong>▶️ Generar Traza</strong> para simular paso a paso hasta HLT y registrar los estados.</span>
        </div>
        <div id="trace-stats" style="font-family: var(--font-mono, monospace); color: var(--trace-stats-color, #7ee787); font-weight: bold;"></div>
      </div>
    </div>

    <!-- Spreadsheet Table Container -->
    <div style="flex: 1; overflow: auto; background: var(--trace-bg, #0b0e14); position: relative;">
      <table id="trace-matrix-table" style="border-collapse: collapse; width: 100%; min-width: 900px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; text-align: center;">
        <thead style="position: sticky; top: 0; z-index: 10; background: var(--trace-th-bg, #2e5b27); color: var(--trace-th-color, #ffffff); box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          <tr>
            <th style="padding: 7px 12px; text-align: left; border: 1px solid var(--trace-th-border, #1e3d1a); min-width: 140px; font-weight: bold;">CODIGO</th>
            <th style="padding: 7px 8px; border: 1px solid var(--trace-th-border, #1e3d1a); min-width: 45px;">A</th>
            <th style="padding: 7px 8px; border: 1px solid var(--trace-th-border, #1e3d1a); min-width: 45px;">B</th>
            <th style="padding: 7px 8px; border: 1px solid var(--trace-th-border, #1e3d1a); min-width: 45px;">C</th>
            <th style="padding: 7px 8px; border: 1px solid var(--trace-th-border, #1e3d1a); min-width: 45px;">D</th>
            <th style="padding: 7px 8px; border: 1px solid var(--trace-th-border, #1e3d1a); min-width: 45px;">E</th>
            <th style="padding: 7px 8px; border: 1px solid var(--trace-th-border, #1e3d1a); min-width: 45px;">H</th>
            <th style="padding: 7px 8px; border: 1px solid var(--trace-th-border, #1e3d1a); min-width: 45px;">L</th>
            <th style="padding: 7px 8px; border: 1px solid var(--trace-th-border, #1e3d1a); min-width: 45px; background: var(--trace-th-m, #3b7432);">M</th>
            <th style="padding: 7px 8px; border: 1px solid var(--trace-th-border, #1e3d1a); min-width: 60px;">SP</th>
            <th style="padding: 7px 8px; border: 1px solid var(--trace-th-border, #1e3d1a); min-width: 60px;">PC</th>
            <th style="padding: 7px 8px; border: 1px solid var(--trace-th-border, #1e3d1a); min-width: 32px; background: var(--trace-th-flags, #264b20);">Z</th>
            <th style="padding: 7px 8px; border: 1px solid var(--trace-th-border, #1e3d1a); min-width: 32px; background: var(--trace-th-flags, #264b20);">S</th>
            <th style="padding: 7px 8px; border: 1px solid var(--trace-th-border, #1e3d1a); min-width: 32px; background: var(--trace-th-flags, #264b20);">AC</th>
            <th style="padding: 7px 8px; border: 1px solid var(--trace-th-border, #1e3d1a); min-width: 32px; background: var(--trace-th-flags, #264b20);">CY</th>
            <th style="padding: 7px 8px; border: 1px solid var(--trace-th-border, #1e3d1a); min-width: 32px; background: var(--trace-th-flags, #264b20);">P</th>
          </tr>
        </thead>
        <tbody id="trace-table-body">
          <tr>
            <td colspan="16" style="padding: 40px; color: var(--text-muted, #8b949e); font-style: italic; background: transparent;">
              No se ha generado ninguna traza aún. Ajusta los parámetros si lo requieres y pulsa <strong>▶️ Generar Traza</strong>.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // UI Element References
  const pcInput = container.querySelector('#trace-pc-input') as HTMLInputElement;
  const skipNopsCheck = container.querySelector('#trace-skip-nops') as HTMLInputElement;
  const maxStepsInput = container.querySelector('#trace-max-steps') as HTMLInputElement;
  const btnRun = container.querySelector('#trace-btn-run') as HTMLButtonElement;
  const btnCopy = container.querySelector('#trace-btn-copy') as HTMLButtonElement;
  const btnExportXls = container.querySelector('#trace-btn-export-xls') as HTMLButtonElement;
  const btnExportCsv = container.querySelector('#trace-btn-export-csv') as HTMLButtonElement;
  const btnClear = container.querySelector('#trace-btn-clear') as HTMLButtonElement;
  const statusEl = container.querySelector('#trace-status') as HTMLElement;
  const statsEl = container.querySelector('#trace-stats') as HTMLElement;
  const tableBody = container.querySelector('#trace-table-body') as HTMLElement;

  let currentRows: TraceRow[] = [];

  // Load persisted config preferences
  const loadSavedPreferences = () => {
    const config = ConfigManager.get();
    if (config.traceTableStartPC) {
      pcInput.value = config.traceTableStartPC;
    }
    if (config.traceTableMaxSteps) {
      maxStepsInput.value = String(config.traceTableMaxSteps);
    }
  };

  const savePreferences = () => {
    ConfigManager.save({
      traceTableStartPC: pcInput.value.trim().toUpperCase(),
      traceTableMaxSteps: parseInt(maxStepsInput.value, 10) || 1000
    });
  };

  const parseHexAddress = (str: string): number => {
    let clean = str.trim().toUpperCase();
    if (clean.endsWith('H')) clean = clean.slice(0, -1);
    const parsed = parseInt(clean, 16);
    return isNaN(parsed) ? 0x0000 : (parsed & 0xffff);
  };

  const renderTable = (rows: TraceRow[]) => {
    tableBody.innerHTML = '';

    if (rows.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="16" style="padding: 40px; color: var(--text-muted, #8b949e); font-style: italic;">
            No se encontraron instrucciones ejecutadas.
          </td>
        </tr>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const tr = document.createElement('tr');
      const isEven = i % 2 === 0;

      if (r.isHalt) {
        tr.style.cssText = 'background: var(--trace-hlt-bg, #b71c1c); color: #ffffff; font-weight: bold; border-bottom: 1px solid var(--trace-hlt-border, #7f0000);';
        tr.innerHTML = `
          <td style="padding: 5px 10px; text-align: left; font-weight: bold; background: var(--trace-hlt-code-bg, #990000); border: 1px solid var(--trace-hlt-border, #7f0000); color: #ffffff;">HLT</td>
          <td colspan="15" style="padding: 5px 10px; text-align: center; font-weight: bold; letter-spacing: 1px; border: 1px solid var(--trace-hlt-border, #7f0000); color: #ffffff;">
            🛑 PROCESADOR DETENIDO (HLT) — PC: ${formatRegVal(r.pc, true)}
          </td>
        `;
        fragment.appendChild(tr);
        continue;
      }

      // Authentic green spreadsheet striping using theme variables
      const rowBg = isEven ? 'var(--trace-row-even, #1e2c1e)' : 'var(--trace-row-odd, #172217)';
      tr.style.cssText = `background: ${rowBg}; color: var(--trace-text, #dcedc8); border-bottom: 1px solid var(--trace-border, #2e432e);`;

      const c = r.changed;
      const makeCell = (val: string, changed: boolean, isCode: boolean = false, extraBg?: string) => {
        let bg = extraBg || 'transparent';
        let color = 'var(--trace-text, #dcedc8)';
        let weight = 'normal';
        let border = '1px solid var(--trace-border, #2e432e)';

        if (changed) {
          bg = 'var(--trace-cell-changed, #c00000)';
          color = 'var(--trace-cell-changed-text, #ffffff)';
          weight = 'bold';
        }

        if (isCode) {
          const codeColor = changed ? '#ffffff' : 'var(--trace-code, #81c784)';
          const emptyText = '<span style="color: var(--trace-code-empty, #557b52); font-style: italic;">(ESTADO INICIAL)</span>';
          return `<td style="padding: 4px 10px; text-align: left; font-weight: bold; color: ${codeColor}; background: ${bg}; border: ${border};">${val || emptyText}</td>`;
        }

        return `<td style="padding: 4px 6px; background: ${bg}; color: ${color}; font-weight: ${weight}; border: ${border};">${val}</td>`;
      };

      tr.innerHTML = `
        ${makeCell(r.code, false, true)}
        ${makeCell(formatRegVal(r.a), c.a)}
        ${makeCell(formatRegVal(r.b), c.b)}
        ${makeCell(formatRegVal(r.c), c.c)}
        ${makeCell(formatRegVal(r.d), c.d)}
        ${makeCell(formatRegVal(r.e), c.e)}
        ${makeCell(formatRegVal(r.h), c.h)}
        ${makeCell(formatRegVal(r.l), c.l)}
        ${makeCell(formatRegVal(r.m), c.m, false, 'var(--trace-m-bg, #213521)')}
        ${makeCell(formatRegVal(r.sp, true), c.sp)}
        ${makeCell(formatRegVal(r.pc, true), c.pc)}
        ${makeCell(String(r.z), c.z, false, 'var(--trace-flags-bg, #192819)')}
        ${makeCell(String(r.s), c.s, false, 'var(--trace-flags-bg, #192819)')}
        ${makeCell(String(r.ac), c.ac, false, 'var(--trace-flags-bg, #192819)')}
        ${makeCell(String(r.cy), c.cy, false, 'var(--trace-flags-bg, #192819)')}
        ${makeCell(String(r.p), c.p, false, 'var(--trace-flags-bg, #192819)')}
      `;

      fragment.appendChild(tr);
    }

    tableBody.appendChild(fragment);
  };

  const runTrace = () => {
    savePreferences();
    const startPc = parseHexAddress(pcInput.value);
    const skipNops = skipNopsCheck.checked;
    const maxSteps = parseInt(maxStepsInput.value, 10) || 1000;

    statusEl.innerHTML = `<span style="color: #e3b341;">⏳ Simulando ejecución paso a paso...</span>`;

    setTimeout(() => {
      try {
        const result = generateExecutionTrace({
          cpu: options.cpu,
          startPc,
          skipInitialNops: skipNops,
          maxSteps
        });

        currentRows = result.rows;
        renderTable(currentRows);

        const pcHex = result.actualStartPc.toString(16).toUpperCase().padStart(4, '0') + 'H';
        const startNote = result.actualStartPc !== startPc
          ? `(0000H estaba vacío, auto-iniciado en <strong>${pcHex}</strong>)`
          : `(Iniciado en <strong>${pcHex}</strong>)`;

        statusEl.innerHTML = `<span>${result.reason} ${startNote}</span>`;
        statsEl.textContent = `Total: ${result.totalSteps} instrucciones | ${currentRows.length} filas`;
      } catch (err: any) {
        statusEl.innerHTML = `<span style="color: #f85149;">❌ Error en la generación: ${err.message}</span>`;
      }
    }, 20);
  };

  const copyToClipboard = async () => {
    if (currentRows.length === 0) {
      statusEl.innerHTML = `<span style="color: #f85149;">⚠️ No hay datos para copiar. Genera la traza primero.</span>`;
      return;
    }

    const tsv = generateTSV(currentRows);
    const html = generateStyledHTMLTable(currentRows);

    try {
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const textBlob = new Blob([tsv], { type: 'text/plain' });
        const htmlBlob = new Blob([html], { type: 'text/html' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': textBlob,
            'text/html': htmlBlob
          })
        ]);
      } else {
        await navigator.clipboard.writeText(tsv);
      }

      const prevStats = statsEl.textContent;
      statsEl.textContent = '✅ ¡Copiado con formato!';
      statusEl.innerHTML = `<span style="color: #7ee787;">📋 Tabla copiada con éxito. Pégala directamente en <strong>Excel</strong> o <strong>Google Sheets</strong> con <strong>Ctrl+V</strong>.</span>`;
      setTimeout(() => { statsEl.textContent = prevStats; }, 3500);
    } catch {
      // Fallback
      await navigator.clipboard.writeText(tsv);
      statusEl.innerHTML = `<span style="color: #7ee787;">📋 Texto TSV copiado. Pégalo en Excel con Ctrl+V.</span>`;
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    if (currentRows.length === 0) {
      statusEl.innerHTML = `<span style="color: #f85149;">⚠️ No hay datos para exportar. Genera la traza primero.</span>`;
      return;
    }
    const htmlSpreadsheet = generateStyledHTMLTable(currentRows);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadFile(htmlSpreadsheet, `Prueba_Escritorio_8085_${timestamp}.xls`, 'application/vnd.ms-excel;charset=utf-8');
    statusEl.innerHTML = `<span style="color: #7ee787;">📥 Archivo Excel (.xls) descargado con estilos y colores completos.</span>`;
  };

  const exportCsv = () => {
    if (currentRows.length === 0) {
      statusEl.innerHTML = `<span style="color: #f85149;">⚠️ No hay datos para exportar. Genera la traza primero.</span>`;
      return;
    }
    const csv = generateCSV(currentRows);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadFile(csv, `Prueba_Escritorio_8085_${timestamp}.csv`, 'text/csv;charset=utf-8');
    statusEl.innerHTML = `<span style="color: #7ee787;">📄 Archivo CSV (.csv) delimitado por comas descargado.</span>`;
  };

  const clearTable = () => {
    currentRows = [];
    tableBody.innerHTML = `
      <tr>
        <td colspan="16" style="padding: 40px; color: var(--text-muted, #8b949e); font-style: italic;">
          Tabla limpiada. Pulsa <strong>▶️ Generar Traza</strong> para volver a ejecutar.
        </td>
      </tr>`;
    statsEl.textContent = '';
    statusEl.innerHTML = `<span>Tabla limpiada.</span>`;
  };

  // Attach Event Listeners
  btnRun.addEventListener('click', runTrace);
  btnCopy.addEventListener('click', copyToClipboard);
  btnExportXls.addEventListener('click', exportExcel);
  btnExportCsv.addEventListener('click', exportCsv);
  btnClear.addEventListener('click', clearTable);

  pcInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runTrace();
  });
  maxStepsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runTrace();
  });

  // Initialize
  loadSavedPreferences();

  return {
    element: container,
    destroy: () => {},
    runTrace
  };
}
