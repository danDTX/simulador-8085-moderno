import { Intel8085 } from '../src/core/cpu8085.ts';
import { Assembler8085 } from '../src/core/assembler.ts';
import { PeripheralsManager } from '../src/core/peripherals.ts';

function runCpuTests() {
  console.log('===============================================================');
  console.log('TEST SUITE: CPU 8085 Execution, Flags, Logic & Peripherals');
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

  // Test 1: Arithmetic & Flags (ADD, SUB, AC, CY, Z, S, P)
  {
    const cpu = new Intel8085();
    const code = `
      .org 0100H
      MVI A, 38H
      ADI 29H        ; 38H + 29H = 61H, AC should be 1 (8+9=17 > 15)
      HLT
    `;
    const res = assembler.assemble(code);
    cpu.memory.set(res.memory);
    cpu.regs.pc = 0x0100;
    while (!cpu.halted) cpu.step();

    assert(cpu.regs.a === 0x61, 'ADI 38H + 29H = 61H');
    assert(cpu.flags.ac === true, 'Auxiliary Carry (AC) set after 8+9');
    assert(cpu.flags.cy === false, 'Carry (CY) is 0');
  }

  // Test 2: Subtraction and Borrow
  {
    const cpu = new Intel8085();
    const code = `
      .org 0100H
      MVI A, 28H
      SUI 45H        ; 28H - 45H = E3H, Carry/Borrow should be 1
      HLT
    `;
    const res = assembler.assemble(code);
    cpu.memory.set(res.memory);
    cpu.regs.pc = 0x0100;
    while (!cpu.halted) cpu.step();

    assert(cpu.regs.a === 0xE3, 'SUI 28H - 45H = E3H');
    assert(cpu.flags.cy === true, 'Carry (CY/Borrow) set on negative result');
    assert(cpu.flags.s === true, 'Sign (S) flag set');
  }

  // Test 3: DAA (Decimal Adjust Accumulator)
  {
    const cpu = new Intel8085();
    const code = `
      .org 0100H
      MVI A, 38H
      ADI 45H        ; 38H + 45H = 7DH
      DAA            ; BCD adjust: 38 + 45 = 83 BCD (83H)
      HLT
    `;
    const res = assembler.assemble(code);
    cpu.memory.set(res.memory);
    cpu.regs.pc = 0x0100;
    while (!cpu.halted) cpu.step();

    assert(cpu.regs.a === 0x83, 'DAA produces correct BCD 83H');
  }

  // Test 4: Rotations (RLC, RRC)
  {
    const cpu = new Intel8085();
    const code = `
      .org 0100H
      MVI A, 81H
      RLC            ; 81H (10000001b) rotated left -> 03H, CY = 1
      HLT
    `;
    const res = assembler.assemble(code);
    cpu.memory.set(res.memory);
    cpu.regs.pc = 0x0100;
    while (!cpu.halted) cpu.step();

    assert(cpu.regs.a === 0x03, 'RLC rotates bit 7 into bit 0');
    assert(cpu.flags.cy === true, 'RLC sets CY from bit 7');
  }

  // Test 5: Stack & Subroutines (CALL, RET, PUSH, POP, PSW)
  {
    const cpu = new Intel8085();
    const code = `
      .org 0100H
      LXI SP, 0200H
      MVI A, 55H
      CALL SUBR
      HLT

      SUBR:
      INR A
      RET
    `;
    const res = assembler.assemble(code);
    cpu.memory.set(res.memory);
    cpu.regs.pc = 0x0100;
    while (!cpu.halted) cpu.step();

    assert(cpu.regs.a === 0x56, 'CALL & RET executes subroutine and returns');
    assert(cpu.regs.sp === 0x0200, 'SP restored to original location after RET');
  }

  // Test 6: Peripherals (DIP Switches IN 00H -> LEDs OUT 01H -> Displays OUT 02H)
  {
    const cpu = new Intel8085();
    const perifs = new PeripheralsManager(cpu);

    perifs.setDipSwitchesByte(0xA5); // Set switches to 10100101b

    const code = `
      .org 0100H
      IN 00H         ; Read switches (should get 0A5H)
      OUT 01H        ; Write LEDs (should turn on LEDs for 0A5H)
      MVI A, 77H     ; Code for '0' on display
      OUT 02H        ; Write Display 0
      HLT
    `;
    const res = assembler.assemble(code);
    cpu.memory.set(res.memory);
    cpu.regs.pc = 0x0100;
    while (!cpu.halted) cpu.step();

    assert(cpu.regs.a === 0x77, 'Acc holds 77H after display write');
    assert(perifs.state.leds === 0xA5, 'LEDs received 0A5H from DIP switches');
    assert(perifs.state.displays7[0] === 0x77, 'Display 0 received 77H');
  }

  // Test 7: Interrupts (RST 6.5 vector execution)
  {
    const cpu = new Intel8085();
    const code = `
      .org 0000H
      JMP MAIN

      .org 0034H     ; RST 6.5 Vector
      MVI B, 99H
      EI
      RET

      .org 0100H
      MAIN:
      LXI SP, 0300H
      MVI A, 08H     ; MSE=1 (bit 3), masks=0 (unmask all)
      SIM
      EI
      NOP
      NOP
      HLT
    `;
    const res = assembler.assemble(code);
    cpu.memory.set(res.memory);
    cpu.regs.pc = 0x0000;

    // Run until MAIN sets up SIM and EI
    for (let i = 0; i < 5; i++) cpu.step();

    // Trigger RST 6.5 interrupt
    cpu.interrupts.rst65 = true;

    // Step through ISR and back to HLT
    while (!cpu.halted && cpu.totalCycles < 500) {
      cpu.step();
    }

    assert(cpu.regs.b === 0x99, 'RST 6.5 ISR executed and set B=99H');
  }

  console.log('===============================================================');
  console.log(`CPU TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) process.exit(1);
}

runCpuTests();
