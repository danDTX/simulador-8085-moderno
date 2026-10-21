import { Disassembler8085 } from '../src/core/disassembler.js';
import { DelayGenerator } from '../src/ui/dialogs/delayGeneratorDialog.js';

console.log('Testing Disassembler8085 and DelayGenerator...');

// 1. Test Disassembler
const mem = new Uint8Array(65536);
mem[0x0100] = 0x3E; // MVI A, 55H
mem[0x0101] = 0x55;
mem[0x0102] = 0xCD; // CALL 0150H
mem[0x0103] = 0x50;
mem[0x0104] = 0x01;
mem[0x0105] = 0x76; // HLT

const d1 = Disassembler8085.disassemble(mem, 0x0100);
if (d1.mnemonic !== 'MVI A, 55H' || d1.length !== 2 || d1.tStates !== 7) {
  throw new Error(`Disassembler failed on MVI A: ${JSON.stringify(d1)}`);
}

const d2 = Disassembler8085.disassemble(mem, 0x0102);
if (d2.mnemonic !== 'CALL 0150H' || d2.length !== 3) {
  throw new Error(`Disassembler failed on CALL: ${JSON.stringify(d2)}`);
}

const d3 = Disassembler8085.disassemble(mem, 0x0105);
if (d3.mnemonic !== 'HLT' || d3.length !== 1) {
  throw new Error(`Disassembler failed on HLT: ${JSON.stringify(d3)}`);
}

console.log('✅ Disassembler tests passed!');

// 2. Test DelayGenerator
const res300k = DelayGenerator.calculate(500, 300000); // 500ms @ 300kHz = 150,000 cycles
if (res300k.cyclesActual < 140000 || res300k.cyclesActual > 160000) {
  throw new Error(`Delay generator produced bad cycle count: ${res300k.cyclesActual}`);
}
if (!res300k.asmCode.includes('MVI B') || !res300k.asmCode.includes('MVI C')) {
  throw new Error(`Delay generator missing loop code: ${res300k.asmCode}`);
}

console.log(`✅ DelayGenerator test passed: Target 500ms, Actual ${res300k.realDelayMs.toFixed(2)}ms (Error: ${res300k.errorPercent.toFixed(2)}%)`);
