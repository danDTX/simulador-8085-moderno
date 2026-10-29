import { Assembler8085 } from '../src/core/assembler.js';

console.log('===============================================================');
console.log('TEST SUITE: Intel 8085 Strict Parameter & Operand Validation');
console.log('===============================================================');

const asm = new Assembler8085();

function assertError(code: string, description: string, expectedSnippet?: string) {
  const result = asm.assemble(code);
  if (result.success) {
    throw new Error(`Expected error for '${description}', but assembled successfully! Code: ${code}`);
  }
  if (expectedSnippet) {
    const found = result.diagnostics.some(d => d.isError && d.message.toLowerCase().includes(expectedSnippet.toLowerCase()));
    if (!found) {
      throw new Error(`Expected message containing '${expectedSnippet}', but got: ${result.diagnostics.map(d => d.message).join(' | ')}`);
    }
  }
  console.log(`✅ [PASS] Caught invalid syntax: ${description}`);
}

function assertSuccess(code: string, description: string) {
  const result = asm.assemble(code);
  if (!result.success) {
    throw new Error(`Expected success for '${description}', but got errors: ${result.diagnostics.map(d => d.message).join(' | ')}`);
  }
  console.log(`✅ [PASS] Valid syntax accepted: ${description}`);
}

// 1. ADD / ALU with multiple operands
assertError('.ORG 0100H\nADD B, A\nHLT', 'ADD with 2 operands (ADD B, A)', 'requiere exactamente 1 registro');
assertError('.ORG 0100H\nADD\nHLT', 'ADD with 0 operands', 'requiere exactamente 1 registro');
assertError('.ORG 0100H\nADD X\nHLT', 'ADD with invalid register X', 'Registro no válido');
assertSuccess('.ORG 0100H\nADD B\nHLT', 'ADD B (valid 1 register operand)');

// 2. Simple opcodes (0 operands)
assertError('.ORG 0100H\nHLT A\n', 'HLT with parameter (HLT A)', 'no recibe operandos');
assertError('.ORG 0100H\nNOP 10H\n', 'NOP with parameter', 'no recibe operandos');
assertSuccess('.ORG 0100H\nNOP\nHLT\n', 'NOP and HLT without parameters');

// 3. MOV (2 register operands)
assertError('.ORG 0100H\nMOV A\n', 'MOV with 1 operand', 'requiere 2 operandos');
assertError('.ORG 0100H\nMOV A, B, C\n', 'MOV with 3 operands', 'requiere 2 operandos');
assertError('.ORG 0100H\nMOV M, M\n', 'MOV M, M (invalid opcode in 8085)', 'no es válida en 8085');
assertError('.ORG 0100H\nMOV A, Z\n', 'MOV with invalid source register Z', 'Operandos no válidos');
assertSuccess('.ORG 0100H\nMOV A, B\nMOV M, A\n', 'MOV A, B and MOV M, A (valid)');

// 4. MVI (1 register, 1 byte data)
assertError('.ORG 0100H\nMVI A\n', 'MVI with 1 operand', 'requiere 2 operandos');
assertError('.ORG 0100H\nMVI Z, 10H\n', 'MVI with invalid register Z', 'Registro no válido');
assertSuccess('.ORG 0100H\nMVI A, 10H\nMVI M, 0FFH\n', 'MVI with valid registers');

// 5. LXI (1 pair, 1 word data)
assertError('.ORG 0100H\nLXI H\n', 'LXI with 1 operand', 'requiere 2 operandos');
assertError('.ORG 0100H\nLXI A, 0200H\n', 'LXI with register A', 'Par de registros no válido');
assertSuccess('.ORG 0100H\nLXI H, 0200H\nLXI HL, 0200H\nLXI SP, 0FFFFH\n', 'LXI H, LXI HL and LXI SP');

// 6. INX / DCX / DAD (1 pair)
assertError('.ORG 0100H\nINX A\n', 'INX with register A', 'Par no válido');
assertError('.ORG 0100H\nINX B, C\n', 'INX with 2 operands', 'requiere 1 par');
assertSuccess('.ORG 0100H\nINX B\nDCX DE\nDAD SP\n', 'INX B, DCX DE, DAD SP');

// 7. PUSH / POP (1 pair)
assertError('.ORG 0100H\nPUSH A\n', 'PUSH with register A', 'Par no válido');
assertSuccess('.ORG 0100H\nPUSH PSW\nPUSH B\nPOP D\n', 'PUSH PSW, PUSH B, POP D');

// 8. RST (0..7)
assertError('.ORG 0100H\nRST 9\n', 'RST with vector 9', 'Vector de RST no válido');
assertSuccess('.ORG 0100H\nRST 5\nRST 1\n', 'RST with vectors 5 and 1');

// 9. Non-ASCII characters in labels and instructions (e.g. 'ñ', accents)
assertError('.ORG 0100H\nAÑO:\nINR A\nHLT', 'Label with letter ñ (AÑO:)', 'Carácter no permitido');
assertError('.ORG 0100H\nPEQUEÑO:\nINR A\nHLT', 'Label with letter ñ (PEQUEÑO:)', 'Carácter no permitido');
assertError('.ORG 0100H\nDISEÑO:\nINR A\nHLT', 'Label with letter ñ (DISEÑO:)', 'Carácter no permitido');
assertError('.ORG 0100H\nSUBRUTÍNA:\nRET', 'Label with accent (SUBRUTÍNA:)', 'Carácter no permitido');
assertSuccess('.ORG 0100H\nANIO:\nINR A\nHLT', 'ASCII equivalent label (ANIO:)');

console.log('===============================================================');
console.log('ALL PARAMETER VALIDATION TESTS PASSED (100% CLEAN)!');
console.log('===============================================================');
