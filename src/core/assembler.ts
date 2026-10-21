import { AssemblyResult, AssemblyDiagnostic } from './types.js';

interface ParsedInstruction {
  lineNum: number;
  label?: string;
  mnemonic: string;
  operands: string[];
  rawText: string;
  address: number;
  size: number;
  bytes: number[];
  isDirective?: boolean;
  directiveType?: 'ORG' | 'DATA' | 'DB' | 'DW' | 'DS' | 'DEFINE';
}

export class Assembler8085 {
  private static MOV_MAP: Record<string, Record<string, number>> = {
    'B': { 'B': 0x40, 'C': 0x41, 'D': 0x42, 'E': 0x43, 'H': 0x44, 'L': 0x45, 'M': 0x46, 'A': 0x47 },
    'C': { 'B': 0x48, 'C': 0x49, 'D': 0x4A, 'E': 0x4B, 'H': 0x4C, 'L': 0x4D, 'M': 0x4E, 'A': 0x4F },
    'D': { 'B': 0x50, 'C': 0x51, 'D': 0x52, 'E': 0x53, 'H': 0x54, 'L': 0x55, 'M': 0x56, 'A': 0x57 },
    'E': { 'B': 0x58, 'C': 0x59, 'D': 0x5A, 'E': 0x5B, 'H': 0x5C, 'L': 0x5D, 'M': 0x5E, 'A': 0x5F },
    'H': { 'B': 0x60, 'C': 0x61, 'D': 0x62, 'E': 0x63, 'H': 0x64, 'L': 0x65, 'M': 0x66, 'A': 0x67 },
    'L': { 'B': 0x68, 'C': 0x69, 'D': 0x6A, 'E': 0x6B, 'H': 0x6C, 'L': 0x6D, 'M': 0x6E, 'A': 0x6F },
    'M': { 'B': 0x70, 'C': 0x71, 'D': 0x72, 'E': 0x73, 'H': 0x74, 'L': 0x75, 'A': 0x77 },
    'A': { 'B': 0x78, 'C': 0x79, 'D': 0x7A, 'E': 0x7B, 'H': 0x7C, 'L': 0x7D, 'M': 0x7E, 'A': 0x7F }
  };

  private static MVI_MAP: Record<string, number> = {
    'B': 0x06, 'C': 0x0E, 'D': 0x16, 'E': 0x1E, 'H': 0x26, 'L': 0x2E, 'M': 0x36, 'A': 0x3E
  };

  private static LXI_MAP: Record<string, number> = {
    'B': 0x01, 'D': 0x11, 'H': 0x21, 'SP': 0x31
  };

  private static INX_MAP: Record<string, number> = {
    'B': 0x03, 'D': 0x13, 'H': 0x23, 'SP': 0x33
  };

  private static DCX_MAP: Record<string, number> = {
    'B': 0x0B, 'D': 0x1B, 'H': 0x2B, 'SP': 0x3B
  };

  private static DAD_MAP: Record<string, number> = {
    'B': 0x09, 'D': 0x19, 'H': 0x29, 'SP': 0x39
  };

  private static INR_MAP: Record<string, number> = {
    'B': 0x04, 'C': 0x0C, 'D': 0x14, 'E': 0x1C, 'H': 0x24, 'L': 0x2C, 'M': 0x34, 'A': 0x3C
  };

  private static DCR_MAP: Record<string, number> = {
    'B': 0x05, 'C': 0x0D, 'D': 0x15, 'E': 0x1D, 'H': 0x25, 'L': 0x2D, 'M': 0x35, 'A': 0x3D
  };

