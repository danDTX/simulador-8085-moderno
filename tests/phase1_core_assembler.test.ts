import { Intel8085 } from '../src/core/cpu8085';
import { Assembler8085 } from '../src/core/assembler';
import assert from 'assert';

console.log('===============================================================');
console.log('TEST SUITE: Phase 1 - Core CPU & Assembler Rigorous Edge Cases');
console.log('===============================================================');

const assembler = new Assembler8085();

// 1. Auxiliary Carry (AC) in Subtraction: 8085 physical two-complement ALU
// In 8085: AC = 1 indicates NO borrow between lower and upper nibble; AC = 0 indicates borrow.
{
  const cpu = new Intel8085();
  // 35H - 18H: 5 < 8 -> Requires borrow from upper nibble -> AC should be 0!
  const res1 = assembler.assemble(`
    .org 0100H
    MVI A, 35H
    SUI 18H
    HLT
  `);
  cpu.memory.set(res1.memory);
  cpu.regs.pc = 0x0100;
  while (!cpu.halted) cpu.step();
  assert.strictEqual(cpu.regs.a, 0x1D, '35H - 18H = 1DH');
  assert.strictEqual(cpu.flags.ac, false, 'AC is 0 when borrow occurs from upper nibble');
  assert.strictEqual(cpu.flags.cy, false, 'CY is 0 because result is positive');
  console.log('✅ [PASS] SUI 35H - 18H: AC is 0 (borrow from nibble)');

  // 18H - 35H: 8 >= 5 -> Lower nibble does NOT borrow -> AC should be 1!
  const res2 = assembler.assemble(`
    .org 0100H
    MVI A, 18H
    SUI 35H
    HLT
  `);
  cpu.reset();
  cpu.memory.set(res2.memory);
  cpu.regs.pc = 0x0100;
  while (!cpu.halted) cpu.step();
  assert.strictEqual(cpu.regs.a, 0xE3, '18H - 35H = E3H');
  assert.strictEqual(cpu.flags.ac, true, 'AC is 1 when no borrow occurs between nibbles');
  assert.strictEqual(cpu.flags.cy, true, 'CY is 1 on negative result');
  console.log('✅ [PASS] SUI 18H - 35H: AC is 1 (no borrow from nibble)');
}

// 2. DCR lower nibble borrow
{
  const cpu = new Intel8085();
  // DCR on 10H: lower nibble is 0 -> borrows -> AC should be 0!
  const res = assembler.assemble(`
    .org 0100H
    MVI B, 10H
    DCR B
    MVI C, 15H
    DCR C
    HLT
  `);
  cpu.memory.set(res.memory);
  cpu.regs.pc = 0x0100;
  cpu.step(); // MVI B
  cpu.step(); // DCR B
  assert.strictEqual(cpu.regs.b, 0x0F);
  assert.strictEqual(cpu.flags.ac, false, 'DCR 10H: AC is 0 (borrow occurred)');
  
  cpu.step(); // MVI C
  cpu.step(); // DCR C
  assert.strictEqual(cpu.regs.c, 0x14);
  assert.strictEqual(cpu.flags.ac, true, 'DCR 15H: AC is 1 (no borrow)');
  console.log('✅ [PASS] DCR AC flag conforms to 8085 physical polarity');
}

// 3. DAA resets AC when lower nibble does not carry
{
  const cpu = new Intel8085();
  const res = assembler.assemble(`
    .org 0100H
    MVI A, 12H
    ADI 34H        ; 12H + 34H = 46H (no AC carry, no CY)
    DAA
    HLT
  `);
  cpu.memory.set(res.memory);
  cpu.regs.pc = 0x0100;
  while (!cpu.halted) cpu.step();
  assert.strictEqual(cpu.regs.a, 0x46);
  assert.strictEqual(cpu.flags.ac, false, 'DAA keeps AC clean when no lower nibble carry');
  console.log('✅ [PASS] DAA clears AC when no lower nibble adjustment needed');
}

