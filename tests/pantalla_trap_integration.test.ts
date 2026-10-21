import fs from 'node:fs';
import { Intel8085 } from '../src/core/cpu8085.js';
import { Assembler8085 } from '../src/core/assembler.js';
import { PeripheralsManager } from '../src/core/peripherals.js';

console.log('===============================================================');
console.log('TEST SUITE: CRT Terminal + Keyboard TRAP Vector Integration');
console.log('===============================================================');

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${msg}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${msg}`);
}

const code = fs.readFileSync('public/examples/Pantalla.asm', 'utf8');
const asm = new Assembler8085();
const result = asm.assemble(code);

assert(result.success, 'Pantalla.asm assembles successfully');
assert(result.memory[0x0024] !== 0, 'TRAP vector at 0024H contains ISR code');

const cpu = new Intel8085();
const perifs = new PeripheralsManager(cpu);
perifs.attachToCpu();

// Auto-detect TRAP vector as implemented in main.ts
if (result.memory[0x0024] !== 0) {
  perifs.state.autoInterrupts.trap.mode = 'keyboard';
}

cpu.memory.set(result.memory);
cpu.regs.pc = result.entryPoint;

// Step until screen is cleared and infinite loop is reached
let cycles = 0;
while (!cpu.halted && cycles < 150000) {
  cycles += cpu.step();
  if (cpu.regs.pc === 0x1007) break;
}

assert(cpu.regs.pc === 0x1007, 'Reached waiting loop (REP: JMP REP) at PC 1007H');

// Simulate typing "HOLA"
const testString = 'HOLA';
for (const ch of testString) {
  perifs.pressKey(ch);
  // Give CPU enough cycles to service TRAP interrupt and store char in VRAM
  for (let i = 0; i < 200; i++) cpu.step();
  perifs.releaseKey();
  for (let i = 0; i < 200; i++) cpu.step();
}

let vramText = '';
for (let i = 0xE000; i < 0xE004; i++) {
  vramText += String.fromCharCode(cpu.memory[i]);
}

assert(vramText === 'HOLA', `VRAM at 0E000H correctly received typed characters: "${vramText}"`);
console.log('===============================================================');
console.log('ALL CRT TERMINAL + TRAP TESTS PASSED (4/4)!');
console.log('===============================================================');
