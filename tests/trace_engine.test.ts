import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Intel8085 } from '../src/core/cpu8085.js';
import { Assembler8085 } from '../src/core/assembler.js';
import { generateExecutionTrace, generateTSV, generateCSV, generateStyledHTMLTable, formatRegVal, findFirstExecutableAddress } from '../src/core/traceEngine.js';

describe('Prueba de Escritorio - Trace Engine Test Suite', () => {
  it('Simulates the user image program and verifies registers, flags and change highlights', () => {
    const code = `
      .org 0300H
      MVI A, 03H
      RLC
      RAR
      MVI E, 76H
      CMP E
      MOV B, A
      MOV H, B
      MOV L, H
      SUI 21H
      ANA L
      MOV C, L
      INR C
      HLT
    `;

    const assembler = new Assembler8085();
    const asm = assembler.assemble(code);
    assert.strictEqual(asm.success, true, 'Assembly should succeed');

    const cpu = new Intel8085();
    cpu.memory.set(asm.memory);

    const res = generateExecutionTrace({
      cpu,
      startPc: 0x0000,
      skipInitialNops: true,
      maxSteps: 50
    });

    assert.strictEqual(res.actualStartPc, 0x0300, 'Should auto-detect 0300H when 0000H is NOPs');
    assert.strictEqual(res.halted, true, 'Execution should reach HLT');

    const rows = res.rows;
    // Row 0 is Initial State
    assert.strictEqual(rows[0].stepIndex, 0);
    assert.strictEqual(rows[0].pc, 0x0300);
    assert.strictEqual(rows[0].a, 0);

    // Row 1: MVI A, 03H
    assert.strictEqual(rows[1].code, 'MVI A, 03H');
    assert.strictEqual(rows[1].a, 0x03);
    assert.strictEqual(rows[1].changed.a, true);

    // Row 2: RLC
    assert.strictEqual(rows[2].code, 'RLC');
    assert.strictEqual(rows[2].a, 0x06);
    assert.strictEqual(rows[2].changed.a, true);

    // Row 3: RAR
    assert.strictEqual(rows[3].code, 'RAR');
    assert.strictEqual(rows[3].a, 0x03);
    assert.strictEqual(rows[3].changed.a, true);

    // Row 4: MVI E, 76H
    assert.strictEqual(rows[4].code, 'MVI E, 76H');
    assert.strictEqual(rows[4].e, 0x76);
    assert.strictEqual(rows[4].changed.e, true);

    // Row 5: CMP E (A stays 03H, flags change)
    assert.strictEqual(rows[5].code, 'CMP E');
    assert.strictEqual(rows[5].a, 0x03);
    assert.strictEqual(rows[5].changed.a, false);
    assert.strictEqual(rows[5].cy, 1);
    assert.strictEqual(rows[5].changed.cy, true);

    // Row 9: SUI 21H -> A=E2H
    const suiRow = rows.find(r => r.code === 'SUI 21H');
    assert.ok(suiRow, 'SUI 21H row must exist');
    assert.strictEqual(suiRow.a, 0xE2);
    assert.strictEqual(suiRow.changed.a, true);

    // Row 10: ANA L -> A=02H
    const anaRow = rows.find(r => r.code === 'ANA L');
    assert.ok(anaRow, 'ANA L row must exist');
    assert.strictEqual(anaRow.a, 0x02);
    assert.strictEqual(anaRow.changed.a, true);

    // HLT row
    const hltRow = rows[rows.length - 1];
    assert.strictEqual(hltRow.code, 'HLT');
    assert.strictEqual(hltRow.isHalt, true);
  });

  it('Generates formatted TSV, CSV and styled HTML table properly', () => {
    const code = `
      .org 0100H
      MVI A, 42H
      HLT
    `;
    const assembler = new Assembler8085();
    const asm = assembler.assemble(code);
    const cpu = new Intel8085();
    cpu.memory.set(asm.memory);

    const res = generateExecutionTrace({ cpu, startPc: 0x0100, maxSteps: 10 });
    const tsv = generateTSV(res.rows);
    assert.ok(tsv.includes('CODIGO\tA\tB\tC\tD\tE\tH\tL\tM\tSP\tPC\tZ\tS\tAC\tCY\tP'));
    assert.ok(tsv.includes('MVI A, 42H\t42H\t0\t0\t0\t0\t0\t0\t0\tFFFFH\t0102H\t0\t0\t0\t0\t0'));

    const csv = generateCSV(res.rows);
    assert.ok(csv.includes('CODIGO,A,B,C,D,E,H,L,M,SP,PC,Z,S,AC,CY,P'));
    assert.ok(csv.includes('"MVI A, 42H",42H,0,0,0,0,0,0,0,FFFFH,0102H,0,0,0,0,0'));

    const html = generateStyledHTMLTable(res.rows);
    assert.ok(html.includes('<table'));
    assert.ok(html.includes('cell-changed'));
    assert.ok(html.includes('row-hlt'));
  });

  it('Respects safety step limit for infinite loops', () => {
    const code = `
      .org 0100H
      BUCLE:
      INR A
      JMP BUCLE
    `;
    const assembler = new Assembler8085();
    const asm = assembler.assemble(code);
    const cpu = new Intel8085();
    cpu.memory.set(asm.memory);

    const res = generateExecutionTrace({ cpu, startPc: 0x0100, maxSteps: 25 });
    assert.strictEqual(res.rows.length, 26, 'Should have initial row + 25 step rows');
    assert.strictEqual(res.halted, false, 'Should not be halted');
    assert.ok(res.reason.includes('Límite alcanzado'));
  });
});
