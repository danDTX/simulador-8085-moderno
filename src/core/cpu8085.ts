import { CpuRegisters, CpuFlags, InterruptState, CpuSnapshot, MemWriteRecord } from './types.js';

export class Intel8085 {
  public regs: CpuRegisters = {
    a: 0,
    b: 0,
    c: 0,
    d: 0,
    e: 0,
    h: 0,
    l: 0,
    sp: 0xffff,
    pc: 0x0000,
  };

  public flags: CpuFlags = {
    s: false,
    z: false,
    ac: false,
    p: false,
    cy: false,
  };

  public interrupts: InterruptState = {
    inte: false,
    trap: false,
    rst75: false,
    rst65: false,
    rst55: false,
    intr: false,
    intrVector: 0xcd,
    mask75: false,
    mask65: false,
    mask55: false,
  };

  public memory: Uint8Array = new Uint8Array(65536);
  public halted: boolean = false;
  public totalCycles: number = 0;
  public sidBit: boolean = false;
  public sodBit: boolean = false;

  public breakpoints: Set<number> = new Set();
  public recordHistory: boolean = true;
  private historyBuffer: CpuSnapshot[] = [];
  public static readonly MAX_HISTORY: number = 64;
  private currentStepMemWrites: MemWriteRecord[] = [];

  public onPortRead?: (port: number) => number;
  public onPortWrite?: (port: number, val: number) => void;
  public onMemoryWrite?: (addr: number, val: number) => void;
  public onInvalidOpcode?: (opcode: number, pc: number) => void;

  private static parityTable: boolean[] = [];

  static {
    for (let i = 0; i < 256; i++) {
      let ones = 0;
      for (let b = 0; b < 8; b++) {
        if ((i >> b) & 1) ones++;
      }
      Intel8085.parityTable[i] = (ones % 2 === 0);
    }
  }

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.regs.a = 0;
    this.regs.b = 0;
    this.regs.c = 0;
    this.regs.d = 0;
    this.regs.e = 0;
    this.regs.h = 0;
    this.regs.l = 0;
    this.regs.sp = 0xffff;
    this.regs.pc = 0x0000;

    this.flags.s = false;
    this.flags.z = false;
    this.flags.ac = false;
    this.flags.p = false;
    this.flags.cy = false;

    this.interrupts.inte = false;
    this.interrupts.trap = false;
    this.interrupts.rst75 = false;
    this.interrupts.rst65 = false;
    this.interrupts.rst55 = false;
    this.interrupts.intr = false;
    this.interrupts.mask75 = false;
    this.interrupts.mask65 = false;
    this.interrupts.mask55 = false;

