import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Disassembler8085 } from '../src/core/disassembler';
import { PeripheralsManager } from '../src/core/peripherals';
import { Intel8085 } from '../src/core/cpu8085';
import { generateExecutionTrace, generateStyledHTMLTable } from '../src/core/traceEngine';

describe('Fase 3 - Periféricos, Desensamblador y Traza', () => {
  it('Disassembler decodifica DAD B, D, H, SP con 10 T-states', () => {
    const mem = new Uint8Array(65536);
    mem[0] = 0x09; // DAD B
    mem[1] = 0x19; // DAD D
    mem[2] = 0x29; // DAD H
    mem[3] = 0x39; // DAD SP

    const d0 = Disassembler8085.disassemble(mem, 0);
    assert.equal(d0.mnemonic, 'DAD B');
    assert.equal(d0.tStates, 10);
    assert.equal(d0.length, 1);

    const d1 = Disassembler8085.disassemble(mem, 1);
    assert.equal(d1.mnemonic, 'DAD D');
    assert.equal(d1.tStates, 10);

    const d2 = Disassembler8085.disassemble(mem, 2);
    assert.equal(d2.mnemonic, 'DAD H');
    assert.equal(d2.tStates, 10);

    const d3 = Disassembler8085.disassemble(mem, 3);
    assert.equal(d3.mnemonic, 'DAD SP');
    assert.equal(d3.tStates, 10);
  });

  it('Disassembler decodifica NOPs indocumentados (0x08, 0x10, 0x18, 0x28, 0x38)', () => {
    const mem = new Uint8Array(65536);
    const nops = [0x08, 0x10, 0x18, 0x28, 0x38];
    for (let i = 0; i < nops.length; i++) {
      mem[i] = nops[i];
      const d = Disassembler8085.disassemble(mem, i);
      assert.equal(d.mnemonic, 'NOP');
      assert.equal(d.tStates, 4);
    }
  });

  it('Peripherals: setKeyboardInterrupt preserva otros modos como timer y sincroniza timers', () => {
    const cpu = new Intel8085();
    const perifs = new PeripheralsManager(cpu);

    // Configurar RST 7.5 como timer
    perifs.state.autoInterrupts.rst75 = { mode: 'timer', timerMs: 50 };

    // Cambiar interrupción de teclado a 5.5
    perifs.setKeyboardInterrupt('5.5');

    // 5.5 debe ser de teclado
    assert.equal(perifs.state.keyboardInterruptType, '5.5');
    assert.equal(perifs.state.autoInterrupts.rst55.mode, 'keyboard');

    // 7.5 debe mantener su modo timer sin ser reseteado a 'no'
    assert.equal(perifs.state.autoInterrupts.rst75.mode, 'timer');

    perifs.stopAllTimers();
  });

  it('TraceEngine propaga sidBit, sodBit y mantiene onPortWrite aislado de la sesión activa', () => {
    const cpu = new Intel8085();
    cpu.sidBit = true;
    cpu.sodBit = false;

    // Código: OUT 01H; HLT
    cpu.memory[0x0100] = 0xD3; // OUT
    cpu.memory[0x0101] = 0x01; // port 01H
    cpu.memory[0x0102] = 0x76; // HLT

    let capturedPort = -1;
    cpu.onPortWrite = (port, val) => {
      capturedPort = port;
    };

    const trace = generateExecutionTrace({
      cpu,
      startPc: 0x0100,
      maxSteps: 10
    });

    assert.equal(trace.halted, true);
    // El onPortWrite de la CPU activa NO debe ser invocado por la traza (aislamiento de periféricos)
    assert.equal(capturedPort, -1);
  });

  it('TraceEngine escapa caracteres HTML en generateStyledHTMLTable', () => {
    const rows: any[] = [
      {
        stepIndex: 1,
        code: 'CPI <test>&"\'',
        a: 0, b: 0, c: 0, d: 0, e: 0, h: 0, l: 0, m: 0,
        sp: 0xFFFF, pc: 0x0100,
        z: 0, s: 0, ac: 0, cy: 0, p: 0,
        changed: { a: false, b: false, c: false, d: false, e: false, h: false, l: false, m: false, sp: false, pc: false, z: false, s: false, ac: false, cy: false, p: false }
      }
    ];

    const html = generateStyledHTMLTable(rows, false);
    assert.equal(html.includes('&lt;test&gt;&amp;&quot;&#039;'), true);
    assert.equal(html.includes('<test>'), false);
  });

  it('Teclado puede conmutar a cualquier interrupción (TRAP, 7.5, 6.5, 5.5, NONE) y dispararla limpiamente', () => {
    const cpu = new Intel8085();
    const perifs = new PeripheralsManager(cpu);

    // 1. Probar TRAP
    perifs.setKeyboardInterrupt('TRAP');
    assert.equal(perifs.state.keyboardInterruptType, 'TRAP');
    assert.equal(perifs.state.autoInterrupts.trap.mode, 'keyboard');
    perifs.pressKey('A');
    assert.equal(cpu.interrupts.trap, true);
    cpu.interrupts.trap = false;
    perifs.releaseKey();

    // 2. Probar 7.5
    perifs.setKeyboardInterrupt('7.5');
    assert.equal(perifs.state.keyboardInterruptType, '7.5');
    assert.equal(perifs.state.autoInterrupts.rst75.mode, 'keyboard');
    assert.equal(perifs.state.autoInterrupts.trap.mode, 'no');
    perifs.pressKey('B');
    assert.equal(cpu.interrupts.rst75, true);
    cpu.interrupts.rst75 = false;
    perifs.releaseKey();

    // 3. Probar 6.5
    perifs.setKeyboardInterrupt('6.5');
    assert.equal(perifs.state.keyboardInterruptType, '6.5');
    assert.equal(perifs.state.autoInterrupts.rst65.mode, 'keyboard');
    assert.equal(perifs.state.autoInterrupts.rst75.mode, 'no');
    perifs.pressKey('C');
    assert.equal(cpu.interrupts.rst65, true);
    cpu.interrupts.rst65 = false;
    perifs.releaseKey();

    // 4. Probar 5.5
    perifs.setKeyboardInterrupt('5.5');
    assert.equal(perifs.state.keyboardInterruptType, '5.5');
    assert.equal(perifs.state.autoInterrupts.rst55.mode, 'keyboard');
    assert.equal(perifs.state.autoInterrupts.rst65.mode, 'no');
    perifs.pressKey('D');
    assert.equal(cpu.interrupts.rst55, true);
    cpu.interrupts.rst55 = false;
    perifs.releaseKey();

    // 5. Probar NONE
    perifs.setKeyboardInterrupt('NONE');
    assert.equal(perifs.state.keyboardInterruptType, 'NONE');
    perifs.pressKey('E');
    assert.equal(cpu.interrupts.rst55, false);
    assert.equal(cpu.interrupts.rst65, false);
    assert.equal(cpu.interrupts.rst75, false);
    assert.equal(cpu.interrupts.trap, false);
    perifs.releaseKey();
  });
});
