import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { Assembler8085 } from '../src/core/assembler.js';
import { Intel8085 } from '../src/core/cpu8085.js';
import { PeripheralsManager } from '../src/core/peripherals.js';

console.log('===============================================================');
console.log('TEST SUITE: BATERIA MASIVA DE 28 PROGRAMAS REALES 8085SIM');
console.log('===============================================================');

const examplesBase = process.cwd().endsWith('simulador_8085_moderno') ? 'public/examples' : 'simulador_8085_moderno/public/examples';
const examplesDir = path.resolve(examplesBase);
const files = fs.readdirSync(examplesDir).filter(f => f.endsWith('.asm'));

console.log(`Total programas detectados para verificación: ${files.length}`);
assert.strictEqual(files.length >= 25, true, 'Debe haber al menos 25 programas');

let passed = 0;
let failed = 0;

for (const file of files) {
  const filePath = path.join(examplesDir, file);
  const code = fs.readFileSync(filePath, 'utf8');
  const asm = new Assembler8085();
  const res = asm.assemble(code);

  if (!res.success) {
    console.error(`❌ [FAIL ASSEMBLE] ${file}:`, res.diagnostics);
    failed++;
    continue;
  }

  // Load into CPU and verify execution
  const cpu = new Intel8085();
  const perifs = new PeripheralsManager(cpu);

  for (let i = 0; i < 65536; i++) {
    cpu.memory[i] = res.memory[i];
  }
  cpu.regs.pc = res.entryPoint;

  // Specific simulation logic based on program
  try {
    if (file === 'ejemplo 27_fibonacci.asm') {
      // Run until HLT
      for (let s = 0; s < 5000 && !cpu.halted; s++) cpu.step();
      assert.strictEqual(cpu.halted, true);
      // F(0..9): 0, 1, 1, 2, 3, 5, 8, 13 (0DH), 21 (15H), 34 (22H)
      const expected = [0x00, 0x01, 0x01, 0x02, 0x03, 0x05, 0x08, 0x0D, 0x15, 0x22];
      for (let i = 0; i < expected.length; i++) {
        assert.strictEqual(cpu.memory[0x0850 + i], expected[i], `Fibonacci #${i} mismatch`);
      }
      console.log(`✅ [PASS] ${file}: 10 términos de Fibonacci calculados y verificados en RAM`);
    } else if (file === 'ejemplo 29_palindromo.asm') {
      for (let s = 0; s < 5000 && !cpu.halted; s++) cpu.step();
      assert.strictEqual(cpu.halted, true);
      assert.strictEqual(cpu.memory[0x0820], 0x01, 'RADAR debe ser detectado como palíndromo (A=01H)');
      console.log(`✅ [PASS] ${file}: Algoritmo palíndromo ejecutado con éxito`);
    } else if (file === 'ejemplo 26_contador_7seg.asm') {
      // Run 200 steps to verify segment outputs on ports 02H and 03H
      for (let s = 0; s < 200; s++) cpu.step();
      assert.strictEqual(perifs.state.portsOut[3], 0x77, 'Display decenas debe iniciar en "0" (77H)');
      console.log(`✅ [PASS] ${file}: Conteo BCD en displays de 7 segmentos verificado`);
    } else if (file === 'ejemplo 9.asm') {
      for (let s = 0; s < 5000 && !cpu.halted; s++) cpu.step();
      assert.strictEqual(cpu.halted, true);
      console.log(`✅ [PASS] ${file}: Multiplicación por sumas sucesivas completada`);
    } else if (file === 'ejemplo 10.asm') {
      // Loop that copies port 00H to port 00H
      perifs.state.portsIn[0] = 0xA5;
      for (let s = 0; s < 20; s++) cpu.step();
      assert.strictEqual(perifs.state.portsOut[0], 0xA5, 'Puerto 00H de salida debe reflejar el valor 0xA5 de entrada');
      console.log(`✅ [PASS] ${file}: Transferencia en tiempo real de puerto IN 00H a OUT 00H completada`);
    } else if (file === 'cajero.asm') {
      // Execute 2000 steps until LEER_TECLA
      for (let s = 0; s < 20000; s++) {
        if (cpu.regs.pc === res.symbolTable.get('LEER_TECLA')) break;
        cpu.step();
      }
      assert.strictEqual(cpu.interrupts.inte, true, 'INTE debe estar habilitado');
      console.log(`✅ [PASS] ${file}: Inicialización de cajero y rutina de bienvenida completada`);
    } else {
      // General simulation run for up to 500 steps without crashes
      for (let s = 0; s < 500 && !cpu.halted; s++) cpu.step();
      console.log(`✅ [PASS] ${file}: Ensamblado y ejecución inicial OK`);
    }
    passed++;
  } catch (err: any) {
    console.error(`❌ [FAIL RUN] ${file}:`, err.message);
    failed++;
  }
}

console.log('===============================================================');
console.log(`RESUMEN BATERIA 28 PROGRAMAS: ${passed} PASSED, ${failed} FAILED`);
console.log('===============================================================');
assert.strictEqual(failed, 0, 'Todos los programas deben pasar');
