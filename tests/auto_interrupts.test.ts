import assert from 'assert';
import { Intel8085 } from '../src/core/cpu8085.js';
import { PeripheralsManager } from '../src/core/peripherals.js';

console.log('===============================================================');
console.log('TEST SUITE: Auto-Interrupts & PSW Flags Consistency');
console.log('===============================================================');

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
