import { Intel8085 } from '../src/core/cpu8085.ts';
import { Assembler8085 } from '../src/core/assembler.ts';

function runStepBackTests() {
  console.log('===============================================================');
  console.log('TEST SUITE: Step Back (Undo), Memory Rollback & Breakpoints');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, desc: string) {
    if (cond) {
      console.log(`✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  const assembler = new Assembler8085();

  // Test 1: Step Back restores registers and arithmetic flags
  {
    const cpu = new Intel8085();
    const code = `
      .org 0100H
      MVI A, 10H
      ADI 20H
      HLT
    `;
    const res = assembler.assemble(code);
    cpu.memory.set(res.memory);
    cpu.regs.pc = 0x0100;

    cpu.step(); // executes MVI A, 10H
    assert(cpu.regs.a === 0x10, 'A = 10H after MVI');

    cpu.step(); // executes ADI 20H -> A = 30H
    assert(cpu.regs.a === 0x30, 'A = 30H after ADI');

    // Step Back
    const ok = cpu.stepBack();
    assert(ok === true, 'stepBack returned true');
    assert(cpu.regs.a === 0x10, 'A restored to 10H after stepBack');
    assert(cpu.regs.pc === 0x0102, 'PC restored to ADI instruction (0102H)');

    // Step Back again
    cpu.stepBack();
    assert(cpu.regs.a === 0x00, 'A restored to 00H after 2nd stepBack');
    assert(cpu.regs.pc === 0x0100, 'PC restored to start (0100H)');
  }

  // Test 2: Step Back rolls back memory writes (STA, MOV M, A)
  {
    const cpu = new Intel8085();
    const code = `
      .org 0100H
      MVI A, 42H
      STA 0800H
      HLT
    `;
    const res = assembler.assemble(code);
    cpu.memory.set(res.memory);
    cpu.regs.pc = 0x0100;
    cpu.memory[0x0800] = 0x00;

    cpu.step(); // MVI A, 42H
    cpu.step(); // STA 0800H

    assert(cpu.readByte(0x0800) === 0x42, 'RAM at 0800H is 42H after STA');

    cpu.stepBack(); // Undo STA
    assert(cpu.readByte(0x0800) === 0x00, 'RAM at 0800H reverted back to 00H');
    assert(cpu.regs.pc === 0x0102, 'PC reverted to STA instruction address');
  }

  // Test 3: Step Back across PUSH and POP restores SP
  {
    const cpu = new Intel8085();
    const code = `
      .org 0100H
      LXI B, 1234H
      PUSH B
      POP D
      HLT
    `;
    const res = assembler.assemble(code);
    cpu.memory.set(res.memory);
    cpu.regs.pc = 0x0100;
    cpu.regs.sp = 0xFFFF;

    cpu.step(); // LXI B, 1234H
    cpu.step(); // PUSH B -> SP should be FFFDH
    assert(cpu.regs.sp === 0xFFFD, 'SP is FFFDH after PUSH B');

    cpu.stepBack(); // Undo PUSH B
    assert(cpu.regs.sp === 0xFFFF, 'SP restored to FFFFH after stepBack');
  }

  // Test 4: Breakpoints set & query
  {
    const cpu = new Intel8085();
    assert(!cpu.hasBreakpoint(0x0150), 'No initial breakpoint at 0150H');

    cpu.toggleBreakpoint(0x0150);
    assert(cpu.hasBreakpoint(0x0150), 'Breakpoint active at 0150H');

    cpu.toggleBreakpoint(0x0150);
    assert(!cpu.hasBreakpoint(0x0150), 'Breakpoint cleared after 2nd toggle');
  }

  console.log('===============================================================');
  console.log(`STEP BACK TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) process.exit(1);
}

runStepBackTests();
