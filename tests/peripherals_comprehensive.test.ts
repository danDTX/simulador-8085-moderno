import assert from 'node:assert';
import { Intel8085 } from '../src/core/cpu8085.js';
import { Assembler8085 } from '../src/core/assembler.js';
import { PeripheralsManager } from '../src/core/peripherals.js';
import { createCrtTerminalPanel } from '../src/ui/panels/crtTerminalPanel.js';
import { createDisplays7Panel } from '../src/ui/panels/displays7Panel.js';
import { createDisplays15Panel } from '../src/ui/panels/displays15Panel.js';
import { createLedsPanel } from '../src/ui/panels/ledsPanel.js';
import { createDipSwitchesPanel } from '../src/ui/panels/dipSwitchesPanel.js';

class MockElement {
  public tagName: string;
  public className: string = '';
  private _innerHTML: string = '';
  public textContent: string = '';
  public style: Record<string, string> = {};
  public attributes: Record<string, string> = {};
  public eventListeners: Record<string, ((e: any) => void)[]> = {};
  public value: string = '';
  public elementsById: Map<string, MockElement> = new Map();

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  public get innerHTML(): string {
    return this._innerHTML;
  }

  public set innerHTML(val: string) {
    this._innerHTML = val;
    // Extract IDs from HTML string
    const idMatches = val.matchAll(/id="([^"]+)"/g);
    for (const match of idMatches) {
      const id = match[1];
      if (!this.elementsById.has(id)) {
        const child = new MockElement('div');
        child.attributes['id'] = id;
        this.elementsById.set(id, child);
      }
    }
  }

  public classList = {
    classes: new Set<string>(),
    add: (...cls: string[]) => cls.forEach(c => this.classList.classes.add(c)),
    remove: (...cls: string[]) => cls.forEach(c => this.classList.classes.delete(c)),
    contains: (c: string) => this.classList.classes.has(c),
    toggle: (c: string, force?: boolean) => {
      if (force !== undefined) {
        if (force) this.classList.classes.add(c);
        else this.classList.classes.delete(c);
      } else {
        if (this.classList.classes.has(c)) this.classList.classes.delete(c);
        else this.classList.classes.add(c);
      }
    }
  };

  public setAttribute(k: string, v: string) { this.attributes[k] = v; }
  public getAttribute(k: string) { return this.attributes[k] ?? null; }

  public addEventListener(event: string, cb: (e: any) => void) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(cb);
  }

  public click() {
    this.eventListeners['click']?.forEach(cb => cb({ preventDefault: () => {} }));
  }

  public focus() {}
  public select() {}

  public querySelector(sel: string): any {
    if (sel.startsWith('#')) {
      const id = sel.substring(1);
      return this.elementsById.get(id) || null;
    }
    const all = this.querySelectorAll(sel);
    return all.length > 0 ? all[0] : null;
  }

  public querySelectorAll(sel: string): any[] {
    const results: MockElement[] = [];
    if (sel.includes('button')) {
      const b8 = new MockElement('button');
      b8.setAttribute('data-base', '8');
      b8.textContent = '08H-0FH';
      results.push(b8);
    }
    return results;
  }
}

if (typeof document === 'undefined') {
  (global as any).document = {
    createElement: (tag: string) => new MockElement(tag),
    querySelectorAll: () => []
  };
  (global as any).window = {};
}

