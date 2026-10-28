import { Intel8085 } from './cpu8085.js';
import { Disassembler8085 } from './disassembler.js';

export interface TraceRowChanged {
  a: boolean;
  b: boolean;
  c: boolean;
  d: boolean;
  e: boolean;
  h: boolean;
  l: boolean;
  m: boolean;
  sp: boolean;
  pc: boolean;
  z: boolean;
  s: boolean;
  ac: boolean;
  cy: boolean;
  p: boolean;
}

export interface TraceRow {
  stepIndex: number;
  code: string;
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  h: number;
  l: number;
  m: number;
  sp: number;
  pc: number;
  z: number;
  s: number;
  ac: number;
  cy: number;
  p: number;
  changed: TraceRowChanged;
  isInitial?: boolean;
  isHalt?: boolean;
}

export interface TraceOptions {
  cpu: Intel8085;
  startPc?: number;
  skipInitialNops?: boolean;
  maxSteps?: number;
  useHexZero?: boolean;
}

export interface TraceResult {
  rows: TraceRow[];
  actualStartPc: number;
  halted: boolean;
  reason: string;
  totalSteps: number;
}

/**
 * Searches memory for the first non-zero byte address starting from startAddr.
 */
export function findFirstExecutableAddress(memory: Uint8Array, startAddr: number = 0): number {
  const norm = startAddr & 0xffff;
  if (memory[norm] !== 0x00) return norm;

  for (let addr = norm; addr <= 0xffff; addr++) {
    if (memory[addr] !== 0x00) {
      return addr;
    }
  }
  return norm;
}

/**
 * Formats a register value. If val is 0 and useHexZero is false, returns '0'.
 * Otherwise returns hex string (e.g. '03H', 'E2H', '0300H').
 */
export function formatRegVal(val: number, is16Bit: boolean = false, useHexZero: boolean = false): string {
  if (val === 0 && !useHexZero) {
    return '0';
  }
  const hex = val.toString(16).toUpperCase();
  if (is16Bit) {
    return hex.padStart(4, '0') + 'H';
  }
  return hex.padStart(2, '0') + 'H';
}

/**
 * Runs a background simulation to generate a step-by-step trace table.
 */
