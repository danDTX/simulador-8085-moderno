import { Intel8085 } from '../src/core/cpu8085.ts';
import { Assembler8085 } from '../src/core/assembler.ts';

function runStepOverTests() {
  console.log('===============================================================');
  console.log('TEST SUITE: Step Over Subroutines & Breakpoint Halting');
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

  // Helper simulating the Step Over logic implemented in main.ts
  function stepOver(cpu: Intel8085): void {
    if (cpu.halted) return;
    const pc = cpu.regs.pc;
    const op = cpu.readByte(pc);

    let isCall = false;
    let willBranch = false;

    if (op === 0xCD) { isCall = true; willBranch = true; }
    else if (op === 0xCC) { isCall = true; willBranch = cpu.flags.z; }
    else if (op === 0xC4) { isCall = true; willBranch = !cpu.flags.z; }
    else if (op === 0xDC) { isCall = true; willBranch = cpu.flags.cy; }
    else if (op === 0xD4) { isCall = true; willBranch = !cpu.flags.cy; }
    else if (op === 0xEC) { isCall = true; willBranch = cpu.flags.p; }
    else if (op === 0xE4) { isCall = true; willBranch = !cpu.flags.p; }
    else if (op === 0xF4) { isCall = true; willBranch = !cpu.flags.s; }
    else if (op === 0xFA) { isCall = true; willBranch = cpu.flags.s; }

    if (!isCall || !willBranch) {
      cpu.step();
      return;
    }

    const returnAddr = (pc + 3) & 0xffff;
    const maxCycles = 100000;
    let executed = 0;

    cpu.step(); // execute CALL
    executed++;

    while (cpu.regs.pc !== returnAddr && !cpu.halted && executed < maxCycles) {
      if (cpu.hasBreakpoint(cpu.regs.pc)) {
        break;
      }
      cpu.step();
      executed++;
    }
  }

  // Test 1: Step Over jumps completely over a subroutine with 50 iterations
  {
    const cpu = new Intel8085();
    const code = `
      .org 0100H
      CALL MI_SUBRUTINA
      MVI A, 99H
      HLT

      MI_SUBRUTINA:
          MVI B, 32H   ; 50 decimal
      BUCLE:
          DCR B
          JNZ BUCLE
          RET
    `;
    const res = assembler.assemble(code);
    cpu.memory.set(res.memory);
    cpu.regs.pc = 0x0100;

    // A single stepOver call should finish the 50-cycle subroutine and arrive at MVI A, 99H (0103H)
    stepOver(cpu);

    assert(cpu.regs.pc === 0x0103, 'PC reached instruction right after CALL (0103H)');
    assert(cpu.regs.b === 0x00, 'Subroutine finished its 50 iterations (B=0)');

    cpu.step(); // MVI A, 99H
    assert(cpu.regs.a === 0x99, 'A is 99H after MVI');
  }

  // Test 2: Step Over stops if internal breakpoint inside subroutine is hit
  {
    const cpu = new Intel8085();
    const code = `
      .org 0100H
      CALL SUB_TEST
      MVI A, 55H
      HLT

      SUB_TEST:
          MVI C, 10H
          MVI D, 20H
          RET
    `;
    const res = assembler.assemble(code);
    cpu.memory.set(res.memory);
    cpu.regs.pc = 0x0100;

    // Set breakpoint on MVI D, 20H
    // Address of SUB_TEST is 0106H (CALL is 3 bytes, MVI A is 2 bytes, HLT is 1 byte -> 0100..0105)
    // MVI C, 10H is at 0106H (2 bytes), so MVI D is at 0108H
    const bpAddr = res.symbolTable.get('SUB_TEST')! + 2;
    cpu.toggleBreakpoint(bpAddr);

    stepOver(cpu);

    assert(cpu.regs.pc === bpAddr, 'Step Over safely stopped inside subroutine at breakpoint');
    assert(cpu.regs.c === 0x10, 'First instruction executed before breakpoint (C=10H)');
    assert(cpu.regs.d === 0x00, 'Breakpoint instruction not yet executed (D=00H)');
  }

  console.log('===============================================================');
  console.log(`STEP OVER TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) process.exit(1);
}

runStepOverTests();
