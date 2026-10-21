import { Assembler8085 } from '../src/core/assembler.js';

console.log('===============================================================');
console.log('TEST SUITE: Assembly-Time Intelligent Linter (Zero Runtime Overhead)');
console.log('===============================================================');

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${msg}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${msg}`);
}

const asm = new Assembler8085();

// Test 1: Memory Collision Detection (.org and .data overlap)
const codeCollision = `
.org 0100H
INICIO:
    MVI A, 55H
    NOP
    NOP
.data 0101H
    dB 10H, 20H
`;
const res1 = asm.assemble(codeCollision);
assert(res1.success, 'Program with collision assembles successfully (as warning, not fatal error)');
const collisionWarn = res1.diagnostics.find(d => !d.isError && d.message.includes('Advertencia de Colisión'));
assert(!!collisionWarn, 'Assembler accurately detects segment overlap between .org and .data');
console.log('Collision warning message:', collisionWarn?.message);

// Test 2: Zero False Positives on standard 8085 idioms
// - No LXI SP needed (relies on hardware SP=FFFFH default in 8085sim)
// - Closed loop (bucle: jmp bucle) for program end or waiting
// - TRAP at 0024H without EI
// - Arbitrary RAM addresses (0E3F0H, 0F000H)
const codeRealIdiom = `
.org 0024H
    IN 00H
    RET
.org 0100H
INICIO:
    CALL MI_SUBRUTINA
    LXI H, 0E3F0H
ESPERA:
    JMP ESPERA
MI_SUBRUTINA:
    RET
`;
const res2 = asm.assemble(codeRealIdiom);
assert(res2.success, 'Legitimate 8085 idioms assemble cleanly');
assert(res2.diagnostics.length === 0, 'Zero false alarms on legitimate 8085sim patterns');

console.log('===============================================================');
console.log('ALL FACTUAL MEMORY INTEGRITY TESTS PASSED (100% CLEAN)!');
console.log('===============================================================');
