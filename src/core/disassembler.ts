/**
 * Intel 8085 Disassembler Helper
 * Decodes raw bytes from memory into readable assembly instructions, byte counts, and T-states.
 */

export interface DisassembledInstruction {
  address: number;
  hexBytes: string;
  bytes: number[];
  mnemonic: string;
  text: string;
  length: number;
  size: number;
  tStates: number;
}

export class Disassembler8085 {
  /**
   * Disassembles an instruction at a given address in memory.
   */
  public static disassemble(memory: Uint8Array, addr: number): DisassembledInstruction {
    const op = memory[addr & 0xFFFF];
    const b1 = memory[(addr + 1) & 0xFFFF];
    const b2 = memory[(addr + 2) & 0xFFFF];

    const toHex8 = (n: number) => n.toString(16).toUpperCase().padStart(2, '0') + 'H';
    const toHex16 = (low: number, high: number) => ((high << 8) | low).toString(16).toUpperCase().padStart(4, '0') + 'H';

    let mnemonic = 'NOP';
    let length = 1;
    let tStates = 4;

    switch (op) {
      // Data Transfer Instructions
      case 0x00: mnemonic = 'NOP'; tStates = 4; break;
      case 0x01: mnemonic = `LXI B, ${toHex16(b1, b2)}`; length = 3; tStates = 10; break;
      case 0x02: mnemonic = 'STAX B'; tStates = 7; break;
      case 0x03: mnemonic = 'INX B'; tStates = 6; break;
      case 0x04: mnemonic = 'INR B'; tStates = 4; break;
      case 0x05: mnemonic = 'DCR B'; tStates = 4; break;
      case 0x06: mnemonic = `MVI B, ${toHex8(b1)}`; length = 2; tStates = 7; break;
      case 0x07: mnemonic = 'RLC'; tStates = 4; break;

      case 0x0A: mnemonic = 'LDAX B'; tStates = 7; break;
      case 0x0B: mnemonic = 'DCX B'; tStates = 6; break;
      case 0x0C: mnemonic = 'INR C'; tStates = 4; break;
      case 0x0D: mnemonic = 'DCR C'; tStates = 4; break;
      case 0x0E: mnemonic = `MVI C, ${toHex8(b1)}`; length = 2; tStates = 7; break;
      case 0x0F: mnemonic = 'RRC'; tStates = 4; break;

      case 0x11: mnemonic = `LXI D, ${toHex16(b1, b2)}`; length = 3; tStates = 10; break;
      case 0x12: mnemonic = 'STAX D'; tStates = 7; break;
      case 0x13: mnemonic = 'INX D'; tStates = 6; break;
      case 0x14: mnemonic = 'INR D'; tStates = 4; break;
      case 0x15: mnemonic = 'DCR D'; tStates = 4; break;
      case 0x16: mnemonic = `MVI D, ${toHex8(b1)}`; length = 2; tStates = 7; break;
      case 0x17: mnemonic = 'RAL'; tStates = 4; break;

      case 0x1A: mnemonic = 'LDAX D'; tStates = 7; break;
      case 0x1B: mnemonic = 'DCX D'; tStates = 6; break;
      case 0x1C: mnemonic = 'INR E'; tStates = 4; break;
      case 0x1D: mnemonic = 'DCR E'; tStates = 4; break;
      case 0x1E: mnemonic = `MVI E, ${toHex8(b1)}`; length = 2; tStates = 7; break;
      case 0x1F: mnemonic = 'RAR'; tStates = 4; break;

      case 0x20: mnemonic = 'RIM'; tStates = 4; break;
      case 0x21: mnemonic = `LXI H, ${toHex16(b1, b2)}`; length = 3; tStates = 10; break;
      case 0x22: mnemonic = `SHLD ${toHex16(b1, b2)}`; length = 3; tStates = 16; break;
      case 0x23: mnemonic = 'INX H'; tStates = 6; break;
      case 0x24: mnemonic = 'INR H'; tStates = 4; break;
      case 0x25: mnemonic = 'DCR H'; tStates = 4; break;
      case 0x26: mnemonic = `MVI H, ${toHex8(b1)}`; length = 2; tStates = 7; break;
      case 0x27: mnemonic = 'DAA'; tStates = 4; break;

      case 0x2A: mnemonic = `LHLD ${toHex16(b1, b2)}`; length = 3; tStates = 16; break;
      case 0x2B: mnemonic = 'DCX H'; tStates = 6; break;
      case 0x2C: mnemonic = 'INR L'; tStates = 4; break;
      case 0x2D: mnemonic = 'DCR L'; tStates = 4; break;
      case 0x2E: mnemonic = `MVI L, ${toHex8(b1)}`; length = 2; tStates = 7; break;
      case 0x2F: mnemonic = 'CMA'; tStates = 4; break;

      case 0x30: mnemonic = 'SIM'; tStates = 4; break;
      case 0x31: mnemonic = `LXI SP, ${toHex16(b1, b2)}`; length = 3; tStates = 10; break;
      case 0x32: mnemonic = `STA ${toHex16(b1, b2)}`; length = 3; tStates = 13; break;
      case 0x33: mnemonic = 'INX SP'; tStates = 6; break;
      case 0x34: mnemonic = 'INR M'; tStates = 10; break;
      case 0x35: mnemonic = 'DCR M'; tStates = 10; break;
      case 0x36: mnemonic = `MVI M, ${toHex8(b1)}`; length = 2; tStates = 10; break;
      case 0x37: mnemonic = 'STC'; tStates = 4; break;

      case 0x3A: mnemonic = `LDA ${toHex16(b1, b2)}`; length = 3; tStates = 13; break;
      case 0x3B: mnemonic = 'DCX SP'; tStates = 6; break;
      case 0x3C: mnemonic = 'INR A'; tStates = 4; break;
      case 0x3D: mnemonic = 'DCR A'; tStates = 4; break;
      case 0x3E: mnemonic = `MVI A, ${toHex8(b1)}`; length = 2; tStates = 7; break;
      case 0x3F: mnemonic = 'CMC'; tStates = 4; break;

      // MOV instructions (40H to 7FH)
      case 0x76: mnemonic = 'HLT'; tStates = 5; break;
      default:
        if (op >= 0x40 && op <= 0x7F) {
          const regs = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
          const dst = regs[(op >> 3) & 0x07];
          const src = regs[op & 0x07];
          mnemonic = `MOV ${dst}, ${src}`;
          tStates = (dst === 'M' || src === 'M') ? 7 : 4;
        } else if (op >= 0x80 && op <= 0xBF) {
          const ops = ['ADD', 'ADC', 'SUB', 'SBB', 'ANA', 'XRA', 'ORA', 'CMP'];
          const regs = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
          const aluOp = ops[(op >> 3) & 0x07];
          const reg = regs[op & 0x07];
          mnemonic = `${aluOp} ${reg}`;
          tStates = (reg === 'M') ? 7 : 4;
        } else {
          // 0xC0 to 0xFF instructions
          switch (op) {
            case 0xC0: mnemonic = 'RNZ'; tStates = 10; break;
            case 0xC1: mnemonic = 'POP B'; tStates = 10; break;
            case 0xC2: mnemonic = `JNZ ${toHex16(b1, b2)}`; length = 3; tStates = 10; break;
            case 0xC3: mnemonic = `JMP ${toHex16(b1, b2)}`; length = 3; tStates = 10; break;
            case 0xC4: mnemonic = `CNZ ${toHex16(b1, b2)}`; length = 3; tStates = 18; break;
            case 0xC5: mnemonic = 'PUSH B'; tStates = 12; break;
            case 0xC6: mnemonic = `ADI ${toHex8(b1)}`; length = 2; tStates = 7; break;
            case 0xC7: mnemonic = 'RST 0'; tStates = 12; break;
            case 0xC8: mnemonic = 'RZ'; tStates = 10; break;
            case 0xC9: mnemonic = 'RET'; tStates = 10; break;
            case 0xCA: mnemonic = `JZ ${toHex16(b1, b2)}`; length = 3; tStates = 10; break;
            case 0xCC: mnemonic = `CZ ${toHex16(b1, b2)}`; length = 3; tStates = 18; break;
            case 0xCD: mnemonic = `CALL ${toHex16(b1, b2)}`; length = 3; tStates = 18; break;
            case 0xCE: mnemonic = `ACI ${toHex8(b1)}`; length = 2; tStates = 7; break;
            case 0xCF: mnemonic = 'RST 1'; tStates = 12; break;

            case 0xD0: mnemonic = 'RNC'; tStates = 10; break;
            case 0xD1: mnemonic = 'POP D'; tStates = 10; break;
            case 0xD2: mnemonic = `JNC ${toHex16(b1, b2)}`; length = 3; tStates = 10; break;
            case 0xD3: mnemonic = `OUT ${toHex8(b1)}`; length = 2; tStates = 10; break;
            case 0xD4: mnemonic = `CNC ${toHex16(b1, b2)}`; length = 3; tStates = 18; break;
            case 0xD5: mnemonic = 'PUSH D'; tStates = 12; break;
            case 0xD6: mnemonic = `SUI ${toHex8(b1)}`; length = 2; tStates = 7; break;
            case 0xD7: mnemonic = 'RST 2'; tStates = 12; break;
            case 0xD8: mnemonic = 'RC'; tStates = 10; break;
            case 0xDA: mnemonic = `JC ${toHex16(b1, b2)}`; length = 3; tStates = 10; break;
            case 0xDB: mnemonic = `IN ${toHex8(b1)}`; length = 2; tStates = 10; break;
            case 0xDC: mnemonic = `CC ${toHex16(b1, b2)}`; length = 3; tStates = 18; break;
            case 0xDE: mnemonic = `SBI ${toHex8(b1)}`; length = 2; tStates = 7; break;
            case 0xDF: mnemonic = 'RST 3'; tStates = 12; break;

            case 0xE0: mnemonic = 'RPO'; tStates = 10; break;
            case 0xE1: mnemonic = 'POP H'; tStates = 10; break;
            case 0xE2: mnemonic = `JPO ${toHex16(b1, b2)}`; length = 3; tStates = 10; break;
            case 0xE3: mnemonic = 'XTHL'; tStates = 16; break;
            case 0xE4: mnemonic = `CPO ${toHex16(b1, b2)}`; length = 3; tStates = 18; break;
            case 0xE5: mnemonic = 'PUSH H'; tStates = 12; break;
            case 0xE6: mnemonic = `ANI ${toHex8(b1)}`; length = 2; tStates = 7; break;
            case 0xE7: mnemonic = 'RST 4'; tStates = 12; break;
            case 0xE8: mnemonic = 'RPE'; tStates = 10; break;
            case 0xE9: mnemonic = 'PCHL'; tStates = 6; break;
            case 0xEA: mnemonic = `JPE ${toHex16(b1, b2)}`; length = 3; tStates = 10; break;
            case 0xEB: mnemonic = 'XCHG'; tStates = 4; break;
            case 0xEC: mnemonic = `CPE ${toHex16(b1, b2)}`; length = 3; tStates = 18; break;
            case 0xEE: mnemonic = `XRI ${toHex8(b1)}`; length = 2; tStates = 7; break;
            case 0xEF: mnemonic = 'RST 5'; tStates = 12; break;

            case 0xF0: mnemonic = 'RP'; tStates = 10; break;
            case 0xF1: mnemonic = 'POP PSW'; tStates = 10; break;
            case 0xF2: mnemonic = `JP ${toHex16(b1, b2)}`; length = 3; tStates = 10; break;
            case 0xF3: mnemonic = 'DI'; tStates = 4; break;
            case 0xF4: mnemonic = `CP ${toHex16(b1, b2)}`; length = 3; tStates = 18; break;
            case 0xF5: mnemonic = 'PUSH PSW'; tStates = 12; break;
            case 0xF6: mnemonic = `ORI ${toHex8(b1)}`; length = 2; tStates = 7; break;
            case 0xF7: mnemonic = 'RST 6'; tStates = 12; break;
            case 0xF8: mnemonic = 'RM'; tStates = 10; break;
            case 0xF9: mnemonic = 'SPHL'; tStates = 6; break;
            case 0xFA: mnemonic = `JM ${toHex16(b1, b2)}`; length = 3; tStates = 10; break;
            case 0xFB: mnemonic = 'EI'; tStates = 4; break;
            case 0xFC: mnemonic = `CM ${toHex16(b1, b2)}`; length = 3; tStates = 18; break;
            case 0xFE: mnemonic = `CPI ${toHex8(b1)}`; length = 2; tStates = 7; break;
            case 0xFF: mnemonic = 'RST 7'; tStates = 12; break;

            default:
              mnemonic = `DB ${toHex8(op)}`;
              tStates = 4;
              break;
          }
        }
        break;
    }

    const bytes: number[] = [];
    for (let i = 0; i < length; i++) {
      bytes.push(memory[(addr + i) & 0xFFFF]);
    }

    const hexBytes = bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

    return {
      address: addr & 0xFFFF,
      hexBytes,
      bytes,
      mnemonic,
      text: mnemonic,
      length,
      size: length,
      tStates
    };
  }

  /**
   * Disassembles a block of memory into a list of instructions.
   */
  public static disassembleRange(memory: Uint8Array, startAddr: number, maxInstructions: number = 50): DisassembledInstruction[] {
    const list: DisassembledInstruction[] = [];
    let current = startAddr & 0xFFFF;
    for (let i = 0; i < maxInstructions; i++) {
      const item = this.disassemble(memory, current);
      list.push(item);
      current = (current + item.length) & 0xFFFF;
      if (current < startAddr && startAddr + 50 > 0xFFFF) break; // Wrapped around
    }
    return list;
  }
}
