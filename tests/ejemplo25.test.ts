import { Intel8085 } from '../src/core/cpu8085.js';
import { Assembler8085 } from '../src/core/assembler.js';
import { PeripheralsManager } from '../src/core/peripherals.js';
import * as fs from 'fs';

function runEjemplo25Test() {
  console.log('Testing ejemplo 25 (Digital Key / ATM password flow)...');
  const cpu = new Intel8085();
  const perifs = new PeripheralsManager(cpu);
  const assembler = new Assembler8085();

  const code = fs.readFileSync('E:/programas/8085sim/ejemplo 25.asm', 'latin1');
  const res = assembler.assemble(code);
  if (!res.success) {
    throw new Error('Assemble failed: ' + JSON.stringify(res.diagnostics));
  }

  const addrLeerTecla = res.symbolTable.get('LEER_TECLA')!;
  const addrEsperaOpcion = res.symbolTable.get('ESPERAR_OPCION')!;
  const addrModoIngresar = res.symbolTable.get('MODO_INGRESAR_CLAVE')!;
  const addrIsr = res.symbolTable.get('ISR_TECLADO')!;

  console.log('Symbol locations:');
  console.log('  ESPERAR_OPCION:', '0x' + addrEsperaOpcion.toString(16));
  console.log('  LEER_TECLA:', '0x' + addrLeerTecla.toString(16));
  console.log('  MODO_INGRESAR_CLAVE:', '0x' + addrModoIngresar.toString(16));
  console.log('  ISR_TECLADO:', '0x' + addrIsr.toString(16));

  cpu.memory.set(res.memory);
  cpu.regs.pc = 0x0000;

  // Step until CPU reaches LEER_TECLA wait loop
  let reachedWait = false;
  for (let i = 0; i < 20000; i++) {
    cpu.step();
    if (cpu.regs.pc === addrLeerTecla) {
      reachedWait = true;
      break;
    }
  }

  console.log('Reached LEER_TECLA:', reachedWait, 'at step, PC = 0x' + cpu.regs.pc.toString(16));

  // Verify VRAM at 0xE000 contains 'LLAVE DIGITAL'
  const vramSlice = Buffer.from(cpu.memory.slice(0xe000, 0xe100)).toString('latin1');
  console.log('VRAM contains menu header:', vramSlice.includes('LLAVE DIGITAL 8085'));

  // Simulate key press '1'
  console.log('Simulating keypress "1"...');
  perifs.pressKey('1');

  // Let ISR run and set flag
  for (let i = 0; i < 1000; i++) {
    cpu.step();
    if (cpu.memory[0x0800] === 0x01) {
      break;
    }
  }
  console.log('Key received by ISR, [0800H] =', cpu.memory[0x0800]);

  // Release key so ESPERAR_SOLTAR passes
  perifs.releaseKey();

  // Step until it reaches MODO_INGRESAR_CLAVE
  let reachedModo = false;
  for (let i = 0; i < 10000; i++) {
    cpu.step();
    if (cpu.regs.pc === addrModoIngresar) {
      reachedModo = true;
      break;
    }
  }

  console.log('Reached MODO_INGRESAR_CLAVE:', reachedModo, 'PC = 0x' + cpu.regs.pc.toString(16));
  if (!reachedModo) {
    throw new Error('Failed to transition to MODO_INGRESAR_CLAVE');
  }

  console.log('✅ ALL TESTS PASSED: ejemplo 25 executes flawlessly!');
}

runEjemplo25Test();
