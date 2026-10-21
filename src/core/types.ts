export interface CpuRegisters {
  a: number; // 8-bit Acumulador
  b: number; // 8-bit
  c: number; // 8-bit
  d: number; // 8-bit
  e: number; // 8-bit
  h: number; // 8-bit
  l: number; // 8-bit
  sp: number; // 16-bit Stack Pointer
  pc: number; // 16-bit Program Counter
}

export interface CpuFlags {
  s: boolean;  // Sign (bit 7)
  z: boolean;  // Zero (bit 6)
  ac: boolean; // Auxiliary Carry (bit 4)
  p: boolean;  // Parity (bit 2)
  cy: boolean; // Carry (bit 0)
}

export interface InterruptState {
  inte: boolean;      // Interrupt Enable master flip-flop
  trap: boolean;      // Non-maskable trap pending
  rst75: boolean;     // RST 7.5 pending
  rst65: boolean;     // RST 6.5 pending
  rst55: boolean;     // RST 5.5 pending
  intr: boolean;      // INTR pending
  intrVector: number; // Vector opcode or address for INTR
  mask75: boolean;    // RST 7.5 mask
  mask65: boolean;    // RST 6.5 mask
  mask55: boolean;    // RST 5.5 mask
}

export interface AssemblyDiagnostic {
  line: number;
  message: string;
  isError: boolean;
}

export interface AssemblyResult {
  success: boolean;
  diagnostics: AssemblyDiagnostic[];
  memory: Uint8Array;
  symbolTable: Map<string, number>;
  sourceLineToAddress: Map<number, number>;
  addressToSourceLine: Map<number, number>;
  objectCodeText: string; // Compatible with .o format of 8085sim
  entryPoint: number;
  codeAddresses: Set<number>;
}

export interface MemWriteRecord {
  addr: number;
  prevVal: number;
}

export interface CpuSnapshot {
  regs: CpuRegisters;
  flags: CpuFlags;
  interrupts: InterruptState;
  halted: boolean;
  totalCycles: number;
  sidBit: boolean;
  sodBit: boolean;
  memWrites: MemWriteRecord[];
}