// 4. HLT cycles accumulation
{
  const cpu = new Intel8085();
  cpu.halted = true;
  cpu.totalCycles = 0;
  const cycles = cpu.step();
  assert.strictEqual(cycles, 4);
  assert.strictEqual(cpu.totalCycles, 4, 'HLT increments totalCycles by 4');
  console.log('✅ [PASS] HLT increments totalCycles by 4');
}

// 5. EI 1-instruction delay
{
  const cpu = new Intel8085();
  const res = assembler.assemble(`
    .org 0100H
    EI
    NOP
    HLT
  `);
  cpu.memory.set(res.memory);
  cpu.regs.pc = 0x0100;
  assert.strictEqual(cpu.interrupts.inte, false);
  cpu.step(); // EI
  assert.strictEqual(cpu.interrupts.inte, false, 'INTE is not enabled immediately during EI');
  cpu.step(); // NOP
  assert.strictEqual(cpu.interrupts.inte, true, 'INTE is enabled after the instruction following EI');
  console.log('✅ [PASS] EI 1-instruction delay verified');
}

// 6. Assembler: Strings with commas and semicolons
{
  const res = assembler.assemble(`
    .org 0100H
    MVI A, ';'
    DB "Hola, mundo; 8085"
    DB 'Prueba, con, comas'
    HLT
  `);
  assert.strictEqual(res.diagnostics.filter(d => d.isError).length, 0, 'No errors on strings with commas and semicolons');
  assert.strictEqual(res.memory[0x0101], ';'.charCodeAt(0));
  const textStr = String.fromCharCode(...res.memory.slice(0x0102, 0x0102 + 17));
  assert.strictEqual(textStr, "Hola, mundo; 8085");
  console.log('✅ [PASS] Assembler handles strings with commas and semicolons flawlessly');
}

// 7. Assembler: DS 0 and DS with expressions
{
  const res = assembler.assemble(`
    .define BLOQUE 4
    .org 0100H
    DS 0
    NOP
    DS BLOQUE + 2
    HLT
  `);
  assert.strictEqual(res.diagnostics.filter(d => d.isError).length, 0);
  // NOP at 0x0100 because DS 0 reserved 0 bytes
  assert.strictEqual(res.memory[0x0100], 0x00, 'NOP is at 0100H because DS 0 reserved 0 bytes');
  // HLT at 0x0101 + (4+2) = 0x0107
  assert.strictEqual(res.memory[0x0107], 0x76, 'HLT is at 0107H because DS BLOQUE+2 reserved 6 bytes');
  console.log('✅ [PASS] DS 0 and DS with expression calculation verified');
}

// 8. Assembler: Division by zero is caught, not silently 0
{
  const res = assembler.assemble(`
    .org 0100H
    MVI A, 10 / 0
    HLT
  `);
  const errors = res.diagnostics.filter(d => d.isError);
  assert.ok(errors.length > 0, 'Division by zero generates an assembly error');
  console.log('✅ [PASS] Division by zero generates explicit assembly error');
}

// 9. Assembler: Duplicate labels are caught
{
  const res = assembler.assemble(`
    .org 0100H
    BUCLE: NOP
    BUCLE: HLT
  `);
  const errors = res.diagnostics.filter(d => d.isError);
  assert.ok(errors.some(e => e.message.includes('Etiqueta duplicada')), 'Duplicate label caught');
  console.log('✅ [PASS] Duplicate labels caught with explicit error diagnostic');
}

// 10. PC wrap-around at 0xFFFF
{
  const cpu = new Intel8085();
  cpu.regs.pc = 0xFFFF;
  cpu.memory[0xFFFF] = 0x00; // NOP
  cpu.step();
  assert.strictEqual(cpu.regs.pc, 0x0000, 'PC wrapped safely from 0xFFFF to 0x0000');
  console.log('✅ [PASS] PC wrap-around at 0xFFFF verified');
}

console.log('===============================================================');
console.log('ALL PHASE 1 EDGE-CASE TESTS PASSED (100% CLEAN)!');
console.log('===============================================================');
