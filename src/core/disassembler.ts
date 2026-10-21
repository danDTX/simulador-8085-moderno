export interface DisassembledInstruction {
  address: number;
  mnemonic: string;
  bytes: number[];
  size: number;
  text: string;
}

export class Disassembler8085 {
  public static disassemble(memory: Uint8Array, addr: number): DisassembledInstruction {
    const a = addr & 0xffff;
    const op = memory[a];

    const b1 = memory[(a + 1) & 0xffff];
    const b2 = memory[(a + 2) & 0xffff];
    const word = (b2 << 8) | b1;
    const hexB1 = b1.toString(16).padStart(2, '0').toUpperCase() + 'H';
    const hexWord = word.toString(16).padStart(4, '0').toUpperCase() + 'H';

    const simple = (m: string) => ({
      address: a, mnemonic: m, bytes: [op], size: 1, text: m
    });

    const imm8 = (m: string) => ({
      address: a, mnemonic: m, bytes: [op, b1], size: 2, text: `${m} ${hexB1}`
    });

    const imm16 = (m: string) => ({
      address: a, mnemonic: m, bytes: [op, b1, b2], size: 3, text: `${m} ${hexWord}`
    });

    switch (op) {
      case 0x00: return simple('NOP');
      case 0x76: return simple('HLT');

      // LXI
      case 0x01: return { address: a, mnemonic: 'LXI', bytes: [op, b1, b2], size: 3, text: `LXI B, ${hexWord}` };
      case 0x11: return { address: a, mnemonic: 'LXI', bytes: [op, b1, b2], size: 3, text: `LXI D, ${hexWord}` };
      case 0x21: return { address: a, mnemonic: 'LXI', bytes: [op, b1, b2], size: 3, text: `LXI H, ${hexWord}` };
      case 0x31: return { address: a, mnemonic: 'LXI', bytes: [op, b1, b2], size: 3, text: `LXI SP, ${hexWord}` };

      // STAX / LDAX
      case 0x02: return simple('STAX B');
      case 0x12: return simple('STAX D');
      case 0x0A: return simple('LDAX B');
      case 0x1A: return simple('LDAX D');

      // SHLD / LHLD / STA / LDA
      case 0x22: return imm16('SHLD');
      case 0x2A: return imm16('LHLD');
      case 0x32: return imm16('STA');
      case 0x3A: return imm16('LDA');

      // INX / DCX
      case 0x03: return simple('INX B');
      case 0x13: return simple('INX D');
      case 0x23: return simple('INX H');
      case 0x33: return simple('INX SP');
      case 0x0B: return simple('DCX B');
      case 0x1B: return simple('DCX D');
      case 0x2B: return simple('DCX H');
      case 0x3B: return simple('DCX SP');

      // INR / DCR
      case 0x04: return simple('INR B');
      case 0x0C: return simple('INR C');
      case 0x14: return simple('INR D');
      case 0x1C: return simple('INR E');
      case 0x24: return simple('INR H');
      case 0x2C: return simple('INR L');
      case 0x34: return simple('INR M');
      case 0x3C: return simple('INR A');

      case 0x05: return simple('DCR B');
      case 0x0D: return simple('DCR C');
      case 0x15: return simple('DCR D');
      case 0x1D: return simple('DCR E');
      case 0x25: return simple('DCR H');
      case 0x2D: return simple('DCR L');
      case 0x35: return simple('DCR M');
      case 0x3D: return simple('DCR A');

      // MVI
      case 0x06: return { address: a, mnemonic: 'MVI', bytes: [op, b1], size: 2, text: `MVI B, ${hexB1}` };
      case 0x0E: return { address: a, mnemonic: 'MVI', bytes: [op, b1], size: 2, text: `MVI C, ${hexB1}` };
      case 0x16: return { address: a, mnemonic: 'MVI', bytes: [op, b1], size: 2, text: `MVI D, ${hexB1}` };
      case 0x1E: return { address: a, mnemonic: 'MVI', bytes: [op, b1], size: 2, text: `MVI E, ${hexB1}` };
      case 0x26: return { address: a, mnemonic: 'MVI', bytes: [op, b1], size: 2, text: `MVI H, ${hexB1}` };
      case 0x2E: return { address: a, mnemonic: 'MVI', bytes: [op, b1], size: 2, text: `MVI L, ${hexB1}` };
      case 0x36: return { address: a, mnemonic: 'MVI', bytes: [op, b1], size: 2, text: `MVI M, ${hexB1}` };
      case 0x3E: return { address: a, mnemonic: 'MVI', bytes: [op, b1], size: 2, text: `MVI A, ${hexB1}` };

      // DAD
      case 0x09: return simple('DAD B');
      case 0x19: return simple('DAD D');
      case 0x29: return simple('DAD H');
      case 0x39: return simple('DAD SP');

      // Rotates
      case 0x07: return simple('RLC');
      case 0x0F: return simple('RRC');
      case 0x17: return simple('RAL');
      case 0x1F: return simple('RAR');

      // Others
      case 0x27: return simple('DAA');
      case 0x2F: return simple('CMA');
      case 0x37: return simple('STC');
      case 0x3F: return simple('CMC');

      // MOV (0x40 - 0x7F)
      default:
        if (op >= 0x40 && op <= 0x7F && op !== 0x76) {
          const regs = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
          const dst = regs[(op - 0x40) >> 3];
          const src = regs[(op - 0x40) & 7];
          return { address: a, mnemonic: 'MOV', bytes: [op], size: 1, text: `MOV ${dst}, ${src}` };
        }
        if (op >= 0x80 && op <= 0xBF) {
          const ops = ['ADD', 'ADC', 'SUB', 'SBB', 'ANA', 'XRA', 'ORA', 'CMP'];
          const regs = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
          const cmd = ops[(op - 0x80) >> 3];
          const reg = regs[(op - 0x80) & 7];
          return { address: a, mnemonic: cmd, bytes: [op], size: 1, text: `${cmd} ${reg}` };
        }
        // Arithmetic / Logic Immediate
        if (op === 0xC6) return imm8('ADI');
        if (op === 0xCE) return imm8('ACI');
        if (op === 0xD6) return imm8('SUI');
        if (op === 0xDE) return imm8('SBI');
        if (op === 0xE6) return imm8('ANI');
        if (op === 0xEE) return imm8('XRI');
        if (op === 0xF6) return imm8('ORI');
        if (op === 0xFE) return imm8('CPI');

        // Jumps
        if (op === 0xC3) return imm16('JMP');
        if (op === 0xC2) return imm16('JNZ');
        if (op === 0xCA) return imm16('JZ');
        if (op === 0xD2) return imm16('JNC');
        if (op === 0xDA) return imm16('JC');
        if (op === 0xE2) return imm16('JPO');
        if (op === 0xEA) return imm16('JPE');
        if (op === 0xF2) return imm16('JP');
        if (op === 0xFA) return imm16('JM');

        // Calls
        if (op === 0xCD) return imm16('CALL');
        if (op === 0xC4) return imm16('CNZ');
        if (op === 0xCC) return imm16('CZ');
        if (op === 0xD4) return imm16('CNC');
        if (op === 0xDC) return imm16('CC');
        if (op === 0xE4) return imm16('CPO');
        if (op === 0xEC) return imm16('CPE');
        if (op === 0xF4) return imm16('CP');
        if (op === 0xFC) return imm16('CM');

        // Returns
        if (op === 0xC9) return simple('RET');
        if (op === 0xC0) return simple('RNZ');
        if (op === 0xC8) return simple('RZ');
        if (op === 0xD0) return simple('RNC');
        if (op === 0xD8) return simple('RC');
        if (op === 0xE0) return simple('RPO');
        if (op === 0xE8) return simple('RPE');
        if (op === 0xF0) return simple('RP');
        if (op === 0xF8) return simple('RM');

        // PUSH / POP
        if (op === 0xC5) return simple('PUSH B');
        if (op === 0xD5) return simple('PUSH D');
        if (op === 0xE5) return simple('PUSH H');
        if (op === 0xF5) return simple('PUSH PSW');
        if (op === 0xC1) return simple('POP B');
        if (op === 0xD1) return simple('POP D');
        if (op === 0xE1) return simple('POP H');
        if (op === 0xF1) return simple('POP PSW');

        // Special
        if (op === 0xE3) return simple('XTHL');
        if (op === 0xE9) return simple('PCHL');
        if (op === 0xEB) return simple('XCHG');
        if (op === 0xF9) return simple('SPHL');
        if (op === 0xDB) return imm8('IN');
        if (op === 0xD3) return imm8('OUT');
        if (op === 0xFB) return simple('EI');
        if (op === 0xF3) return simple('DI');
        if (op === 0x20) return simple('RIM');
        if (op === 0x30) return simple('SIM');

        if ((op & 0xC7) === 0xC7) {
          const rstNum = (op >> 3) & 7;
          return { address: a, mnemonic: 'RST', bytes: [op], size: 1, text: `RST ${rstNum}` };
        }

        return {
          address: a,
          mnemonic: `DB ${op.toString(16).padStart(2, '0').toUpperCase()}H`,
          bytes: [op],
          size: 1,
          text: `DB ${op.toString(16).padStart(2, '0').toUpperCase()}H`
        };
    }
  }
}
