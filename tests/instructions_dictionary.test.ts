import { DocsHelper } from '../src/core/docsHelper.js';

console.log('===============================================================');
console.log('TEST SUITE: Intel 8085 Instructions Dictionary & Docs Integrity');
console.log('===============================================================');

const instructions = DocsHelper.getAllInstructions();

// 1. Total Count Verification
if (instructions.length !== 78) {
  throw new Error(`Expected exactly 78 instructions & directives, found ${instructions.length}`);
}
console.log(`✅ [PASS] Catalog contains all ${instructions.length} instructions and directives.`);

// 2. Field Completeness Verification
for (const inst of instructions) {
  if (!inst.name || !inst.sig || !inst.group || !inst.bytes || !inst.cycles || !inst.flags || !inst.summary || !inst.params) {
    throw new Error(`Incomplete instruction specification: ${JSON.stringify(inst)}`);
  }
  if (!inst.example || inst.example.trim().length === 0) {
    throw new Error(`Missing practical code example for instruction: ${inst.name}`);
  }
}
console.log('✅ [PASS] All 78 entries contain complete metadata and practical examples.');

// 3. Category Mapping Verification
const categoryMatches = {
  transfer: 0,
  arithmetic: 0,
  logic: 0,
  branch: 0,
  subroutine: 0,
  io_stack: 0,
  directives: 0
};

for (const inst of instructions) {
  const g = inst.group.toLowerCase();
  if (g.includes('transferencia')) {
    categoryMatches.transfer++;
  } else if (g.includes('aritmética') || g.includes('aritmetica')) {
    categoryMatches.arithmetic++;
  } else if (g.includes('lógica') || g.includes('logica') || g.includes('flag') || g.includes('comparación') || g.includes('comparacion') || g.includes('rotación') || g.includes('rotacion')) {
    categoryMatches.logic++;
  } else if (g.includes('bifurcación') || g.includes('bifurcacion')) {
    categoryMatches.branch++;
  } else if (g.includes('subrutina') || g.includes('retorno') || g.includes('llamada')) {
    categoryMatches.subroutine++;
  } else if (g.includes('pila') || g.includes('entrada/salida') || g.includes('interrup') || g.includes('máquina') || g.includes('maquina')) {
    categoryMatches.io_stack++;
  } else if (g.includes('directiva')) {
    categoryMatches.directives++;
  } else {
    throw new Error(`Uncategorized instruction group: ${inst.group} (${inst.name})`);
  }
}

const totalMapped = Object.values(categoryMatches).reduce((a, b) => a + b, 0);
if (totalMapped !== 78) {
  throw new Error(`Mismatch in category totals: expected 78, got ${totalMapped}`);
}
console.log('✅ [PASS] 100% of instructions successfully classified across 7 category groups:');
console.log(`   - Transferencia: ${categoryMatches.transfer}`);
console.log(`   - Aritmética: ${categoryMatches.arithmetic}`);
console.log(`   - Lógica y Flags: ${categoryMatches.logic}`);
console.log(`   - Saltos: ${categoryMatches.branch}`);
console.log(`   - Subrutinas: ${categoryMatches.subroutine}`);
console.log(`   - Pila y E/S: ${categoryMatches.io_stack}`);
console.log(`   - Directivas: ${categoryMatches.directives}`);

// 4. Case-insensitive and directive prefix lookup
const mov = DocsHelper.getInstruction('mov');
if (!mov || mov.name !== 'MOV' || !mov.bytes.includes('1 byte')) {
  throw new Error('Failed to look up MOV instruction');
}

const orgWithDot = DocsHelper.getInstruction('.org');
const orgWithoutDot = DocsHelper.getInstruction('org');
if (!orgWithDot || !orgWithoutDot || orgWithDot.name.toUpperCase() !== '.ORG') {
  throw new Error('Failed to look up .org directive');
}
console.log('✅ [PASS] Case-insensitive and dot-prefixed lookups resolve accurately.');

console.log('===============================================================');
console.log('ALL INSTRUCTIONS DICTIONARY TESTS PASSED (4/4)!');
console.log('===============================================================');