export function generateExecutionTrace(options: TraceOptions): TraceResult {
  const maxSteps = Math.max(1, Math.min(options.maxSteps ?? 1000, 50000));
  let startPc = (options.startPc ?? 0x0000) & 0xffff;

  if (options.skipInitialNops && options.cpu.memory[startPc] === 0x00) {
    startPc = findFirstExecutableAddress(options.cpu.memory, startPc);
  }

  // Clone CPU to keep the active user session completely safe and untouched
  const sim = new Intel8085();
  sim.memory.set(options.cpu.memory);
  sim.regs = {
    a: 0,
    b: 0,
    c: 0,
    d: 0,
    e: 0,
    h: 0,
    l: 0,
    sp: 0xffff,
    pc: startPc
  };
  sim.flags = { s: false, z: false, ac: false, p: false, cy: false };
  sim.recordHistory = false;

  // Route port inputs from current simulator hardware state if configured
  if (options.cpu.onPortRead) {
    sim.onPortRead = options.cpu.onPortRead;
  }

  const rows: TraceRow[] = [];

  // Fila 0: Estado Inicial
  const initialM = sim.memory[(sim.regs.h << 8) | sim.regs.l];
  rows.push({
    stepIndex: 0,
    code: '',
    a: sim.regs.a,
    b: sim.regs.b,
    c: sim.regs.c,
    d: sim.regs.d,
    e: sim.regs.e,
    h: sim.regs.h,
    l: sim.regs.l,
    m: initialM,
    sp: sim.regs.sp,
    pc: sim.regs.pc,
    z: sim.flags.z ? 1 : 0,
    s: sim.flags.s ? 1 : 0,
    ac: sim.flags.ac ? 1 : 0,
    cy: sim.flags.cy ? 1 : 0,
    p: sim.flags.p ? 1 : 0,
    changed: {
      a: false, b: false, c: false, d: false, e: false, h: false, l: false,
      m: false, sp: false, pc: false, z: false, s: false, ac: false, cy: false, p: false
    },
    isInitial: true
  });

  let stepCount = 0;
  let reason = '';

  while (stepCount < maxSteps) {
    const currentPc = sim.regs.pc;
    const op = sim.memory[currentPc];

    // Detect HLT before or on execution
    if (op === 0x76) {
      const prevM = sim.memory[(sim.regs.h << 8) | sim.regs.l];
      rows.push({
        stepIndex: stepCount + 1,
        code: 'HLT',
        a: sim.regs.a,
        b: sim.regs.b,
        c: sim.regs.c,
        d: sim.regs.d,
        e: sim.regs.e,
        h: sim.regs.h,
        l: sim.regs.l,
        m: prevM,
        sp: sim.regs.sp,
        pc: (currentPc + 1) & 0xffff,
        z: sim.flags.z ? 1 : 0,
        s: sim.flags.s ? 1 : 0,
        ac: sim.flags.ac ? 1 : 0,
        cy: sim.flags.cy ? 1 : 0,
        p: sim.flags.p ? 1 : 0,
        changed: {
          a: false, b: false, c: false, d: false, e: false, h: false, l: false,
          m: false, sp: false, pc: false, z: false, s: false, ac: false, cy: false, p: false
        },
        isHalt: true
      });
      reason = 'Ejecución completada: HLT alcanzado normalmente.';
      break;
    }

    const disasm = Disassembler8085.disassemble(sim.memory, currentPc);
    const mnemonic = disasm.mnemonic;

    const prevRegs = { ...sim.regs };
    const prevFlags = { ...sim.flags };
    const prevM = sim.memory[(prevRegs.h << 8) | prevRegs.l];

    sim.step();
    stepCount++;

    const newM = sim.memory[(sim.regs.h << 8) | sim.regs.l];

    const changed: TraceRowChanged = {
      a: sim.regs.a !== prevRegs.a,
      b: sim.regs.b !== prevRegs.b,
      c: sim.regs.c !== prevRegs.c,
      d: sim.regs.d !== prevRegs.d,
      e: sim.regs.e !== prevRegs.e,
      h: sim.regs.h !== prevRegs.h,
      l: sim.regs.l !== prevRegs.l,
      m: newM !== prevM,
      sp: sim.regs.sp !== prevRegs.sp,
      pc: false,
      z: sim.flags.z !== prevFlags.z,
      s: sim.flags.s !== prevFlags.s,
      ac: sim.flags.ac !== prevFlags.ac,
      cy: sim.flags.cy !== prevFlags.cy,
      p: sim.flags.p !== prevFlags.p
    };

    rows.push({
      stepIndex: stepCount,
      code: mnemonic,
      a: sim.regs.a,
      b: sim.regs.b,
      c: sim.regs.c,
      d: sim.regs.d,
      e: sim.regs.e,
      h: sim.regs.h,
      l: sim.regs.l,
      m: newM,
      sp: sim.regs.sp,
      pc: sim.regs.pc,
      z: sim.flags.z ? 1 : 0,
      s: sim.flags.s ? 1 : 0,
      ac: sim.flags.ac ? 1 : 0,
      cy: sim.flags.cy ? 1 : 0,
      p: sim.flags.p ? 1 : 0,
      changed
    });

    if (sim.halted) {
      reason = 'Ejecución detenida por HALT del procesador.';
      break;
    }
  }

  if (stepCount >= maxSteps && !reason) {
    reason = `Límite alcanzado (${maxSteps} instrucciones). Programa en bucle continuo o pendiente de HLT.`;
  }

  return {
    rows,
    actualStartPc: startPc,
    halted: rows.some(r => r.isHalt) || sim.halted,
    reason,
    totalSteps: stepCount
  };
}

const HEADERS = ['CODIGO', 'A', 'B', 'C', 'D', 'E', 'H', 'L', 'M', 'SP', 'PC', 'Z', 'S', 'AC', 'CY', 'P'];

/**
 * Generates TSV text for pasting into Excel / Google Sheets with Ctrl+V.
 */
export function generateTSV(rows: TraceRow[], useHexZero: boolean = false): string {
  const lines: string[] = [HEADERS.join('\t')];

  for (const r of rows) {
    if (r.isHalt) {
      lines.push([r.code, 'HLT', 'HLT', 'HLT', 'HLT', 'HLT', 'HLT', 'HLT', 'HLT', 'HLT', formatRegVal(r.pc, true, useHexZero), r.z, r.s, r.ac, r.cy, r.p].join('\t'));
      continue;
    }
    const cols = [
      r.code,
      formatRegVal(r.a, false, useHexZero),
      formatRegVal(r.b, false, useHexZero),
      formatRegVal(r.c, false, useHexZero),
      formatRegVal(r.d, false, useHexZero),
      formatRegVal(r.e, false, useHexZero),
      formatRegVal(r.h, false, useHexZero),
      formatRegVal(r.l, false, useHexZero),
      formatRegVal(r.m, false, useHexZero),
      formatRegVal(r.sp, true, useHexZero),
      formatRegVal(r.pc, true, useHexZero),
      r.z,
      r.s,
      r.ac,
      r.cy,
      r.p
    ];
    lines.push(cols.join('\t'));
  }

  return lines.join('\n');
}

