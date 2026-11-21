import assert from 'assert';
import { Intel8085 } from '../src/core/cpu8085.js';
import { PeripheralsManager } from '../src/core/peripherals.js';
import { Assembler8085 } from '../src/core/assembler.js';
import * as fs from 'fs';
import * as path from 'path';

async function runAll() {
  console.log('===============================================================');
  console.log('TEST SUITE: Advanced Interrupt Dispatch & Priority Resilience');
  console.log('===============================================================');

// 1. Unhandled higher-priority vector must NOT block lower-priority vector
{
  const cpu = new Intel8085();
  cpu.interrupts.inte = true;

  // Define ISR only at 002CH (RST 5.5)
  cpu.memory[0x002C] = 0x3E; // MVI A, 55H
  cpu.memory[0x002D] = 0x55;
  cpu.memory[0x002E] = 0xC9; // RET

  // Trigger unhandled TRAP, RST 7.5, RST 6.5 along with RST 5.5
  cpu.interrupts.trap = true;
  cpu.interrupts.rst75 = true;
  cpu.interrupts.rst65 = true;
  cpu.interrupts.rst55 = true;

  const accepted = cpu.checkInterrupts();
  assert.strictEqual(accepted, true, 'RST 5.5 must be serviced even if higher-priority vectors are unhandled');
  assert.strictEqual(cpu.regs.pc, 0x002C, 'PC must jump to RST 5.5 vector 002CH');
  assert.strictEqual(cpu.interrupts.rst55, false, 'RST 5.5 request must be consumed');
  assert.strictEqual(cpu.interrupts.trap, false, 'Unhandled TRAP request must be cleared');
  assert.strictEqual(cpu.interrupts.rst75, false, 'Unhandled RST 7.5 request must be cleared');
  assert.strictEqual(cpu.interrupts.rst65, false, 'Unhandled RST 6.5 request must be cleared');
  console.log('✅ [PASS] Unhandled higher-priority vectors do NOT deadlock lower-priority vectors');
}

// 2. Strict Priority when multiple vectors HAVE handlers
{
  const cpu = new Intel8085();
  cpu.interrupts.inte = true;

  // Handlers for both 7.5 (003C) and 5.5 (002C)
  cpu.memory[0x003C] = 0xC9; // RET
  cpu.memory[0x002C] = 0xC9; // RET

  cpu.interrupts.rst75 = true;
  cpu.interrupts.rst55 = true;

  const accepted = cpu.checkInterrupts();
  assert.strictEqual(accepted, true);
  assert.strictEqual(cpu.regs.pc, 0x003C, 'RST 7.5 has higher priority than RST 5.5');
  assert.strictEqual(cpu.interrupts.rst75, false, 'RST 7.5 consumed');
  assert.strictEqual(cpu.interrupts.rst55, true, 'RST 5.5 remains pending for next check');
  console.log('✅ [PASS] Strict Intel 8085 priority respected (7.5 > 5.5)');
}

// 3. Peripheral Keyboard switching and pressKey verification
{
  const cpu = new Intel8085();
  const perifs = new PeripheralsManager(cpu);
  cpu.interrupts.inte = true;

  // Set keyboard on RST 5.5
  perifs.setKeyboardInterrupt('5.5');
  assert.strictEqual(perifs.state.keyboardInterruptType, '5.5');

  // Press 'T' (0x54)
  perifs.pressKey('T');
  assert.strictEqual(perifs.state.portsIn[0], 0x54, 'Port 00H must receive ASCII 0x54 ("T")');
  assert.strictEqual(cpu.interrupts.rst55, true, 'RST 5.5 must be requested');
  assert.strictEqual(cpu.interrupts.rst75, false, 'RST 7.5 must not be requested');

  // Release 'T'
  perifs.releaseKey();
  assert.strictEqual(perifs.state.portsIn[0], 0x00, 'Port 00H must return to 0x00 after release');

  // Switch to RST 7.5
  perifs.setKeyboardInterrupt('7.5');
  perifs.pressKey('A');
  assert.strictEqual(cpu.interrupts.rst75, true, 'RST 7.5 requested');
  assert.strictEqual(cpu.interrupts.rst55, false, 'Previous RST 5.5 cleared on switch');
  console.log('✅ [PASS] Keyboard dispatch and port 00H release work seamlessly on any vector');
}

// 4. Verification with real cajero.asm
{
  const examplesBase = process.cwd().endsWith('simulador_8085_moderno') ? 'public/examples' : 'simulador_8085_moderno/public/examples';
  const asmPath = path.resolve(examplesBase, 'cajero.asm');
  const code = fs.readFileSync(asmPath, 'utf8');
  const asm = new Assembler8085();
  const res = asm.assemble(code);
  assert.strictEqual(res.success, true, `cajero.asm must assemble with success: ${JSON.stringify(res.diagnostics)}`);

  const cpu = new Intel8085();
  const perifs = new PeripheralsManager(cpu);

  // Load assembled code into CPU memory
  for (let i = 0; i < 65536; i++) {
    cpu.memory[i] = res.memory[i];
  }

  // Verify RST 5.5 vector at 002CH is populated with JMP
  assert.strictEqual(cpu.memory[0x002C], 0xC3, '002CH must contain JMP (0xC3)');

  const esperarTarjetaAddr = res.symbolTable.get('ESPERAR_TARJETA')!;
  const menuAutenticacionAddr = res.symbolTable.get('MENU_AUTENTICACION')!;
  console.log(`ESPERAR_TARJETA: 0x${esperarTarjetaAddr.toString(16)}, MENU_AUTENTICACION: 0x${menuAutenticacionAddr.toString(16)}`);

  // Run initial setup until reaching ESPERAR_TARJETA loop (or waiting in LEER_TECLA)
  cpu.regs.pc = 0x0100;
  for (let step = 0; step < 100000; step++) {
    // If it's executing in LEER_TECLA loop
    if (cpu.regs.pc === res.symbolTable.get('LEER_TECLA')) break;
    cpu.step();
  }
  console.log(`Reached PC: 0x${cpu.regs.pc.toString(16)}`);
  assert.strictEqual(cpu.interrupts.inte, true, 'INTE must be enabled by EI in cajero.asm');
  assert.strictEqual(cpu.interrupts.mask55, false, 'RST 5.5 mask must be 0 (unmasked) by SIM');

  // Now press 'T' via peripherals
  perifs.setKeyboardInterrupt('5.5');
  perifs.pressKey('T');
  assert.strictEqual(cpu.interrupts.rst55, true, 'Keypress must trigger RST 5.5 request');

  // Next cpu step should acknowledge interrupt and jump to 002CH
  cpu.step();
  assert.strictEqual(cpu.regs.pc, 0x002C, 'CPU must jump to RST 5.5 vector 002CH');

  // Execute ISR_TECLADO
  for (let step = 0; step < 30; step++) {
    cpu.step();
    if (cpu.memory[0x0800] === 0x01) break; // FLAG_TECLA set!
  }
  assert.strictEqual(cpu.memory[0x0800], 0x01, 'FLAG_TECLA at 0800H must be set to 1');
  assert.strictEqual(cpu.memory[0x0801], 0x54, 'BUFFER_TECLA at 0801H must contain "T" (0x54)');

  // Release key so ESPERAR_SOLTAR can pass
  perifs.releaseKey();

  // Run until LEER_TECLA consumes flag and ESPERAR_TARJETA detects 'T' and branches to MENU_AUTENTICACION
  for (let step = 0; step < 1000; step++) {
    cpu.step();
    if (cpu.regs.pc === menuAutenticacionAddr) break;
  }
  assert.strictEqual(cpu.regs.pc, menuAutenticacionAddr, 'cajero.asm must proceed past ESPERAR_TARJETA to MENU_AUTENTICACION!');
  console.log('✅ [PASS] cajero.asm fully responds to keyboard "T" on RST 5.5 and transitions to MENU_AUTENTICACION!');
}

// 5. Timed Interrupts (cada X ms) verification
{
  const cpu = new Intel8085();
  const perifs = new PeripheralsManager(cpu);
  cpu.interrupts.inte = true;

  // Define ISR for RST 6.5 at 0034H: INR C; EI; RET
  cpu.memory[0x0034] = 0x0C; // INR C
  cpu.memory[0x0035] = 0xFB; // EI
  cpu.memory[0x0036] = 0xC9; // RET

  // Program loop at 0100H: JMP 0100H
  cpu.regs.pc = 0x0100;
  cpu.memory[0x0100] = 0xC3;
  cpu.memory[0x0101] = 0x00;
  cpu.memory[0x0102] = 0x01;

  // Configure RST 6.5 as timer every 20ms
  perifs.setAutoInterrupts({
    trap: { mode: 'no', timerMs: 0 },
    rst75: { mode: 'no', timerMs: 0 },
    rst65: { mode: 'timer', timerMs: 20 },
    rst55: { mode: 'no', timerMs: 0 }
  });

  assert.strictEqual(perifs.state.autoInterrupts.rst65.mode, 'timer');
  assert.strictEqual(perifs.state.autoInterrupts.rst65.timerMs, 20);

  // Wait 60ms to allow ~2-3 timer ticks
  await new Promise(r => setTimeout(r, 65));

  assert.strictEqual(cpu.interrupts.rst65, true, 'RST 6.5 timer must have fired and requested interrupt');

  // CPU steps and acknowledges interrupt
  cpu.step();
  assert.strictEqual(cpu.regs.pc, 0x0034, 'CPU stepped into timer ISR at 0034H');
  cpu.step(); // INR C
  cpu.step(); // EI
  cpu.step(); // RET
  assert.strictEqual(cpu.regs.c, 1, 'Register C was incremented by timed interrupt ISR');

  // Stop timers clean up
  perifs.stopAllTimers();
  console.log('✅ [PASS] Timed interrupts (cada X ms) fire reliably and are serviced by CPU ISR');
}

  console.log('🎉 ALL ADVANCED INTERRUPT TESTS PASSED PERFECTLY!');
}

runAll().catch(e => {
  console.error(e);
  process.exit(1);
});
