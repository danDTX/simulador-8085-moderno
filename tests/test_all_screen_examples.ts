import fs from 'node:fs';
import { Intel8085 } from '../src/core/cpu8085.js';
import { Assembler8085 } from '../src/core/assembler.js';
import { PeripheralsManager } from '../src/core/peripherals.js';

const asm = new Assembler8085();

function testFile(filePath: string, name: string) {
  console.log(`\n========================================`);
  console.log(`TESTING: ${name} (${filePath})`);
  console.log(`========================================`);

  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  const code = fs.readFileSync(filePath, 'utf8');
  const result = asm.assemble(code);
  console.log(`Assembly: ${result.success ? 'OK' : 'FAILED'}, Entry point: ${result.entryPoint.toString(16)}H`);
  if (!result.success) {
    console.log(`Diagnostics:`, result.diagnostics);
    return;
  }

  const cpu = new Intel8085();
  const perifs = new PeripheralsManager(cpu);
  cpu.memory.set(result.memory);
  cpu.regs.pc = result.entryPoint;

  // Auto-detect interrupt handlers
  const hasTrap = cpu.memory[0x0024] !== 0;
  const hasRst55 = cpu.memory[0x002C] !== 0 && cpu.memory[0x002D] !== 0;
  console.log(`Handler 0024H (TRAP): ${hasTrap}, Handler 002CH (RST 5.5): ${hasRst55}`);

  if (hasTrap && !hasRst55) {
    console.log(`Setting TRAP to keyboard!`);
    perifs.state.autoInterrupts.trap.mode = 'keyboard';
  } else if (hasRst55) {
    console.log(`Setting RST 5.5 to keyboard!`);
    perifs.state.autoInterrupts.rst55.mode = 'keyboard';
  }

  // Run up to 200,000 cycles
  let cycles = 0;
  while (!cpu.halted && cycles < 300000) {
    cycles += cpu.step();
  }
  console.log(`Cycles ran: ${cycles}, PC: ${cpu.regs.pc.toString(16)}H, Halted: ${cpu.halted}`);

  // Count printable characters in VRAM (0xE000 - 0xE3E7)
  let chars = 0;
  for (let i = 0xE000; i < 0xE3E8; i++) {
    const b = cpu.memory[i];
    if (b > 32 && b <= 126) chars++;
  }
  console.log(`Visible characters in VRAM after initial run: ${chars}`);

  // Simulate typing '1'
  console.log(`Injecting key '1'...`);
  perifs.pressKey('1');
  for (let i = 0; i < 2000; i++) {
    cpu.step();
  }
  perifs.releaseKey();
  for (let i = 0; i < 2000; i++) {
    cpu.step();
  }

  let charsAfterKey = 0;
  for (let i = 0xE000; i < 0xE3E8; i++) {
    const b = cpu.memory[i];
    if (b > 32 && b <= 126) charsAfterKey++;
  }
  console.log(`Visible characters in VRAM after keypress: ${charsAfterKey}`);
}

testFile('public/examples/Pantalla.asm', 'Pantalla.asm');
testFile('public/examples/cajero.asm', 'cajero.asm');
testFile('E:/programas/8085sim/ejemplo 23.asm', 'ejemplo 23.asm');
testFile('public/examples/ejemplo 25.asm', 'ejemplo 25.asm');