  private static ALU_REG_MAP: Record<string, Record<string, number>> = {
    'ADD': { 'B': 0x80, 'C': 0x81, 'D': 0x82, 'E': 0x83, 'H': 0x84, 'L': 0x85, 'M': 0x86, 'A': 0x87 },
    'ADC': { 'B': 0x88, 'C': 0x89, 'D': 0x8A, 'E': 0x8B, 'H': 0x8C, 'L': 0x8D, 'M': 0x8E, 'A': 0x8F },
    'SUB': { 'B': 0x90, 'C': 0x91, 'D': 0x92, 'E': 0x93, 'H': 0x94, 'L': 0x95, 'M': 0x96, 'A': 0x97 },
    'SBB': { 'B': 0x98, 'C': 0x99, 'D': 0x9A, 'E': 0x9B, 'H': 0x9C, 'L': 0x9D, 'M': 0x9E, 'A': 0x9F },
    'ANA': { 'B': 0xA0, 'C': 0xA1, 'D': 0xA2, 'E': 0xA3, 'H': 0xA4, 'L': 0xA5, 'M': 0xA6, 'A': 0xA7 },
    'XRA': { 'B': 0xA8, 'C': 0xA9, 'D': 0xAA, 'E': 0xAB, 'H': 0xAC, 'L': 0xAD, 'M': 0xAE, 'A': 0xAF },
    'ORA': { 'B': 0xB0, 'C': 0xB1, 'D': 0xB2, 'E': 0xB3, 'H': 0xB4, 'L': 0xB5, 'M': 0xB6, 'A': 0xB7 },
    'CMP': { 'B': 0xB8, 'C': 0xB9, 'D': 0xBA, 'E': 0xBB, 'H': 0xBC, 'L': 0xBD, 'M': 0xBE, 'A': 0xBF },
  };

  private static SIMPLE_OPCODES: Record<string, number> = {
    'NOP': 0x00, 'RLC': 0x07, 'RRC': 0x0F, 'RAL': 0x17, 'RAR': 0x1F,
    'RIM': 0x20, 'DAA': 0x27, 'CMA': 0x2F, 'SIM': 0x30, 'STC': 0x37, 'CMC': 0x3F,
    'HLT': 0x76, 'RET': 0xC9, 'RNZ': 0xC0, 'RZ': 0xC8, 'RNC': 0xD0, 'RC': 0xD8,
    'RPO': 0xE0, 'RPE': 0xE8, 'RP': 0xF0, 'RM': 0xF8, 'XTHL': 0xE3, 'PCHL': 0xE9,
    'XCHG': 0xEB, 'SPHL': 0xF9, 'DI': 0xF3, 'EI': 0xFB
  };

  private static BRANCH_OPCODES: Record<string, number> = {
    'JMP': 0xC3, 'JNZ': 0xC2, 'JZ': 0xCA, 'JNC': 0xD2, 'JC': 0xDA,
    'JPO': 0xE2, 'JPE': 0xEA, 'JP': 0xF2, 'JM': 0xFA,
    'CALL': 0xCD, 'CNZ': 0xC4, 'CZ': 0xCC, 'CNC': 0xD4, 'CC': 0xDC,
    'CPO': 0xE4, 'CPE': 0xEC, 'CP': 0xF4, 'CM': 0xFC,
    'LDA': 0x3A, 'STA': 0x32, 'LHLD': 0x2A, 'SHLD': 0x22
  };

  private static IMM8_OPCODES: Record<string, number> = {
    'ADI': 0xC6, 'ACI': 0xCE, 'SUI': 0xD6, 'SBI': 0xDE,
    'ANI': 0xE6, 'XRI': 0xEE, 'ORI': 0xF6, 'CPI': 0xFE,
    'IN': 0xDB, 'OUT': 0xD3
  };

  public static parseSingleNumber(str: string): number | null {
    const s = str.trim();
    if (!s) return null;

    // Hex with 0x
    if (/^0x[0-9a-fA-F]+$/i.test(s)) {
      return parseInt(s.substring(2), 16);
    }
    // Hex with H suffix (e.g. 0050H, 77h, E000h)
    if (/^[0-9a-fA-F]+h$/i.test(s)) {
      return parseInt(s.substring(0, s.length - 1), 16);
    }
    // Binary with B suffix (e.g. 10000000b)
    if (/^[01]+b$/i.test(s)) {
      return parseInt(s.substring(0, s.length - 1), 2);
    }
    // Decimal with D suffix (e.g. 6d, 7D)
    if (/^[0-9]+d$/i.test(s)) {
      return parseInt(s.substring(0, s.length - 1), 10);
    }
    // Decimal pure digits
    if (/^[0-9]+$/.test(s)) {
      return parseInt(s, 10);
    }
    // Character literal 'A'
    if (s.length === 3 && s.startsWith("'") && s.endsWith("'")) {
      return s.charCodeAt(1);
    }

    return null;
  }

