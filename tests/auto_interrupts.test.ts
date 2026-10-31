import assert from 'assert';
import { Intel8085 } from '../src/core/cpu8085.js';
import { PeripheralsManager } from '../src/core/peripherals.js';

console.log('===============================================================');
console.log('TEST SUITE: Auto-Interrupts & PSW Flags Consistency');
console.log('===============================================================');

// 0. Verify initial defaults are ALL "no"
const initCpu = new Intel8085();
const initPerifs = new PeripheralsManager(initCpu);
assert.strictEqual(initPerifs.state.autoInterrupts.trap.mode, 'no', 'TRAP must default to "no"');
assert.strictEqual(initPerifs.state.autoInterrupts.rst75.mode, 'no', 'RST 7.5 must default to "no"');
assert.strictEqual(initPerifs.state.autoInterrupts.rst65.mode, 'no', 'RST 6.5 must default to "no"');
assert.strictEqual(initPerifs.state.autoInterrupts.rst55.mode, 'no', 'RST 5.5 must default to "no"');
assert.strictEqual(initPerifs.state.keyboardInterruptType, 'NONE', 'Keyboard interrupt type must default to "NONE"');
assert.strictEqual(initCpu.interrupts.mask75, false, 'Mask 7.5 must be false (unmasked) by default');
assert.strictEqual(initCpu.interrupts.mask65, false, 'Mask 6.5 must be false (unmasked) by default');
assert.strictEqual(initCpu.interrupts.mask55, false, 'Mask 5.5 must be false (unmasked) by default');
console.log('✅ [PASS] All interrupts default to NO and masks are unmasked (matching 8085sim)');

// 1. PSW Bit-by-bit match
const cpu = new Intel8085();
const perifs = new PeripheralsManager(cpu);

// Set flags S=1, Z=0, AC=1, P=1, CY=1
cpu.flags.s = true;
cpu.flags.z = false;
cpu.flags.ac = true;
cpu.flags.p = true;
cpu.flags.cy = true;

const psw = cpu.getPSW();
assert.strictEqual(psw, 0x95, `Expected PSW to be 95H (matching 8085sim), got ${psw.toString(16).toUpperCase()}H`);
assert.strictEqual((psw & 0x02), 0, 'Bit 1 must be 0 in 8085sim matching LED off');
assert.strictEqual((psw & 0x08), 0, 'Bit 3 must be 0 in 8085sim matching LED off');
assert.strictEqual((psw & 0x20), 0, 'Bit 5 must be 0 in 8085sim matching LED off');
console.log('✅ [PASS] PSW is 95H and unused bits (5, 3, 1) are 0 matching LEDs 100%');

// 2. TRAP on invalid instruction
perifs.setAutoInterrupts({
  trap: { mode: 'invalid_inst', timerMs: 0 },
  rst75: { mode: 'no', timerMs: 0 },
  rst65: { mode: 'no', timerMs: 0 },
  rst55: { mode: 'no', timerMs: 0 }
});

cpu.regs.pc = 0x0100;
cpu.memory[0x0100] = 0x08; // 08H is an illegal/undefined opcode in Intel 8085

assert.strictEqual(cpu.interrupts.trap, false, 'TRAP must be false before execution');
cpu.step();
assert.strictEqual(cpu.interrupts.trap, true, 'TRAP must be true after executing invalid opcode 08H');
console.log('✅ [PASS] TRAP triggered on invalid opcode (08H)');

// 3. Keyboard interrupt configuration
perifs.setAutoInterrupts({
  trap: { mode: 'no', timerMs: 0 },
  rst75: { mode: 'keyboard', timerMs: 0 }, // Configure keyboard on RST 7.5
  rst65: { mode: 'no', timerMs: 0 },
  rst55: { mode: 'no', timerMs: 0 }
});

cpu.interrupts.rst75 = false;
perifs.pressKey('A');
assert.strictEqual(cpu.interrupts.rst75, true, 'RST 7.5 must be triggered by keypress when configured for keyboard');
console.log('✅ [PASS] Keypress dynamically triggered RST 7.5');

