import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Intel8085 } from '../src/core/cpu8085';
import { Assembler8085 } from '../src/core/assembler';
import { PeripheralsManager } from '../src/core/peripherals';
import { generateExecutionTrace } from '../src/core/traceEngine';

describe('Auditoría y Validación de Fallas Críticas', () => {
  it('1. stepBack restaura eiDelay sin anular la habilitación de INTE', () => {
    const cpu = new Intel8085();
    // 0000H: EI (0xFB)
    // 0001H: NOP (0x00)
    // 0002H: NOP (0x00)
    cpu.memory[0] = 0xFB;
    cpu.memory[1] = 0x00;
    cpu.memory[2] = 0x00;
    cpu.regs.pc = 0;
    cpu.recordHistory = true;

    assert.equal(cpu.interrupts.inte, false);

    // Paso 1: Ejecutar EI (eiDelay configurado en 2)
    cpu.step();
    assert.equal(cpu.interrupts.inte, false);

    // Paso 2: Ejecutar NOP (al terminar la instrucción siguiente a EI, inte pasa a true)
    cpu.step();
    assert.equal(cpu.interrupts.inte, true);

    // Paso 3: Retroceder (stepBack del NOP)
    const reverted = cpu.stepBack();
    assert.equal(reverted, true);
    assert.equal(cpu.regs.pc, 1);
    // Al deshacer el NOP, inte debe volver a false y eiDelay a 1
    assert.equal(cpu.interrupts.inte, false);

    // Paso 4: Re-ejecutar el NOP (eiDelay: 1 -> 0, inte vuelve a true)
    cpu.step();
    assert.equal(cpu.interrupts.inte, true);
  });

  it('2. TRAP no desactiva el flip-flop INTE en el 8085 real', () => {
    const cpu = new Intel8085();
    // Configurar ISR de TRAP en 0024H con NOP; RET (0xC9)
    cpu.memory[0x0024] = 0x00;
    cpu.memory[0x0025] = 0xC9;

    // Habilitar interrupciones
    cpu.interrupts.inte = true;
    cpu.interrupts.trap = true;
    cpu.regs.pc = 0x0100;

    const handled = cpu.step();
    assert.equal(handled, 12); // ACK de TRAP
    assert.equal(cpu.regs.pc, 0x0024);
    // En hardware 8085, TRAP es no enmascarable y NO apaga INTE
    assert.equal(cpu.interrupts.inte, true);
  });

  it('3. HLT consume exactamente 7 ciclos T', () => {
    const cpu = new Intel8085();
    cpu.memory[0x0100] = 0x76; // HLT
    cpu.regs.pc = 0x0100;

    const cycles = cpu.step();
    assert.equal(cycles, 7);
    assert.equal(cpu.halted, true);
  });

  it('4. TraceEngine no altera los puertos del PeripheralsManager real', () => {
    const cpu = new Intel8085();
    const perifs = new PeripheralsManager(cpu);
    const assembler = new Assembler8085();

    // Código con OUT 01H
    const asm = `
      .org 0100h
      MVI A, 0AAH
      OUT 01H
      HLT
    `;
    const res = assembler.assemble(asm);
    assert.equal(res.success, true);

    perifs.state.portsOut[1] = 0x00; // Estado inicial limpio

    const trace = generateExecutionTrace({
      cpu,
      startPc: 0x0100,
      maxSteps: 10
    });

    assert.ok(trace.rows.length > 1);
    // El periférico REAL debe permanecer intacto en 0x00
    assert.equal(perifs.state.portsOut[1], 0x00);
  });

  it('5. setKeyboardInterrupt limpia solo los flags que pertenecían al teclado', () => {
    const cpu = new Intel8085();
    const perifs = new PeripheralsManager(cpu);

    // Supongamos que un timer activó RST 6.5
    cpu.interrupts.rst65 = true;
    perifs.state.autoInterrupts.rst65.mode = 'timer';

    // Asignar teclado a 5.5
    perifs.setKeyboardInterrupt('5.5');
    assert.equal(perifs.state.keyboardInterruptType, '5.5');
    // El flag de RST 6.5 del timer NO debe haberse borrado
    assert.equal(cpu.interrupts.rst65, true);

    // Ahora conmutar teclado de 5.5 a 7.5
    cpu.interrupts.rst55 = true; // Simular petición de teclado en 5.5
    perifs.setKeyboardInterrupt('7.5');
    // Como 5.5 era del teclado, al cambiar se limpia
    assert.equal(cpu.interrupts.rst55, false);
    // Pero el flag del timer de 6.5 sigue vivo
    assert.equal(cpu.interrupts.rst65, true);
  });

  it('6. Assembler acepta .org y .data con tabuladores y .define con caracteres en español', () => {
    const assembler = new Assembler8085();
    const asm = `
      .define TAMAÑO 10
      .org\t0100h
      MVI A, TAMAÑO
      .data\t0200h
      dB 01H, 02H
    `;
    const res = assembler.assemble(asm);
    assert.equal(res.success, true);
    assert.equal(res.entryPoint, 0x0100);
    assert.equal(res.memory[0x0101], 10);
    assert.equal(res.memory[0x0200], 1);
  });
});