  public static evaluateExpression(expr: string, symbols: Map<string, number>): number | null {
    const trimmed = expr.trim();
    if (!trimmed) return null;

    // Direct single number
    const directNum = Assembler8085.parseSingleNumber(trimmed);
    if (directNum !== null) return directNum;

    // Direct symbol
    const upper = trimmed.toUpperCase();
    if (symbols.has(upper)) {
      return symbols.get(upper)!;
    }

    // Tokenize and evaluate math expression safely
    // Replace hex tokens (e.g. E000h, 0050H, 160, 25*40)
    let processed = trimmed;

    // 1. Replace symbols first (longer names first to avoid partial replacement)
    const sortedSymbols = Array.from(symbols.keys()).sort((a, b) => b.length - a.length);
    for (const sym of sortedSymbols) {
      const val = symbols.get(sym)!;
      const re = new RegExp(`\\b${sym}\\b`, 'gi');
      processed = processed.replace(re, `(${val})`);
    }

    // 2. Replace hex numbers like E000h or 0050h or FFFFh
    processed = processed.replace(/\b([0-9a-fA-F]+)h\b/gi, (_, hex) => {
      return String(parseInt(hex, 16));
    });

    // 3. Replace binary numbers
    processed = processed.replace(/\b([01]+)b\b/gi, (_, bin) => {
      return String(parseInt(bin, 2));
    });

    // 4. Replace decimal with 'd' suffix
    processed = processed.replace(/\b([0-9]+)d\b/gi, (_, dec) => {
      return String(parseInt(dec, 10));
    });

    // Evaluate simple arithmetic expression safely without arbitrary code execution
    try {
      if (/^[0-9+\-*/&|^~() \t]+$/.test(processed)) {
        // Safe math evaluator
        const fn = new Function(`return Math.trunc(${processed});`);
        const res = fn();
        if (typeof res === 'number' && !isNaN(res)) {
          return res;
        }
      }
    } catch {
      // Evaluation failed
    }

    return null;
  }

  public assemble(source: string): AssemblyResult {
    const memory = new Uint8Array(65536);
    const diagnostics: AssemblyDiagnostic[] = [];
    const symbolTable = new Map<string, number>();
    const defines = new Map<string, string>();
    const sourceLineToAddress = new Map<number, number>();
    const addressToSourceLine = new Map<number, number>();

    const rawLines = source.split(/\r?\n/);
    let currentAddress = 0x0000;
    let entryPoint = 0x0000;
    let hasExplicitOrg = false;

    // --- PASS 0: Extract .define directives (single-line or multi-line blocks) ---
    let inDefineBlock = false;

    for (let i = 0; i < rawLines.length; i++) {
      let line = rawLines[i].replace(/;.*$/, '').trim();
      if (!line) continue;

      if (/^\.define$/i.test(line)) {
        inDefineBlock = true;
        continue;
      }

      if (line.startsWith('.')) {
        inDefineBlock = false;
      }

      if (inDefineBlock) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const defName = parts[0].toUpperCase();
          const defVal = line.substring(parts[0].length).trim();
          defines.set(defName, defVal);
          continue;
        }
      }

