import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Intel8085 } from '../src/core/cpu8085';
import { Assembler8085 } from '../src/core/assembler';

describe('Fase 2 - Atajos, Step Over y Ciclo de Vida', () => {
  const assembler = new Assembler8085();

  it('Step Over ejecuta una subrutina completa (CALL/RET) y se detiene en la siguiente instrucción', () => {
    const asm = `
      .org 0100H
      MVI A, 05H
      CALL SUBR
      INR A
      HLT

      SUBR:
      INR A
      INR A
      RET
    `;
    const res = assembler.assemble(asm);
    const errors = res.diagnostics.filter(d => d.isError);
    assert.equal(errors.length, 0);

    const cpu = new Intel8085();
    cpu.memory.set(res.memory);
    cpu.regs.pc = 0x0100;

    // Ejecutar MVI A, 05H
    cpu.step();
    assert.equal(cpu.regs.a, 5);
    assert.equal(cpu.regs.pc, 0x0102); // Dirección del CALL SUBR

    // Simular stepOver tal como lo hace main.ts
    const initialSp = cpu.regs.sp;
    let cycles = 0;
    const maxSteps = 10000;
    cpu.recordHistory = false; // evitar saturar historial
    while (cycles < maxSteps) {
      cpu.step();
      cycles++;
      if (cpu.regs.sp >= initialSp || cpu.halted) {
        break;
      }
    }
    cpu.recordHistory = true;

    // Debe haber ejecutado SUBR completa (A = 5 + 1 + 1 = 7) y regresado a 0x0105 (INR A)
    assert.equal(cpu.regs.a, 7);
    assert.equal(cpu.regs.pc, 0x0105);
    assert.equal(cpu.regs.sp, initialSp);

    // Siguiente paso normal
    cpu.step();
    assert.equal(cpu.regs.a, 8);
  });

  it('Step Over soporta llamadas condicionales (CM - Call on Minus)', () => {
    const asm = `
      .org 0100H
      MVI A, 80H    ; bit 7 = 1 (negativo)
      ORA A         ; actualiza flags (S=1)
      CM SUB_MINUS
      INR A
      HLT

      SUB_MINUS:
      ADI 05H
      RET
    `;
    const res = assembler.assemble(asm);
    const errors = res.diagnostics.filter(d => d.isError);
    assert.equal(errors.length, 0);

    const cpu = new Intel8085();
    cpu.memory.set(res.memory);
    cpu.regs.pc = 0x0100;

    cpu.step(); // MVI A, 80H
    cpu.step(); // ORA A -> S=1
    assert.equal(cpu.flags.s, true);

    // En 0x0104 está CM SUB_MINUS (0xFC)
    assert.equal(cpu.memory[cpu.regs.pc], 0xFC);

    const initialSp = cpu.regs.sp;
    let cycles = 0;
    while (cycles < 1000) {
      cpu.step();
      cycles++;
      if (cpu.regs.sp >= initialSp || cpu.halted) break;
    }

    // Regresó a 0x0106 (INR A) habiendo sumado 5 en SUB_MINUS (0x80 + 0x05 = 0x85)
    assert.equal(cpu.regs.a, 0x85);
    assert.equal(cpu.regs.pc, 0x0106);
  });

  it('clearHistory() reinicia correctamente la pila de Step Back', () => {
    const cpu = new Intel8085();
    cpu.recordHistory = true;
    cpu.memory[0x0100] = 0x3C; // INR A
    cpu.regs.pc = 0x0100;

    cpu.step();
    assert.equal(cpu.getHistoryLength() > 0, true);

    cpu.clearHistory();
    assert.equal(cpu.getHistoryLength(), 0);
    assert.equal(cpu.stepBack(), false);
  });
});