/**
 * Generates CSV text.
 */
export function generateCSV(rows: TraceRow[], useHexZero: boolean = false, delimiter: string = ','): string {
  const lines: string[] = [HEADERS.join(delimiter)];

  for (const r of rows) {
    if (r.isHalt) {
      lines.push([`"${r.code}"`, 'HLT', 'HLT', 'HLT', 'HLT', 'HLT', 'HLT', 'HLT', 'HLT', 'HLT', `"${formatRegVal(r.pc, true, useHexZero)}"`, r.z, r.s, r.ac, r.cy, r.p].join(delimiter));
      continue;
    }
    const cols = [
      `"${r.code}"`,
      formatRegVal(r.a, false, useHexZero),
      formatRegVal(r.b, false, useHexZero),
      formatRegVal(r.c, false, useHexZero),
      formatRegVal(r.d, false, useHexZero),
      formatRegVal(r.e, false, useHexZero),
      formatRegVal(r.h, false, useHexZero),
      formatRegVal(r.l, false, useHexZero),
      formatRegVal(r.m, false, useHexZero),
      formatRegVal(r.sp, true, useHexZero),
      formatRegVal(r.pc, true, useHexZero),
      r.z,
      r.s,
      r.ac,
      r.cy,
      r.p
    ];
    lines.push(cols.join(delimiter));
  }

  return lines.join('\n');
}

/**
 * Generates a styled HTML table with green alternating rows and bright red highlights
 * compatible with MS Excel, LibreOffice Calc, and Google Sheets.
 */
export function generateStyledHTMLTable(rows: TraceRow[], useHexZero: boolean = false): string {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; margin: 0; }
    table { border-collapse: collapse; width: 100%; border: 1px solid #70ad47; }
    th { background-color: #548235; color: #ffffff; font-weight: bold; border: 1px solid #385723; padding: 6px 10px; text-align: center; }
    td { border: 1px solid #c5e0b4; padding: 5px 8px; text-align: center; }
    .code-col { text-align: left; font-family: Consolas, monospace; font-weight: bold; }
    .row-even { background-color: #e2efda; }
    .row-odd { background-color: #ffffff; }
    .cell-changed { background-color: #c00000 !important; color: #ffffff !important; font-weight: bold; }
    .row-hlt td { background-color: #ff0000 !important; color: #ffffff !important; font-weight: bold; }
    .row-hlt td.code-col { background-color: #c00000 !important; }
  </style>
</head>
<body>
<table>
  <thead>
    <tr>
      ${HEADERS.map(h => `<th>${h}</th>`).join('')}
    </tr>
  </thead>
  <tbody>
`;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const isEven = i % 2 === 0;
    const rowClass = r.isHalt ? 'row-hlt' : (isEven ? 'row-even' : 'row-odd');

    if (r.isHalt) {
      html += `    <tr class="${rowClass}">
      <td class="code-col">HLT</td>
      <td colspan="15" style="background-color: #c00000; color: #ffffff; font-weight: bold; text-align: center;">--- PROCESADOR DETENIDO (HLT) ---</td>
    </tr>\n`;
      continue;
    }

    const c = r.changed;
    const td = (val: string, changed: boolean, extraClass: string = '') => {
      const cls = [extraClass, changed ? 'cell-changed' : ''].filter(Boolean).join(' ');
      const clsAttr = cls ? ` class="${cls}"` : '';
      return `<td${clsAttr}>${val}</td>`;
    };

    html += `    <tr class="${rowClass}">
      ${td(r.code, false, 'code-col')}
      ${td(formatRegVal(r.a, false, useHexZero), c.a)}
      ${td(formatRegVal(r.b, false, useHexZero), c.b)}
      ${td(formatRegVal(r.c, false, useHexZero), c.c)}
      ${td(formatRegVal(r.d, false, useHexZero), c.d)}
      ${td(formatRegVal(r.e, false, useHexZero), c.e)}
      ${td(formatRegVal(r.h, false, useHexZero), c.h)}
      ${td(formatRegVal(r.l, false, useHexZero), c.l)}
      ${td(formatRegVal(r.m, false, useHexZero), c.m)}
      ${td(formatRegVal(r.sp, true, useHexZero), c.sp)}
      ${td(formatRegVal(r.pc, true, useHexZero), c.pc)}
      ${td(String(r.z), c.z)}
      ${td(String(r.s), c.s)}
      ${td(String(r.ac), c.ac)}
      ${td(String(r.cy), c.cy)}
      ${td(String(r.p), c.p)}
    </tr>\n`;
  }

  html += `  </tbody>
</table>
</body>
</html>`;

  return html;
}