      const singleDefMatch = line.match(/^\.define\s+([A-Za-z0-9_]+)\s+(.+)$/i);
      if (singleDefMatch) {
        defines.set(singleDefMatch[1].toUpperCase(), singleDefMatch[2].trim());
      }
    }

    // Resolve recursive / dependent defines
    let resolvedAny = true;
    let passes = 0;
    while (resolvedAny && passes < 10) {
      resolvedAny = false;
      passes++;
      defines.forEach((val, key) => {
        let newVal = val;
        defines.forEach((otherVal, otherKey) => {
          if (key !== otherKey) {
            const re = new RegExp(`\\b${otherKey}\\b`, 'gi');
            if (re.test(newVal)) {
              newVal = newVal.replace(re, otherVal);
              resolvedAny = true;
            }
          }
        });
        defines.set(key, newVal);
      });
    }

    // Substitute defines into lines
    const substituteDefines = (text: string): string => {
      let res = text;
      defines.forEach((val, key) => {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        res = res.replace(regex, val);
      });
      return res;
    };

    // --- PASS 1: Identify labels, addresses and sizes ---
    const parsedLines: ParsedInstruction[] = [];
    inDefineBlock = false;

    for (let lineIdx = 0; lineIdx < rawLines.length; lineIdx++) {
      const lineNum = lineIdx + 1;
      let rawLine = rawLines[lineIdx];

      // Strip comments
      const commentIdx = rawLine.indexOf(';');
      let code = commentIdx !== -1 ? rawLine.substring(0, commentIdx) : rawLine;
      code = code.trim();

      if (!code) continue;

      if (/^\.define$/i.test(code)) {
        inDefineBlock = true;
        continue;
      }

      if (code.startsWith('.')) {
        inDefineBlock = false;
      }

      if (inDefineBlock) {
        continue;
      }

      if (code.toUpperCase().startsWith('.DEFINE ')) {
        continue;
      }

      // Check for labels (e.g. "INICIO:" or "INICIO: MOV A, B")
      let label: string | undefined;
      const labelColonMatch = code.match(/^([A-Za-z0-9_]+):(.*)$/);
      if (labelColonMatch) {
        label = labelColonMatch[1].toUpperCase();
        code = labelColonMatch[2].trim();
      }

      const upperCode = code.toUpperCase();

      if (upperCode.startsWith('.ORG ') || upperCode === '.ORG') {
        const parts = code.split(/\s+/);
        const expr = parts.slice(1).join(' ');
        const addrNum = Assembler8085.parseSingleNumber(expr) ?? Assembler8085.evaluateExpression(expr, symbolTable);
        if (addrNum === null) {
          diagnostics.push({ line: lineNum, message: `Dirección no válida en .org: ${expr}`, isError: true });
        } else {
          currentAddress = addrNum & 0xffff;
          if (!hasExplicitOrg) {
            entryPoint = currentAddress;
            hasExplicitOrg = true;
          }
        }
        if (label) symbolTable.set(label, currentAddress);
        parsedLines.push({
          lineNum, label, mnemonic: '.ORG', operands: [expr],
          rawText: rawLine, address: currentAddress, size: 0, bytes: [], isDirective: true, directiveType: 'ORG'
        });
        continue;
      }

      if (upperCode.startsWith('.DATA ') || upperCode === '.DATA') {
        const parts = code.split(/\s+/);
        const expr = parts.slice(1).join(' ');
        const addrNum = Assembler8085.parseSingleNumber(expr) ?? Assembler8085.evaluateExpression(expr, symbolTable);
        if (addrNum === null) {
          diagnostics.push({ line: lineNum, message: `Dirección no válida en .data: ${expr}`, isError: true });
        } else {
          currentAddress = addrNum & 0xffff;
        }
        if (label) symbolTable.set(label, currentAddress);
        parsedLines.push({
          lineNum, label, mnemonic: '.DATA', operands: [expr],
          rawText: rawLine, address: currentAddress, size: 0, bytes: [], isDirective: true, directiveType: 'DATA'
        });
        continue;
      }

      if (!code) {
        if (label) symbolTable.set(label, currentAddress);
        continue;
      }

      // Parse mnemonic and operands
      const tokens = code.split(/\s+/);
      let mnemonic = tokens[0].toUpperCase();
      const rest = code.substring(tokens[0].length).trim();
      let operands: string[] = rest ? rest.split(',').map(s => s.trim()) : [];

      // 8085sim compatibility: allow numeric register indexes 0..7 (0=B, 1=C, 2=D, 3=E, 4=H, 5=L, 6=M, 7=A)
      const regIndexMap = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
      operands = operands.map(op => {
        const num = Assembler8085.parseSingleNumber(op);
        if (num !== null && num >= 0 && num <= 7 && mnemonic === 'MOV') {
          return regIndexMap[num];
        }
        return op;
      });

      if (label) {
        symbolTable.set(label, currentAddress);
      }

      let size = 0;
      let isDirective = false;
      let directiveType: ParsedInstruction['directiveType'];

      if (mnemonic === 'DB') {
        isDirective = true;
        directiveType = 'DB';
        for (const op of operands) {
          if ((op.startsWith('"') && op.endsWith('"')) || (op.startsWith("'") && op.endsWith("'"))) {
            size += Math.max(0, op.length - 2);
          } else {
            size += 1;
          }
        }
      } else if (mnemonic === 'DW') {
        isDirective = true;
        directiveType = 'DW';
        size = operands.length * 2;
      } else if (mnemonic === 'DS') {
        isDirective = true;
        directiveType = 'DS';
        const count = Assembler8085.parseSingleNumber(operands[0]) || 1;
        size = count;
      } else {
        if (Assembler8085.SIMPLE_OPCODES[mnemonic] !== undefined) {
          size = 1;
        } else if (mnemonic === 'MOV') {
          size = 1;
        } else if (mnemonic === 'MVI') {
          size = 2;
        } else if (mnemonic === 'LXI') {
          size = 3;
        } else if (mnemonic === 'STAX' || mnemonic === 'LDAX') {
          size = 1;
        } else if (mnemonic === 'INX' || mnemonic === 'DCX' || mnemonic === 'DAD') {
          size = 1;
        } else if (mnemonic === 'INR' || mnemonic === 'DCR') {
          size = 1;
        } else if (Assembler8085.ALU_REG_MAP[mnemonic] !== undefined) {
          size = 1;
        } else if (Assembler8085.IMM8_OPCODES[mnemonic] !== undefined) {
          size = 2;
        } else if (Assembler8085.BRANCH_OPCODES[mnemonic] !== undefined) {
          size = 3;
        } else if (mnemonic === 'PUSH' || mnemonic === 'POP') {
          size = 1;
        } else if (mnemonic === 'RST') {
          size = 1;
        } else {
          diagnostics.push({ line: lineNum, message: `Instrucción desconocida: ${mnemonic}`, isError: true });
        }
      }

      parsedLines.push({
        lineNum, label, mnemonic, operands, rawText: rawLine, address: currentAddress, size, bytes: [], isDirective, directiveType
      });
      currentAddress = (currentAddress + size) & 0xffff;
    }

    // Populate all defines into symbols as numbers if possible
    defines.forEach((val, key) => {
      const evalVal = Assembler8085.evaluateExpression(val, symbolTable);
      if (evalVal !== null) {
        symbolTable.set(key, evalVal);
      }
    });

    // --- PASS 2: Emit bytes and resolve symbols / expressions ---
    const resolveValue = (valStr: string, lineNum: number): number => {
      const sub = substituteDefines(valStr);
      const evalVal = Assembler8085.evaluateExpression(sub, symbolTable);
      if (evalVal !== null) {
        return evalVal;
      }
      diagnostics.push({ line: lineNum, message: `Símbolo o expresión no definida: ${valStr}`, isError: true });
      return 0;
    };

    let objectCodeText = '';

    for (const inst of parsedLines) {
      if (inst.isDirective) {
        if (inst.directiveType === 'ORG') {
          const low = inst.address & 0xff;
          const high = (inst.address >> 8) & 0xff;
          const hexLow = low.toString(16).padStart(2, '0').toUpperCase() + 'h';
          const hexHigh = high.toString(16).padStart(2, '0').toUpperCase() + 'h';
          objectCodeText += `.ORG ${hexLow} ${hexHigh}\r\n`;
          continue;
        }
        if (inst.directiveType === 'DATA') {
          const low = inst.address & 0xff;
          const high = (inst.address >> 8) & 0xff;
          const hexLow = low.toString(16).padStart(2, '0').toUpperCase() + 'h';
          const hexHigh = high.toString(16).padStart(2, '0').toUpperCase() + 'h';
          objectCodeText += `.DATA ${hexLow} ${hexHigh}\r\n`;
          continue;
        }
        if (inst.directiveType === 'DB') {
          const bytes: number[] = [];
          for (const op of inst.operands) {
            if ((op.startsWith('"') && op.endsWith('"')) || (op.startsWith("'") && op.endsWith("'"))) {
              for (let c = 1; c < op.length - 1; c++) {
                bytes.push(op.charCodeAt(c));
              }
            } else {
              bytes.push(resolveValue(op, inst.lineNum) & 0xff);
            }
          }
          inst.bytes = bytes;
          let dataLine = '';
          for (let b = 0; b < bytes.length; b++) {
            memory[inst.address + b] = bytes[b];
            dataLine += bytes[b].toString(16).padStart(2, '0').toUpperCase() + 'h ';
          }
          objectCodeText += dataLine + '\r\n';
          sourceLineToAddress.set(inst.lineNum, inst.address);
          addressToSourceLine.set(inst.address, inst.lineNum);
          continue;
        }
        if (inst.directiveType === 'DW') {
          const bytes: number[] = [];
          for (const op of inst.operands) {
            const val = resolveValue(op, inst.lineNum);
            bytes.push(val & 0xff);
            bytes.push((val >> 8) & 0xff);
          }
          inst.bytes = bytes;
          let dataLine = '';
          for (let b = 0; b < bytes.length; b++) {
            memory[inst.address + b] = bytes[b];
            dataLine += bytes[b].toString(16).padStart(2, '0').toUpperCase() + 'h ';
          }
          objectCodeText += dataLine + '\r\n';
          sourceLineToAddress.set(inst.lineNum, inst.address);
          addressToSourceLine.set(inst.address, inst.lineNum);
          continue;
        }
        if (inst.directiveType === 'DS') {
          sourceLineToAddress.set(inst.lineNum, inst.address);
          addressToSourceLine.set(inst.address, inst.lineNum);
          continue;
        }
      }

      const mnemonic = inst.mnemonic;
      const ops = inst.operands.map(o => o.toUpperCase());
      const bytes: number[] = [];

      if (Assembler8085.SIMPLE_OPCODES[mnemonic] !== undefined) {
        bytes.push(Assembler8085.SIMPLE_OPCODES[mnemonic]);
      } else if (mnemonic === 'MOV') {
        const dst = ops[0];
        const src = ops[1];
        if (Assembler8085.MOV_MAP[dst] && Assembler8085.MOV_MAP[dst][src] !== undefined) {
          bytes.push(Assembler8085.MOV_MAP[dst][src]);
        } else {
          diagnostics.push({ line: inst.lineNum, message: `Operandos no válidos para MOV: ${dst}, ${src}`, isError: true });
        }
      } else if (mnemonic === 'MVI') {
        const reg = ops[0];
        const val = resolveValue(inst.operands[1], inst.lineNum) & 0xff;
        if (Assembler8085.MVI_MAP[reg] !== undefined) {
          bytes.push(Assembler8085.MVI_MAP[reg]);
          bytes.push(val);
        } else {
          diagnostics.push({ line: inst.lineNum, message: `Registro no válido para MVI: ${reg}`, isError: true });
        }
      } else if (mnemonic === 'LXI') {
        let pair = ops[0];
        if (pair === 'BC') pair = 'B'; if (pair === 'DE') pair = 'D'; if (pair === 'HL') pair = 'H';
        const val = resolveValue(inst.operands[1], inst.lineNum);
        if (Assembler8085.LXI_MAP[pair] !== undefined) {
          bytes.push(Assembler8085.LXI_MAP[pair]);
          bytes.push(val & 0xff);
          bytes.push((val >> 8) & 0xff);
        } else {
          diagnostics.push({ line: inst.lineNum, message: `Par de registros no válido para LXI: ${pair}`, isError: true });
        }
      } else if (mnemonic === 'STAX') {
        const pair = ops[0] === 'BC' ? 'B' : ops[0] === 'DE' ? 'D' : ops[0];
        bytes.push(pair === 'B' ? 0x02 : 0x12);
      } else if (mnemonic === 'LDAX') {
        const pair = ops[0] === 'BC' ? 'B' : ops[0] === 'DE' ? 'D' : ops[0];
        bytes.push(pair === 'B' ? 0x0A : 0x1A);
      } else if (mnemonic === 'INX') {
        let pair = ops[0];
        if (pair === 'BC') pair = 'B'; if (pair === 'DE') pair = 'D'; if (pair === 'HL') pair = 'H';
        bytes.push(Assembler8085.INX_MAP[pair] || 0x03);
      } else if (mnemonic === 'DCX') {
        let pair = ops[0];
        if (pair === 'BC') pair = 'B'; if (pair === 'DE') pair = 'D'; if (pair === 'HL') pair = 'H';
        bytes.push(Assembler8085.DCX_MAP[pair] || 0x0B);
      } else if (mnemonic === 'DAD') {
        let pair = ops[0];
        if (pair === 'BC') pair = 'B'; if (pair === 'DE') pair = 'D'; if (pair === 'HL') pair = 'H';
        bytes.push(Assembler8085.DAD_MAP[pair] || 0x09);
      } else if (mnemonic === 'INR') {
        bytes.push(Assembler8085.INR_MAP[ops[0]] || 0x04);
      } else if (mnemonic === 'DCR') {
        bytes.push(Assembler8085.DCR_MAP[ops[0]] || 0x05);
      } else if (Assembler8085.ALU_REG_MAP[mnemonic] !== undefined) {
        bytes.push(Assembler8085.ALU_REG_MAP[mnemonic][ops[0]] || 0x80);
      } else if (Assembler8085.IMM8_OPCODES[mnemonic] !== undefined) {
        const opcode = Assembler8085.IMM8_OPCODES[mnemonic];
        const val = resolveValue(inst.operands[0], inst.lineNum) & 0xff;
        bytes.push(opcode);
        bytes.push(val);
      } else if (Assembler8085.BRANCH_OPCODES[mnemonic] !== undefined) {
        const opcode = Assembler8085.BRANCH_OPCODES[mnemonic];
        const target = resolveValue(inst.operands[0], inst.lineNum);
        bytes.push(opcode);
        bytes.push(target & 0xff);
        bytes.push((target >> 8) & 0xff);
      } else if (mnemonic === 'PUSH') {
        let pair = ops[0];
        if (pair === 'BC') pair = 'B'; if (pair === 'DE') pair = 'D'; if (pair === 'HL') pair = 'H';
        const map: Record<string, number> = { 'B': 0xC5, 'D': 0xD5, 'H': 0xE5, 'PSW': 0xF5 };
        bytes.push(map[pair] || 0xC5);
      } else if (mnemonic === 'POP') {
        let pair = ops[0];
        if (pair === 'BC') pair = 'B'; if (pair === 'DE') pair = 'D'; if (pair === 'HL') pair = 'H';
        const map: Record<string, number> = { 'B': 0xC1, 'D': 0xD1, 'H': 0xE1, 'PSW': 0xF1 };
        bytes.push(map[pair] || 0xC1);
      } else if (mnemonic === 'RST') {
        const n = resolveValue(inst.operands[0], inst.lineNum);
        bytes.push(0xC7 | ((n & 7) << 3));
      }

      inst.bytes = bytes;
      for (let b = 0; b < bytes.length; b++) {
        memory[inst.address + b] = bytes[b];
      }

      let instHex = '';
      for (let b = 0; b < bytes.length; b++) {
        instHex += bytes[b].toString(16).padStart(2, '0').toUpperCase() + 'h ';
      }
      objectCodeText += instHex + '\r\n';

      sourceLineToAddress.set(inst.lineNum, inst.address);
      addressToSourceLine.set(inst.address, inst.lineNum);
    }

    // Track all code memory addresses for runtime memory protection
    const codeAddresses = new Set<number>();
    for (const inst of parsedLines) {
      if (!inst.isDirective && inst.bytes) {
        for (let b = 0; b < inst.bytes.length; b++) {
          codeAddresses.add(inst.address + b);
        }
      }
    }

    // =========================================================================
    // =========================================================================
    // ANÁLISIS DE INTEGRIDAD DE MEMORIA (100% FACTUAL, SIN SUPOSICIONES)
    // =========================================================================
    // Detección de colisión real entre bloques (.org y .data) que reclamen las mismas
    // direcciones físicas de memoria, evitando sobreescritura accidental al ensamblar.
    const occupiedRanges: { name: string; start: number; end: number; line: number }[] = [];
    let currentBlock: { name: string; start: number; end: number; line: number } | null = null;

    for (const inst of parsedLines) {
      if (inst.isDirective && (inst.directiveType === 'ORG' || inst.directiveType === 'DATA')) {
        if (currentBlock) {
          occupiedRanges.push(currentBlock);
        }
        currentBlock = {
          name: inst.directiveType,
          start: inst.address,
          end: inst.address + (inst.size || 0),
          line: inst.lineNum
        };
      } else if (currentBlock) {
        currentBlock.end = Math.max(currentBlock.end, inst.address + (inst.size || 0));
      }
    }
    if (currentBlock) occupiedRanges.push(currentBlock);

    for (let i = 0; i < occupiedRanges.length; i++) {
      for (let j = i + 1; j < occupiedRanges.length; j++) {
        const b1 = occupiedRanges[i];
        const b2 = occupiedRanges[j];
        if (b1.start < b2.end && b2.start < b1.end) {
          diagnostics.push({
            line: b2.line,
            message: `⚠️ Advertencia de Colisión: El bloque en ${b2.start.toString(16).padStart(4, '0').toUpperCase()}H se solapa con el bloque previo en ${b1.start.toString(16).padStart(4, '0').toUpperCase()}H (Línea ${b1.line}). Posible sobreescritura de memoria.`,
            isError: false
          });
        }
      }
    }

    return {
      success: diagnostics.filter(d => d.isError).length === 0,
      diagnostics,
      memory,
      symbolTable,
      sourceLineToAddress,
      addressToSourceLine,
      objectCodeText,
      entryPoint,
      codeAddresses
    };
  }
}