async function runTests() {
  console.log('===============================================================');
  console.log('TEST SUITE: Universal Peripheral Devices & Arbitrary Code Support');
  console.log('===============================================================');

  const cpu = new Intel8085();
  const perifs = new PeripheralsManager(cpu);
  const assembler = new Assembler8085();

  // 1. TEST CRT TERMINAL WITH STATIC .DATA (Any Code Test)
  {
    const code = `
      .data 0E000H
      dB "HOLA MUNDO!", 00H
      .org 0100H
      HLT
    `;
    const res = assembler.assemble(code);
    assert.strictEqual(res.success, true, 'Assembly must succeed');
    cpu.memory.set(res.memory);

    const crt = createCrtTerminalPanel(cpu, perifs);
    const textElem = crt.element.querySelector('#crt-text') as unknown as MockElement;
    assert.ok(textElem.textContent.includes('HOLA MUNDO!'), 'CRT Terminal must display static .data 0E000H content');
    console.log('✅ [PASS] CRT Terminal displays static .data 0E000H content without needing runtime instructions');
    crt.destroy();
  }

  // 2. TEST CRT TERMINAL DYNAMIC RUNTIME WRITE (MOV M, A, STAX)
  {
    const crt = createCrtTerminalPanel(cpu, perifs);
    const code = `
      .org 0100H
      LXI H, 0E000H
      MVI A, 41H ; 'A'
      MOV M, A
      INX H
      MVI A, 42H ; 'B'
      MOV M, A
      INX H
      MVI A, 43H ; 'C'
      MOV M, A
      HLT
    `;
    const res = assembler.assemble(code);
    cpu.memory.set(res.memory);
    cpu.regs.pc = res.entryPoint;
    cpu.halted = false;

    while (!cpu.halted) {
      cpu.step();
    }

    const textElem = crt.element.querySelector('#crt-text') as unknown as MockElement;
    assert.ok(textElem.textContent.includes('ABC'), 'CRT Terminal must update dynamically on MOV M, A');
    console.log('✅ [PASS] CRT Terminal updates dynamically on runtime memory writes (MOV M, A)');
    crt.destroy();
  }

  // 3. TEST CRT EXTENDED CP437 CHARACTERS (Accents & Box drawing)
  {
    const crt = createCrtTerminalPanel(cpu, perifs);
    // 160 = 'á', 164 = 'ñ', 205 = '═', 201 = '╔', 187 = '╗'
    cpu.writeByte(0xE000, 201); // ╔
    cpu.writeByte(0xE001, 205); // ═
    cpu.writeByte(0xE002, 187); // ╗
    cpu.writeByte(0xE028, 160); // á (line 1, col 0)
    cpu.writeByte(0xE029, 164); // ñ
    crt.update();

    const textElem = crt.element.querySelector('#crt-text') as unknown as MockElement;
    assert.ok(textElem.textContent.includes('╔═╗'), 'CRT Terminal must render CP437 box characters');
    assert.ok(textElem.textContent.includes('áñ'), 'CRT Terminal must render Spanish CP437 characters');
    console.log('✅ [PASS] CRT Terminal renders CP437 box drawing and Spanish characters');
    crt.destroy();
  }

  // 4. TEST 7-SEGMENT DISPLAY ON ARBITRARY PORT (e.g. OUT 08H from ejemplo 26)
  {
    const d7 = createDisplays7Panel(perifs);
    // Write to port 08H (Ascensor floor display)
    cpu.writeByte(0x0100, 0x3E); // MVI A, 77H ('0')
    cpu.writeByte(0x0101, 0x77);
    cpu.writeByte(0x0102, 0xD3); // OUT 08H
    cpu.writeByte(0x0103, 0x08);
    cpu.writeByte(0x0104, 0x76); // HLT
    cpu.regs.pc = 0x0100;
    cpu.halted = false;

    while (!cpu.halted) {
      cpu.step();
    }

    assert.strictEqual(perifs.state.portsOut[0x08], 0x77, 'Port 08H must have 77H');
    console.log('✅ [PASS] 7-Segment Displays state updated on Port 08H');
    d7.destroy();
  }

  // 5. TEST LED MATRIX ON ARBITRARY PORTS (OUT 00H through OUT 07H)
  {
    const leds = createLedsPanel(perifs);
    cpu.writeByte(0x0100, 0x3E); // MVI A, 0FFH
    cpu.writeByte(0x0101, 0xFF);
    cpu.writeByte(0x0102, 0xD3); // OUT 03H
    cpu.writeByte(0x0103, 0x03);
    cpu.writeByte(0x0104, 0x76);
    cpu.regs.pc = 0x0100;
    cpu.halted = false;

    while (!cpu.halted) {
      cpu.step();
    }

    assert.strictEqual(perifs.state.portsOut[0x03], 0xFF, 'Port 03H must be 0xFF');
    console.log('✅ [PASS] LED Matrix correctly receives arbitrary port outputs');
    leds.destroy();
  }

  // 6. TEST DIP SWITCHES PRESERVED DURING KEYBOARD USE
  {
    perifs.setDipSwitchesByte(0x55);
    assert.strictEqual(perifs.state.portsIn[0], 0x55, 'DIP switches must be 0x55');

    // Key pressed
    perifs.pressKey('A');
    assert.strictEqual(perifs.state.portsIn[0], 65, 'Key A (65) on port 0 during press');

    // Key released
    perifs.releaseKey();
    assert.strictEqual(perifs.state.portsIn[0], 0x55, 'DIP switches 0x55 must be restored upon release');
    console.log('✅ [PASS] DIP Switches state is preserved when releasing keyboard keys');
  }

  console.log('===============================================================');
  console.log('ALL UNIVERSAL PERIPHERAL TESTS PASSED (6/6)!');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