// 4. Switching interrupt type dynamically (e.g. from 7.5 to 5.5) must NOT fire 7.5
cpu.interrupts.rst75 = false;
cpu.interrupts.rst55 = false;
perifs.setKeyboardInterrupt('5.5');
perifs.pressKey('B');
assert.strictEqual(cpu.interrupts.rst55, true, 'RST 5.5 must trigger when switched to 5.5');
assert.strictEqual(cpu.interrupts.rst75, false, 'RST 7.5 must NOT trigger when keyboard is set to 5.5');
console.log('✅ [PASS] Switching from 7.5 to 5.5 strictly triggers ONLY 5.5 without ghost 7.5 interrupts');

// 4.5. NOP-Slide Prevention: Unhandled vector must NOT slide into adjacent vector
const slideCpu = new Intel8085();
slideCpu.interrupts.inte = true;
// Define ISR only at 003CH (RST 7.5)
slideCpu.memory[0x003C] = 0x3E; // MVI A, 99H
slideCpu.memory[0x003D] = 0x99;
slideCpu.memory[0x003E] = 0xC9; // RET
// 0034H (RST 6.5) and 002CH (RST 5.5) are empty (00H)
slideCpu.regs.pc = 0x0100;
slideCpu.interrupts.rst65 = true; // Trigger 6.5
const accepted65 = slideCpu.checkInterrupts();
assert.strictEqual(accepted65, false, 'Unhandled RST 6.5 (vector 0034H = 00H) must NOT accept/jump');
assert.strictEqual(slideCpu.regs.pc, 0x0100, 'PC must stay at 0100H, preventing NOP-slide into 003CH');
console.log('✅ [PASS] Unhandled vectors (6.5 / 5.5) safely prevent NOP-slide into 003CH');

// 5. Execution of ISRs for all 4 interrupt vectors (TRAP, RST 7.5, RST 6.5, RST 5.5)
const testVectors = [
  { name: 'TRAP', vector: 0x0024, trigger: () => { cpu.interrupts.trap = true; }, needsEI: false },
  { name: 'RST 7.5', vector: 0x003C, trigger: () => { cpu.interrupts.rst75 = true; }, needsEI: true },
  { name: 'RST 6.5', vector: 0x0034, trigger: () => { cpu.interrupts.rst65 = true; }, needsEI: true },
  { name: 'RST 5.5', vector: 0x002C, trigger: () => { cpu.interrupts.rst55 = true; }, needsEI: true },
];

for (const tv of testVectors) {
  cpu.reset();
  if (tv.needsEI) cpu.interrupts.inte = true;

  // Infinite loop at 0100H: JMP 0100H
  cpu.memory[0x0100] = 0xC3;
  cpu.memory[0x0101] = 0x00;
  cpu.memory[0x0102] = 0x01;
  cpu.regs.pc = 0x0100;

  // ISR at vector: MVI A, 77H; RET
  cpu.memory[tv.vector] = 0x3E;
  cpu.memory[tv.vector + 1] = 0x77;
  cpu.memory[tv.vector + 2] = 0xC9;

  tv.trigger();
  cpu.step(); // Acknowledge interrupt and jump to vector
  assert.strictEqual(cpu.regs.pc, tv.vector, `${tv.name} must jump to vector 0x${tv.vector.toString(16).toUpperCase()}`);
  cpu.step(); // MVI A, 77H
  assert.strictEqual(cpu.regs.a, 0x77, `${tv.name} ISR must execute instructions`);
  cpu.step(); // RET
  assert.strictEqual(cpu.regs.pc, 0x0100, `${tv.name} ISR must return cleanly to interrupted code`);
  console.log(`✅ [PASS] ${tv.name} vector (0x${tv.vector.toString(16).padStart(4, '0').toUpperCase()}H) executed and returned cleanly`);
}

// 4. Timer interrupt test
perifs.setAutoInterrupts({
  trap: { mode: 'no', timerMs: 0 },
  rst75: { mode: 'no', timerMs: 0 },
  rst65: { mode: 'timer', timerMs: 25 }, // Fast timer for test
  rst55: { mode: 'no', timerMs: 0 }
});

cpu.interrupts.rst65 = false;
setTimeout(() => {
  assert.strictEqual(cpu.interrupts.rst65, true, 'RST 6.5 must be triggered by timer');
  perifs.stopAllTimers();
  console.log('✅ [PASS] Timer interrupt fired RST 6.5 at configured millisecond interval');
  console.log('===============================================================');
  console.log('ALL AUTO-INTERRUPT TESTS PASSED (4/4)!');
  console.log('===============================================================');
}, 60);