    this.halted = false;
    this.totalCycles = 0;
    this.sidBit = false;
    this.sodBit = false;
    this.clearHistory();
  }

  public toggleBreakpoint(addr: number): boolean {
    const a = addr & 0xffff;
    if (this.breakpoints.has(a)) {
      this.breakpoints.delete(a);
      return false;
    } else {
      this.breakpoints.add(a);
      return true;
    }
  }

  public hasBreakpoint(addr: number): boolean {
    return this.breakpoints.has(addr & 0xffff);
  }

  public clearBreakpoints(): void {
    this.breakpoints.clear();
  }

  public stepBack(): boolean {
    if (this.historyBuffer.length === 0) return false;
    const snap = this.historyBuffer.pop()!;
    // Revert memory writes in reverse order
    for (let i = snap.memWrites.length - 1; i >= 0; i--) {
      const w = snap.memWrites[i];
      this.memory[w.addr] = w.prevVal;
      if (this.onMemoryWrite) {
        this.onMemoryWrite(w.addr, w.prevVal);
      }
    }
    this.regs = { ...snap.regs };
    this.flags = { ...snap.flags };
    this.interrupts = { ...snap.interrupts };
    this.halted = snap.halted;
    this.totalCycles = snap.totalCycles;
    this.sidBit = snap.sidBit;
    this.sodBit = snap.sodBit;
    return true;
  }

  public getHistoryLength(): number {
    return this.historyBuffer.length;
  }

  public clearHistory(): void {
    this.historyBuffer = [];
    this.currentStepMemWrites = [];
  }

  public readByte(addr: number): number {
    return this.memory[addr & 0xffff];
  }

  public writeByte(addr: number, val: number): void {
    const a = addr & 0xffff;
    const v = val & 0xff;
    if (this.recordHistory) {
      this.currentStepMemWrites.push({ addr: a, prevVal: this.memory[a] });
    }
    this.memory[a] = v;
    if (this.onMemoryWrite) {
      this.onMemoryWrite(a, v);
    }
  }

  public readWord(addr: number): number {
    const low = this.readByte(addr);
    const high = this.readByte(addr + 1);
    return (high << 8) | low;
  }

  public writeWord(addr: number, val: number): void {
    this.writeByte(addr, val & 0xff);
    this.writeByte(addr + 1, (val >> 8) & 0xff);
  }

  public getPSW(): number {
    let psw = 0; // In 8085sim and console UI, unused bits (5, 3, 1) are kept 0
    if (this.flags.s) psw |= 0x80;
    if (this.flags.z) psw |= 0x40;
    if (this.flags.ac) psw |= 0x10;
    if (this.flags.p) psw |= 0x04;
    if (this.flags.cy) psw |= 0x01;
    return psw;
  }

  public setPSW(val: number): void {
    this.flags.s = (val & 0x80) !== 0;
    this.flags.z = (val & 0x40) !== 0;
    this.flags.ac = (val & 0x10) !== 0;
    this.flags.p = (val & 0x04) !== 0;
    this.flags.cy = (val & 0x01) !== 0;
  }

  private setSZP(val: number): void {
    const b = val & 0xff;
    this.flags.z = (b === 0);
    this.flags.s = (b & 0x80) !== 0;
    this.flags.p = Intel8085.parityTable[b];
  }

  private getBC(): number { return (this.regs.b << 8) | this.regs.c; }
  private setBC(val: number): void {
    this.regs.b = (val >> 8) & 0xff;
    this.regs.c = val & 0xff;
  }

  private getDE(): number { return (this.regs.d << 8) | this.regs.e; }
  private setDE(val: number): void {
    this.regs.d = (val >> 8) & 0xff;
    this.regs.e = val & 0xff;
  }

  private getHL(): number { return (this.regs.h << 8) | this.regs.l; }
  private setHL(val: number): void {
    this.regs.h = (val >> 8) & 0xff;
    this.regs.l = val & 0xff;
  }

  private pushWord(val: number): void {
    this.regs.sp = (this.regs.sp - 2) & 0xffff;
    this.writeWord(this.regs.sp, val);
  }

  private popWord(): number {
    const val = this.readWord(this.regs.sp);
    this.regs.sp = (this.regs.sp + 2) & 0xffff;
    return val;
  }

  public checkInterrupts(): boolean {
    if (this.interrupts.trap) {
      this.interrupts.trap = false;
      this.halted = false;
      // Do not NOP-slide into adjacent vectors if vector is unhandled (empty/NOP)
      if (this.memory[0x0024] === 0x00) {
        return false;
      }
      this.pushWord(this.regs.pc);
      this.regs.pc = 0x0024;
      return true;
    }
    if (!this.interrupts.inte) return false;

    if (this.interrupts.rst75 && !this.interrupts.mask75) {
      this.interrupts.rst75 = false;
      this.interrupts.inte = false;
      this.halted = false;
      if (this.memory[0x003c] === 0x00) {
        this.interrupts.inte = true;
        return false;
      }
      this.pushWord(this.regs.pc);
      this.regs.pc = 0x003c;
      return true;
    }
    if (this.interrupts.rst65 && !this.interrupts.mask65) {
      this.interrupts.rst65 = false;
      this.interrupts.inte = false;
      this.halted = false;
      if (this.memory[0x0034] === 0x00) {
        this.interrupts.inte = true;
        return false;
      }
      this.pushWord(this.regs.pc);
      this.regs.pc = 0x0034;
      return true;
    }
    if (this.interrupts.rst55 && !this.interrupts.mask55) {
      this.interrupts.rst55 = false;
      this.interrupts.inte = false;
      this.halted = false;
      if (this.memory[0x002c] === 0x00) {
        this.interrupts.inte = true;
        return false;
      }
      this.pushWord(this.regs.pc);
      this.regs.pc = 0x002c;
      return true;
    }
    if (this.interrupts.intr) {
      this.interrupts.intr = false;
      this.interrupts.inte = false;
      this.halted = false;
      const targetVec = this.interrupts.intrVector & 0xffff;
      if (this.memory[targetVec] === 0x00) {
        this.interrupts.inte = true;
        return false;
      }
      this.pushWord(this.regs.pc);
      this.regs.pc = targetVec;
      return true;
    }
    return false;
  }

  private add8(val: number, carry: number): number {
    const a = this.regs.a;
    const res = a + val + carry;
    this.flags.ac = ((a & 0x0f) + (val & 0x0f) + carry) > 0x0f;
    this.flags.cy = res > 0xff;
    this.setSZP(res);
    return res & 0xff;
  }

  private sub8(val: number, borrow: number): number {
    const a = this.regs.a;
    const res = a - val - borrow;
    this.flags.ac = ((a & 0x0f) - (val & 0x0f) - borrow) < 0;
    this.flags.cy = res < 0;
    this.setSZP(res);
    return res & 0xff;
  }

  private dad16(val: number): void {
    const hl = this.getHL();
    const sum = hl + val;
    this.flags.cy = sum > 0xffff;
    this.setHL(sum & 0xffff);
  }

  private inr8(val: number): number {
    const res = (val + 1) & 0xff;
    this.flags.ac = (val & 0x0f) === 0x0f;
    this.setSZP(res);
    return res;
  }

  private dcr8(val: number): number {
    const res = (val - 1) & 0xff;
    this.flags.ac = (val & 0x0f) === 0x00;
    this.setSZP(res);
    return res;
  }

  public step(): number {
    let snapshot: CpuSnapshot | null = null;
    if (this.recordHistory) {
      snapshot = {
        regs: { ...this.regs },
        flags: { ...this.flags },
        interrupts: { ...this.interrupts },
        halted: this.halted,
        totalCycles: this.totalCycles,
        sidBit: this.sidBit,
        sodBit: this.sodBit,
        memWrites: [],
      };
      this.currentStepMemWrites = [];
    }

    if (this.checkInterrupts()) {
      this.totalCycles += 12;
      if (snapshot) {
        snapshot.memWrites = [...this.currentStepMemWrites];
        this.historyBuffer.push(snapshot);
        if (this.historyBuffer.length > Intel8085.MAX_HISTORY) {
          this.historyBuffer.shift();
        }
      }
      return 12; // Interrupt ACK cycles
    }

    if (this.halted) {
      return 4;
    }

    const pc = this.regs.pc;
    const op = this.readByte(pc);
    this.regs.pc = (pc + 1) & 0xffff;

    let cycles = 4;

    switch (op) {
      case 0x00: break; // NOP
      case 0x76: this.halted = true; cycles = 5; break; // HLT

      // LXI
      case 0x01: this.setBC(this.readWord(this.regs.pc)); this.regs.pc += 2; cycles = 10; break;
      case 0x11: this.setDE(this.readWord(this.regs.pc)); this.regs.pc += 2; cycles = 10; break;
      case 0x21: this.setHL(this.readWord(this.regs.pc)); this.regs.pc += 2; cycles = 10; break;
      case 0x31: this.regs.sp = this.readWord(this.regs.pc); this.regs.pc += 2; cycles = 10; break;

      // STAX
      case 0x02: this.writeByte(this.getBC(), this.regs.a); cycles = 7; break;
      case 0x12: this.writeByte(this.getDE(), this.regs.a); cycles = 7; break;

      // LDAX
      case 0x0A: this.regs.a = this.readByte(this.getBC()); cycles = 7; break;
      case 0x1A: this.regs.a = this.readByte(this.getDE()); cycles = 7; break;

      // SHLD / LHLD
      case 0x22: {
        const addr = this.readWord(this.regs.pc); this.regs.pc += 2;
        this.writeWord(addr, this.getHL()); cycles = 16; break;
      }
      case 0x2A: {
        const addr = this.readWord(this.regs.pc); this.regs.pc += 2;
        this.setHL(this.readWord(addr)); cycles = 16; break;
      }

      // STA / LDA
      case 0x32: {
        const addr = this.readWord(this.regs.pc); this.regs.pc += 2;
        this.writeByte(addr, this.regs.a); cycles = 13; break;
      }
      case 0x3A: {
        const addr = this.readWord(this.regs.pc); this.regs.pc += 2;
        this.regs.a = this.readByte(addr); cycles = 13; break;
      }

      // INX
      case 0x03: this.setBC((this.getBC() + 1) & 0xffff); cycles = 6; break;
      case 0x13: this.setDE((this.getDE() + 1) & 0xffff); cycles = 6; break;
      case 0x23: this.setHL((this.getHL() + 1) & 0xffff); cycles = 6; break;
      case 0x33: this.regs.sp = (this.regs.sp + 1) & 0xffff; cycles = 6; break;

      // DCX
      case 0x0B: this.setBC((this.getBC() - 1) & 0xffff); cycles = 6; break;
      case 0x1B: this.setDE((this.getDE() - 1) & 0xffff); cycles = 6; break;
      case 0x2B: this.setHL((this.getHL() - 1) & 0xffff); cycles = 6; break;
      case 0x3B: this.regs.sp = (this.regs.sp - 1) & 0xffff; cycles = 6; break;

      // INR
      case 0x04: this.regs.b = this.inr8(this.regs.b); break;
      case 0x0C: this.regs.c = this.inr8(this.regs.c); break;
      case 0x14: this.regs.d = this.inr8(this.regs.d); break;
      case 0x1C: this.regs.e = this.inr8(this.regs.e); break;
      case 0x24: this.regs.h = this.inr8(this.regs.h); break;
      case 0x2C: this.regs.l = this.inr8(this.regs.l); break;
      case 0x34: {
        const hl = this.getHL();
        this.writeByte(hl, this.inr8(this.readByte(hl)));
        cycles = 10; break;
      }
      case 0x3C: this.regs.a = this.inr8(this.regs.a); break;

      // DCR
      case 0x05: this.regs.b = this.dcr8(this.regs.b); break;
      case 0x0D: this.regs.c = this.dcr8(this.regs.c); break;
      case 0x15: this.regs.d = this.dcr8(this.regs.d); break;
      case 0x1D: this.regs.e = this.dcr8(this.regs.e); break;
      case 0x25: this.regs.h = this.dcr8(this.regs.h); break;
      case 0x2D: this.regs.l = this.dcr8(this.regs.l); break;
      case 0x35: {
        const hl = this.getHL();
        this.writeByte(hl, this.dcr8(this.readByte(hl)));
        cycles = 10; break;
      }
      case 0x3D: this.regs.a = this.dcr8(this.regs.a); break;

      // MVI
      case 0x06: this.regs.b = this.readByte(this.regs.pc++); cycles = 7; break;
      case 0x0E: this.regs.c = this.readByte(this.regs.pc++); cycles = 7; break;
      case 0x16: this.regs.d = this.readByte(this.regs.pc++); cycles = 7; break;
      case 0x1E: this.regs.e = this.readByte(this.regs.pc++); cycles = 7; break;
      case 0x26: this.regs.h = this.readByte(this.regs.pc++); cycles = 7; break;
      case 0x2E: this.regs.l = this.readByte(this.regs.pc++); cycles = 7; break;
      case 0x36: this.writeByte(this.getHL(), this.readByte(this.regs.pc++)); cycles = 10; break;
      case 0x3E: this.regs.a = this.readByte(this.regs.pc++); cycles = 7; break;

      // DAD
      case 0x09: this.dad16(this.getBC()); cycles = 10; break;
      case 0x19: this.dad16(this.getDE()); cycles = 10; break;
      case 0x29: this.dad16(this.getHL()); cycles = 10; break;
      case 0x39: this.dad16(this.regs.sp); cycles = 10; break;

      // Rotates
      case 0x07: { // RLC
        const bit7 = (this.regs.a & 0x80) >> 7;
        this.flags.cy = (bit7 === 1);
        this.regs.a = ((this.regs.a << 1) | bit7) & 0xff;
        break;
      }
      case 0x0F: { // RRC
        const bit0 = this.regs.a & 1;
        this.flags.cy = (bit0 === 1);
        this.regs.a = ((this.regs.a >> 1) | (bit0 << 7)) & 0xff;
        break;
      }
      case 0x17: { // RAL
        const oldCy = this.flags.cy ? 1 : 0;
        this.flags.cy = (this.regs.a & 0x80) !== 0;
        this.regs.a = ((this.regs.a << 1) | oldCy) & 0xff;
        break;
      }
      case 0x1F: { // RAR
        const oldCy = this.flags.cy ? 1 : 0;
        this.flags.cy = (this.regs.a & 1) !== 0;
        this.regs.a = ((this.regs.a >> 1) | (oldCy << 7)) & 0xff;
        break;
      }

      // DAA
      case 0x27: {
        let a = this.regs.a;
        let cy = this.flags.cy;
        let ac = this.flags.ac;
        if ((a & 0x0f) > 9 || ac) {
          if ((a & 0x0f) + 6 > 0x0f) ac = true;
          a += 6;
        }
        if (a > 0x9f || cy) {
          a += 0x60;
          cy = true;
        }
        this.flags.cy = cy;
        this.flags.ac = ac;
        this.regs.a = a & 0xff;
        this.setSZP(this.regs.a);
        break;
      }

      // CMA, STC, CMC
      case 0x2F: this.regs.a = (~this.regs.a) & 0xff; break; // CMA
      case 0x37: this.flags.cy = true; break; // STC
      case 0x3F: this.flags.cy = !this.flags.cy; break; // CMC

      // MOV (0x40 - 0x7F)
      case 0x40: this.regs.b = this.regs.b; break;
      case 0x41: this.regs.b = this.regs.c; break;
      case 0x42: this.regs.b = this.regs.d; break;
      case 0x43: this.regs.b = this.regs.e; break;
      case 0x44: this.regs.b = this.regs.h; break;
      case 0x45: this.regs.b = this.regs.l; break;
      case 0x46: this.regs.b = this.readByte(this.getHL()); cycles = 7; break;
      case 0x47: this.regs.b = this.regs.a; break;

      case 0x48: this.regs.c = this.regs.b; break;
      case 0x49: this.regs.c = this.regs.c; break;
      case 0x4A: this.regs.c = this.regs.d; break;
      case 0x4B: this.regs.c = this.regs.e; break;
      case 0x4C: this.regs.c = this.regs.h; break;
      case 0x4D: this.regs.c = this.regs.l; break;
      case 0x4E: this.regs.c = this.readByte(this.getHL()); cycles = 7; break;
      case 0x4F: this.regs.c = this.regs.a; break;

      case 0x50: this.regs.d = this.regs.b; break;
      case 0x51: this.regs.d = this.regs.c; break;
      case 0x52: this.regs.d = this.regs.d; break;
      case 0x53: this.regs.d = this.regs.e; break;
      case 0x54: this.regs.d = this.regs.h; break;
      case 0x55: this.regs.d = this.regs.l; break;
      case 0x56: this.regs.d = this.readByte(this.getHL()); cycles = 7; break;
      case 0x57: this.regs.d = this.regs.a; break;

      case 0x58: this.regs.e = this.regs.b; break;
      case 0x59: this.regs.e = this.regs.c; break;
      case 0x5A: this.regs.e = this.regs.d; break;
      case 0x5B: this.regs.e = this.regs.e; break;
      case 0x5C: this.regs.e = this.regs.h; break;
      case 0x5D: this.regs.e = this.regs.l; break;
      case 0x5E: this.regs.e = this.readByte(this.getHL()); cycles = 7; break;
      case 0x5F: this.regs.e = this.regs.a; break;

      case 0x60: this.regs.h = this.regs.b; break;
      case 0x61: this.regs.h = this.regs.c; break;
      case 0x62: this.regs.h = this.regs.d; break;
      case 0x63: this.regs.h = this.regs.e; break;
      case 0x64: this.regs.h = this.regs.h; break;
      case 0x65: this.regs.h = this.regs.l; break;
      case 0x66: this.regs.h = this.readByte(this.getHL()); cycles = 7; break;
      case 0x67: this.regs.h = this.regs.a; break;

      case 0x68: this.regs.l = this.regs.b; break;
      case 0x69: this.regs.l = this.regs.c; break;
      case 0x6A: this.regs.l = this.regs.d; break;
      case 0x6B: this.regs.l = this.regs.e; break;
      case 0x6C: this.regs.l = this.regs.h; break;
      case 0x6D: this.regs.l = this.regs.l; break;
      case 0x6E: this.regs.l = this.readByte(this.getHL()); cycles = 7; break;
      case 0x6F: this.regs.l = this.regs.a; break;

      case 0x70: this.writeByte(this.getHL(), this.regs.b); cycles = 7; break;
      case 0x71: this.writeByte(this.getHL(), this.regs.c); cycles = 7; break;
      case 0x72: this.writeByte(this.getHL(), this.regs.d); cycles = 7; break;
      case 0x73: this.writeByte(this.getHL(), this.regs.e); cycles = 7; break;
      case 0x74: this.writeByte(this.getHL(), this.regs.h); cycles = 7; break;
      case 0x75: this.writeByte(this.getHL(), this.regs.l); cycles = 7; break;
      case 0x77: this.writeByte(this.getHL(), this.regs.a); cycles = 7; break;

      case 0x78: this.regs.a = this.regs.b; break;
      case 0x79: this.regs.a = this.regs.c; break;
      case 0x7A: this.regs.a = this.regs.d; break;
      case 0x7B: this.regs.a = this.regs.e; break;
      case 0x7C: this.regs.a = this.regs.h; break;
      case 0x7D: this.regs.a = this.regs.l; break;
      case 0x7E: this.regs.a = this.readByte(this.getHL()); cycles = 7; break;
      case 0x7F: this.regs.a = this.regs.a; break;

      // ADD
      case 0x80: this.regs.a = this.add8(this.regs.b, 0); break;
      case 0x81: this.regs.a = this.add8(this.regs.c, 0); break;
      case 0x82: this.regs.a = this.add8(this.regs.d, 0); break;
      case 0x83: this.regs.a = this.add8(this.regs.e, 0); break;
      case 0x84: this.regs.a = this.add8(this.regs.h, 0); break;
      case 0x85: this.regs.a = this.add8(this.regs.l, 0); break;
      case 0x86: this.regs.a = this.add8(this.readByte(this.getHL()), 0); cycles = 7; break;
      case 0x87: this.regs.a = this.add8(this.regs.a, 0); break;

      // ADC
      case 0x88: this.regs.a = this.add8(this.regs.b, this.flags.cy ? 1 : 0); break;
      case 0x89: this.regs.a = this.add8(this.regs.c, this.flags.cy ? 1 : 0); break;
      case 0x8A: this.regs.a = this.add8(this.regs.d, this.flags.cy ? 1 : 0); break;
      case 0x8B: this.regs.a = this.add8(this.regs.e, this.flags.cy ? 1 : 0); break;
      case 0x8C: this.regs.a = this.add8(this.regs.h, this.flags.cy ? 1 : 0); break;
      case 0x8D: this.regs.a = this.add8(this.regs.l, this.flags.cy ? 1 : 0); break;
      case 0x8E: this.regs.a = this.add8(this.readByte(this.getHL()), this.flags.cy ? 1 : 0); cycles = 7; break;
      case 0x8F: this.regs.a = this.add8(this.regs.a, this.flags.cy ? 1 : 0); break;

      // SUB
      case 0x90: this.regs.a = this.sub8(this.regs.b, 0); break;
      case 0x91: this.regs.a = this.sub8(this.regs.c, 0); break;
      case 0x92: this.regs.a = this.sub8(this.regs.d, 0); break;
      case 0x93: this.regs.a = this.sub8(this.regs.e, 0); break;
      case 0x94: this.regs.a = this.sub8(this.regs.h, 0); break;
      case 0x95: this.regs.a = this.sub8(this.regs.l, 0); break;
      case 0x96: this.regs.a = this.sub8(this.readByte(this.getHL()), 0); cycles = 7; break;
      case 0x97: this.regs.a = this.sub8(this.regs.a, 0); break;

      // SBB
      case 0x98: this.regs.a = this.sub8(this.regs.b, this.flags.cy ? 1 : 0); break;
      case 0x99: this.regs.a = this.sub8(this.regs.c, this.flags.cy ? 1 : 0); break;
      case 0x9A: this.regs.a = this.sub8(this.regs.d, this.flags.cy ? 1 : 0); break;
      case 0x9B: this.regs.a = this.sub8(this.regs.e, this.flags.cy ? 1 : 0); break;
      case 0x9C: this.regs.a = this.sub8(this.regs.h, this.flags.cy ? 1 : 0); break;
      case 0x9D: this.regs.a = this.sub8(this.regs.l, this.flags.cy ? 1 : 0); break;
      case 0x9E: this.regs.a = this.sub8(this.readByte(this.getHL()), this.flags.cy ? 1 : 0); cycles = 7; break;
      case 0x9F: this.regs.a = this.sub8(this.regs.a, this.flags.cy ? 1 : 0); break;

      // ANA
      case 0xA0: this.regs.a &= this.regs.b; this.flags.cy = false; this.flags.ac = true; this.setSZP(this.regs.a); break;
      case 0xA1: this.regs.a &= this.regs.c; this.flags.cy = false; this.flags.ac = true; this.setSZP(this.regs.a); break;
      case 0xA2: this.regs.a &= this.regs.d; this.flags.cy = false; this.flags.ac = true; this.setSZP(this.regs.a); break;
      case 0xA3: this.regs.a &= this.regs.e; this.flags.cy = false; this.flags.ac = true; this.setSZP(this.regs.a); break;
      case 0xA4: this.regs.a &= this.regs.h; this.flags.cy = false; this.flags.ac = true; this.setSZP(this.regs.a); break;
      case 0xA5: this.regs.a &= this.regs.l; this.flags.cy = false; this.flags.ac = true; this.setSZP(this.regs.a); break;
      case 0xA6: this.regs.a &= this.readByte(this.getHL()); this.flags.cy = false; this.flags.ac = true; this.setSZP(this.regs.a); cycles = 7; break;
      case 0xA7: this.regs.a &= this.regs.a; this.flags.cy = false; this.flags.ac = true; this.setSZP(this.regs.a); break;

      // XRA
      case 0xA8: this.regs.a ^= this.regs.b; this.flags.cy = false; this.flags.ac = false; this.setSZP(this.regs.a); break;
      case 0xA9: this.regs.a ^= this.regs.c; this.flags.cy = false; this.flags.ac = false; this.setSZP(this.regs.a); break;
      case 0xAA: this.regs.a ^= this.regs.d; this.flags.cy = false; this.flags.ac = false; this.setSZP(this.regs.a); break;
      case 0xAB: this.regs.a ^= this.regs.e; this.flags.cy = false; this.flags.ac = false; this.setSZP(this.regs.a); break;
      case 0xAC: this.regs.a ^= this.regs.h; this.flags.cy = false; this.flags.ac = false; this.setSZP(this.regs.a); break;
      case 0xAD: this.regs.a ^= this.regs.l; this.flags.cy = false; this.flags.ac = false; this.setSZP(this.regs.a); break;
      case 0xAE: this.regs.a ^= this.readByte(this.getHL()); this.flags.cy = false; this.flags.ac = false; this.setSZP(this.regs.a); cycles = 7; break;
      case 0xAF: this.regs.a ^= this.regs.a; this.flags.cy = false; this.flags.ac = false; this.setSZP(this.regs.a); break;

      // ORA
      case 0xB0: this.regs.a |= this.regs.b; this.flags.cy = false; this.flags.ac = false; this.setSZP(this.regs.a); break;
      case 0xB1: this.regs.a |= this.regs.c; this.flags.cy = false; this.flags.ac = false; this.setSZP(this.regs.a); break;
      case 0xB2: this.regs.a |= this.regs.d; this.flags.cy = false; this.flags.ac = false; this.setSZP(this.regs.a); break;
      case 0xB3: this.regs.a |= this.regs.e; this.flags.cy = false; this.flags.ac = false; this.setSZP(this.regs.a); break;
      case 0xB4: this.regs.a |= this.regs.h; this.flags.cy = false; this.flags.ac = false; this.setSZP(this.regs.a); break;
      case 0xB5: this.regs.a |= this.regs.l; this.flags.cy = false; this.flags.ac = false; this.setSZP(this.regs.a); break;
      case 0xB6: this.regs.a |= this.readByte(this.getHL()); this.flags.cy = false; this.flags.ac = false; this.setSZP(this.regs.a); cycles = 7; break;
      case 0xB7: this.regs.a |= this.regs.a; this.flags.cy = false; this.flags.ac = false; this.setSZP(this.regs.a); break;

      // CMP
      case 0xB8: this.sub8(this.regs.b, 0); break;
      case 0xB9: this.sub8(this.regs.c, 0); break;
      case 0xBA: this.sub8(this.regs.d, 0); break;
      case 0xBB: this.sub8(this.regs.e, 0); break;
      case 0xBC: this.sub8(this.regs.h, 0); break;
      case 0xBD: this.sub8(this.regs.l, 0); break;
      case 0xBE: this.sub8(this.readByte(this.getHL()), 0); cycles = 7; break;
      case 0xBF: this.sub8(this.regs.a, 0); break;

      // Immediate Arithmetic / Logic
      case 0xC6: this.regs.a = this.add8(this.readByte(this.regs.pc++), 0); cycles = 7; break; // ADI
      case 0xCE: this.regs.a = this.add8(this.readByte(this.regs.pc++), this.flags.cy ? 1 : 0); cycles = 7; break; // ACI
      case 0xD6: this.regs.a = this.sub8(this.readByte(this.regs.pc++), 0); cycles = 7; break; // SUI
      case 0xDE: this.regs.a = this.sub8(this.readByte(this.regs.pc++), this.flags.cy ? 1 : 0); cycles = 7; break; // SBI
      case 0xE6: { // ANI
        this.regs.a &= this.readByte(this.regs.pc++);
        this.flags.cy = false;
        this.flags.ac = true;
        this.setSZP(this.regs.a);
        cycles = 7; break;
      }
      case 0xEE: { // XRI
        this.regs.a ^= this.readByte(this.regs.pc++);
        this.flags.cy = false;
        this.flags.ac = false;
        this.setSZP(this.regs.a);
        cycles = 7; break;
      }
      case 0xF6: { // ORI
        this.regs.a |= this.readByte(this.regs.pc++);
        this.flags.cy = false;
        this.flags.ac = false;
        this.setSZP(this.regs.a);
        cycles = 7; break;
      }
      case 0xFE: { // CPI
        this.sub8(this.readByte(this.regs.pc++), 0);
        cycles = 7; break;
      }

      // JMP / Conditional JMP
      case 0xC3: this.regs.pc = this.readWord(this.regs.pc); cycles = 10; break;
      case 0xC2: { // JNZ
        const target = this.readWord(this.regs.pc); this.regs.pc += 2;
        if (!this.flags.z) { this.regs.pc = target; cycles = 10; } else { cycles = 7; }
        break;
      }
      case 0xCA: { // JZ
        const target = this.readWord(this.regs.pc); this.regs.pc += 2;
        if (this.flags.z) { this.regs.pc = target; cycles = 10; } else { cycles = 7; }
        break;
      }
      case 0xD2: { // JNC
        const target = this.readWord(this.regs.pc); this.regs.pc += 2;
        if (!this.flags.cy) { this.regs.pc = target; cycles = 10; } else { cycles = 7; }
        break;
      }
      case 0xDA: { // JC
        const target = this.readWord(this.regs.pc); this.regs.pc += 2;
        if (this.flags.cy) { this.regs.pc = target; cycles = 10; } else { cycles = 7; }
        break;
      }
      case 0xE2: { // JPO
        const target = this.readWord(this.regs.pc); this.regs.pc += 2;
        if (!this.flags.p) { this.regs.pc = target; cycles = 10; } else { cycles = 7; }
        break;
      }
      case 0xEA: { // JPE
        const target = this.readWord(this.regs.pc); this.regs.pc += 2;
        if (this.flags.p) { this.regs.pc = target; cycles = 10; } else { cycles = 7; }
        break;
      }
      case 0xF2: { // JP (positive, sign == 0)
        const target = this.readWord(this.regs.pc); this.regs.pc += 2;
        if (!this.flags.s) { this.regs.pc = target; cycles = 10; } else { cycles = 7; }
        break;
      }
      case 0xFA: { // JM (minus, sign == 1)
        const target = this.readWord(this.regs.pc); this.regs.pc += 2;
        if (this.flags.s) { this.regs.pc = target; cycles = 10; } else { cycles = 7; }
        break;
      }

      // CALL / Conditional CALL
      case 0xCD: {
        const target = this.readWord(this.regs.pc); this.regs.pc += 2;
        this.pushWord(this.regs.pc);
        this.regs.pc = target;
        cycles = 18; break;
      }
      case 0xC4: { // CNZ
        const target = this.readWord(this.regs.pc); this.regs.pc += 2;
        if (!this.flags.z) { this.pushWord(this.regs.pc); this.regs.pc = target; cycles = 18; } else { cycles = 9; }
        break;
      }
      case 0xCC: { // CZ
        const target = this.readWord(this.regs.pc); this.regs.pc += 2;
        if (this.flags.z) { this.pushWord(this.regs.pc); this.regs.pc = target; cycles = 18; } else { cycles = 9; }
        break;
      }
      case 0xD4: { // CNC
        const target = this.readWord(this.regs.pc); this.regs.pc += 2;
        if (!this.flags.cy) { this.pushWord(this.regs.pc); this.regs.pc = target; cycles = 18; } else { cycles = 9; }
        break;
      }
      case 0xDC: { // CC
        const target = this.readWord(this.regs.pc); this.regs.pc += 2;
        if (this.flags.cy) { this.pushWord(this.regs.pc); this.regs.pc = target; cycles = 18; } else { cycles = 9; }
        break;
      }
      case 0xE4: { // CPO
        const target = this.readWord(this.regs.pc); this.regs.pc += 2;
        if (!this.flags.p) { this.pushWord(this.regs.pc); this.regs.pc = target; cycles = 18; } else { cycles = 9; }
        break;
      }
      case 0xEC: { // CPE
        const target = this.readWord(this.regs.pc); this.regs.pc += 2;
        if (this.flags.p) { this.pushWord(this.regs.pc); this.regs.pc = target; cycles = 18; } else { cycles = 9; }
        break;
      }
      case 0xF4: { // CP
        const target = this.readWord(this.regs.pc); this.regs.pc += 2;
        if (!this.flags.s) { this.pushWord(this.regs.pc); this.regs.pc = target; cycles = 18; } else { cycles = 9; }
        break;
      }
      case 0xFC: { // CM
        const target = this.readWord(this.regs.pc); this.regs.pc += 2;
        if (this.flags.s) { this.pushWord(this.regs.pc); this.regs.pc = target; cycles = 18; } else { cycles = 9; }
        break;
      }

      // RET / Conditional RET
      case 0xC9: this.regs.pc = this.popWord(); cycles = 10; break;
      case 0xC0: if (!this.flags.z) { this.regs.pc = this.popWord(); cycles = 12; } else { cycles = 6; } break; // RNZ
      case 0xC8: if (this.flags.z) { this.regs.pc = this.popWord(); cycles = 12; } else { cycles = 6; } break; // RZ
      case 0xD0: if (!this.flags.cy) { this.regs.pc = this.popWord(); cycles = 12; } else { cycles = 6; } break; // RNC
      case 0xD8: if (this.flags.cy) { this.regs.pc = this.popWord(); cycles = 12; } else { cycles = 6; } break; // RC
      case 0xE0: if (!this.flags.p) { this.regs.pc = this.popWord(); cycles = 12; } else { cycles = 6; } break; // RPO
      case 0xE8: if (this.flags.p) { this.regs.pc = this.popWord(); cycles = 12; } else { cycles = 6; } break; // RPE
      case 0xF0: if (!this.flags.s) { this.regs.pc = this.popWord(); cycles = 12; } else { cycles = 6; } break; // RP
      case 0xF8: if (this.flags.s) { this.regs.pc = this.popWord(); cycles = 12; } else { cycles = 6; } break; // RM

      // PUSH / POP
      case 0xC5: this.pushWord(this.getBC()); cycles = 12; break;
      case 0xD5: this.pushWord(this.getDE()); cycles = 12; break;
      case 0xE5: this.pushWord(this.getHL()); cycles = 12; break;
      case 0xF5: this.pushWord((this.regs.a << 8) | this.getPSW()); cycles = 12; break; // PUSH PSW

      case 0xC1: this.setBC(this.popWord()); cycles = 10; break;
      case 0xD1: this.setDE(this.popWord()); cycles = 10; break;
      case 0xE1: this.setHL(this.popWord()); cycles = 10; break;
      case 0xF1: { // POP PSW
        const pswWord = this.popWord();
        this.regs.a = (pswWord >> 8) & 0xff;
        this.setPSW(pswWord & 0xff);
        cycles = 10; break;
      }

      // RST n (0 - 7)
      case 0xC7: this.pushWord(this.regs.pc); this.regs.pc = 0x0000; cycles = 12; break;
      case 0xCF: this.pushWord(this.regs.pc); this.regs.pc = 0x0008; cycles = 12; break;
      case 0xD7: this.pushWord(this.regs.pc); this.regs.pc = 0x0010; cycles = 12; break;
      case 0xDF: this.pushWord(this.regs.pc); this.regs.pc = 0x0018; cycles = 12; break;
      case 0xE7: this.pushWord(this.regs.pc); this.regs.pc = 0x0020; cycles = 12; break;
      case 0xEF: this.pushWord(this.regs.pc); this.regs.pc = 0x0028; cycles = 12; break;
      case 0xF7: this.pushWord(this.regs.pc); this.regs.pc = 0x0030; cycles = 12; break;
      case 0xFF: this.pushWord(this.regs.pc); this.regs.pc = 0x0038; cycles = 12; break;

      // PCHL, SPHL, XCHG, XTHL
      case 0xE9: this.regs.pc = this.getHL(); cycles = 6; break; // PCHL
      case 0xF9: this.regs.sp = this.getHL(); cycles = 6; break; // SPHL
      case 0xEB: { // XCHG
        const hl = this.getHL();
        this.setHL(this.getDE());
        this.setDE(hl);
        cycles = 5; break;
      }
      case 0xE3: { // XTHL
        const low = this.readByte(this.regs.sp);
        const high = this.readByte(this.regs.sp + 1);
        this.writeByte(this.regs.sp, this.regs.l);
        this.writeByte(this.regs.sp + 1, this.regs.h);
        this.regs.l = low;
        this.regs.h = high;
        cycles = 16; break;
      }

      // Ports IN / OUT
      case 0xDB: { // IN port
        const port = this.readByte(this.regs.pc++);
        if (this.onPortRead) {
          this.regs.a = this.onPortRead(port) & 0xff;
        } else {
          this.regs.a = 0;
        }
        cycles = 10; break;
      }
      case 0xD3: { // OUT port
        const port = this.readByte(this.regs.pc++);
        if (this.onPortWrite) {
          this.onPortWrite(port, this.regs.a);
        }
        cycles = 10; break;
      }

      // EI / DI
      case 0xFB: this.interrupts.inte = true; break; // EI
      case 0xF3: this.interrupts.inte = false; break; // DI

      // RIM (Read Interrupt Mask & SID)
      case 0x20: {
        let rim = 0;
        if (this.sidBit) rim |= 0x80;
        if (this.interrupts.rst75) rim |= 0x40;
        if (this.interrupts.rst65) rim |= 0x20;
        if (this.interrupts.rst55) rim |= 0x10;
        if (this.interrupts.inte) rim |= 0x08;
        if (this.interrupts.mask75) rim |= 0x04;
        if (this.interrupts.mask65) rim |= 0x02;
        if (this.interrupts.mask55) rim |= 0x01;
        this.regs.a = rim;
        break;
      }

      // SIM (Set Interrupt Mask & SOD)
      case 0x30: {
        const a = this.regs.a;
        if (a & 0x40) { // SDE: Serial Data Enable
          this.sodBit = (a & 0x80) !== 0;
        }
        if (a & 0x10) { // R7.5: Reset RST 7.5 flip-flop
          this.interrupts.rst75 = false;
        }
        if (a & 0x08) { // MSE: Mask Set Enable
          this.interrupts.mask75 = (a & 0x04) !== 0;
          this.interrupts.mask65 = (a & 0x02) !== 0;
          this.interrupts.mask55 = (a & 0x01) !== 0;
        }
        break;
      }

      default:
        // Undefined opcode in 8085 behaves like NOP or triggers TRAP if configured
        if (this.onInvalidOpcode) {
          this.onInvalidOpcode(op, pc);
        }
        break;
    }

    this.totalCycles += cycles;
    if (snapshot) {
      snapshot.memWrites = [...this.currentStepMemWrites];
      this.historyBuffer.push(snapshot);
      if (this.historyBuffer.length > Intel8085.MAX_HISTORY) {
        this.historyBuffer.shift();
      }
    }
    return cycles;
  }
}

export type CPU8085 = Intel8085;
export const CPU8085 = Intel8085;
