import { Intel8085 } from './cpu8085.js';

export type AutoInterruptMode = 'no' | 'invalid_inst' | 'keyboard' | 'timer';

export interface InterruptTriggerSetting {
  mode: AutoInterruptMode;
  timerMs: number;
}

export interface AutoInterruptsSettings {
  trap: InterruptTriggerSetting;
  rst75: InterruptTriggerSetting;
  rst65: InterruptTriggerSetting;
  rst55: InterruptTriggerSetting;
}

export interface PeripheralsState {
  portsIn: Uint8Array;   // 256 input ports
  portsOut: Uint8Array;  // 256 output ports

  // Convenience aliases for backward compatibility
  dipSwitches: number;
  leds: number;
  displays7: number[];
  displays15: number[];

  keypadBuffer: number[];
  currentKeyPressed: number;
  currentKeyLabel: string;
  keyboardPort: number;

  terminalVramStart: number;
  terminalRows: number;
  terminalCols: number;

  timerIntervalMs: number;
  timerEnabled: boolean;
  timerInterruptType: '5.5' | '6.5' | '7.5' | 'INTR' | 'NONE';
  keyboardInterruptType: '5.5' | '6.5' | '7.5' | 'INTR' | 'NONE';

  // Configuración de interrupciones automáticas (FormInterrup)
  autoInterrupts: AutoInterruptsSettings;
}

export class PeripheralsManager {
  public state: PeripheralsState = {
    portsIn: new Uint8Array(256),
    portsOut: new Uint8Array(256),
    dipSwitches: 0x00,
    leds: 0x00,
    displays7: [0, 0, 0, 0, 0, 0, 0, 0],
    displays15: [0, 0, 0, 0, 0, 0, 0, 0],
    keypadBuffer: [],
    currentKeyPressed: 0x00,
    currentKeyLabel: 'NULL',
    keyboardPort: 0x00,
    terminalVramStart: 0xE000,
    terminalRows: 25,
    terminalCols: 40,
    timerIntervalMs: 500,
    timerEnabled: false,
    timerInterruptType: '6.5',
    keyboardInterruptType: '5.5',
    autoInterrupts: {
      trap: { mode: 'no', timerMs: 0 },
      rst75: { mode: 'no', timerMs: 0 },
      rst65: { mode: 'no', timerMs: 0 },
      rst55: { mode: 'keyboard', timerMs: 0 },
    },
  };

  private timerHandle: any = null;
  private timerHandles: { [key: string]: any } = {};
  public onStateChange?: (state: PeripheralsState) => void;
  public onTerminalUpdate?: (addr: number, charCode: number) => void;

  constructor(private cpu: Intel8085) {
    this.attachToCpu();
  }

  public attachToCpu(): void {
    // Port Read Hook (IN port)
    this.cpu.onPortRead = (port: number): number => {
      const p = port & 0xff;
      // If keyboard key is pressed and this is the keyboard port
      if (p === this.state.keyboardPort && this.state.currentKeyPressed !== 0) {
        return this.state.currentKeyPressed & 0xff;
      }
      return this.state.portsIn[p] & 0xff;
    };

    // Port Write Hook (OUT port)
    this.cpu.onPortWrite = (port: number, val: number): void => {
      const p = port & 0xff;
      const v = val & 0xff;
      this.state.portsOut[p] = v;

      // Sync backward compatibility aliases
      if (p === 0x01) this.state.leds = v;
      if (p >= 0x02 && p <= 0x09) {
        this.state.displays7[p - 0x02] = v;
      }

      this.notify();
    };

    // VRAM write hook (0xE000 - 0xE3E7)
    this.cpu.onMemoryWrite = (addr: number, val: number): void => {
      const vramStart = this.state.terminalVramStart;
      const vramEnd = vramStart + (this.state.terminalRows * this.state.terminalCols);
      if (addr >= vramStart && addr < vramEnd) {
        if (this.onTerminalUpdate) {
          this.onTerminalUpdate(addr - vramStart, val);
        }
      }
    };

    // Illegal Opcode hook for TRAP
    this.cpu.onInvalidOpcode = (op: number, pc: number): void => {
      if (this.state.autoInterrupts.trap.mode === 'invalid_inst') {
        this.cpu.interrupts.trap = true;
        this.notify();
      }
    };
  }

  public setInputPortByte(port: number, val: number): void {
    const p = port & 0xff;
    const v = val & 0xff;
    this.state.portsIn[p] = v;
    if (p === 0x00) this.state.dipSwitches = v;
    this.notify();
  }

  public toggleInputPortBit(port: number, bitIndex: number): void {
    const p = port & 0xff;
    this.state.portsIn[p] ^= (1 << bitIndex);
    if (p === 0x00) this.state.dipSwitches = this.state.portsIn[p];
    this.notify();
  }

  public setDipSwitchBit(bitIndex: number, high: boolean): void {
    if (high) {
      this.state.portsIn[0] |= (1 << bitIndex);
    } else {
      this.state.portsIn[0] &= ~(1 << bitIndex);
    }
    this.state.dipSwitches = this.state.portsIn[0];
    this.notify();
  }

  public toggleDipSwitch(bitIndex: number): void {
    this.toggleInputPortBit(0, bitIndex);
  }

  public setDipSwitchesByte(val: number): void {
    this.setInputPortByte(0, val);
  }

  public pressKey(char: string): void {
    const code = char.charCodeAt(0) & 0xff;
    this.state.currentKeyPressed = code;
    this.state.portsIn[this.state.keyboardPort] = code;
    this.state.currentKeyLabel = char === '\r' ? 'ENTER' : char === '\x1b' ? 'ESC' : char;

    // Fire interrupts according to autoInterrupts configuration
    if (this.state.autoInterrupts.trap.mode === 'keyboard') this.cpu.interrupts.trap = true;
    if (this.state.autoInterrupts.rst75.mode === 'keyboard') this.cpu.interrupts.rst75 = true;
    if (this.state.autoInterrupts.rst65.mode === 'keyboard') this.cpu.interrupts.rst65 = true;
    if (this.state.autoInterrupts.rst55.mode === 'keyboard') this.cpu.interrupts.rst55 = true;

    // Backward compatibility with legacy keyboardInterruptType
    if (this.state.keyboardInterruptType === 'INTR') {
      this.cpu.interrupts.intr = true;
    }
    this.notify();
  }

  public releaseKey(): void {
    this.state.currentKeyPressed = 0x00;
    this.state.portsIn[this.state.keyboardPort] = 0x00;
    this.state.currentKeyLabel = 'NULL';
    this.notify();
  }

  public injectKeyPress(keyChar: string, autoReleaseMs: number = 80): void {
    this.pressKey(keyChar);
    if (autoReleaseMs > 0) {
      setTimeout(() => {
        this.releaseKey();
      }, autoReleaseMs);
    }
  }

  public setAutoInterrupts(settings: AutoInterruptsSettings): void {
    this.state.autoInterrupts = JSON.parse(JSON.stringify(settings));
    this.syncTimers();
    this.notify();
  }

  public syncTimers(): void {
    this.stopAllTimers();

    const keys: (keyof AutoInterruptsSettings)[] = ['trap', 'rst75', 'rst65', 'rst55'];
    for (const key of keys) {
      const cfg = this.state.autoInterrupts[key];
      if (cfg.mode === 'timer' && cfg.timerMs > 0) {
        this.timerHandles[key] = setInterval(() => {
          this.cpu.interrupts[key] = true;
          this.notify();
        }, cfg.timerMs);
      }
    }
  }

  public stopAllTimers(): void {
    for (const k of Object.keys(this.timerHandles)) {
      if (this.timerHandles[k]) {
        clearInterval(this.timerHandles[k]);
        delete this.timerHandles[k];
      }
    }
  }

  public startTimer(): void {
    this.stopTimer();
    if (!this.state.timerEnabled || this.state.timerIntervalMs <= 0) return;

    this.timerHandle = setInterval(() => {
      if (this.state.timerInterruptType === '5.5') {
        this.cpu.interrupts.rst55 = true;
      } else if (this.state.timerInterruptType === '6.5') {
        this.cpu.interrupts.rst65 = true;
      } else if (this.state.timerInterruptType === '7.5') {
        this.cpu.interrupts.rst75 = true;
      } else if (this.state.timerInterruptType === 'INTR') {
        this.cpu.interrupts.intr = true;
      }
    }, this.state.timerIntervalMs);
  }

  public stopTimer(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  public reset(): void {
    this.stopTimer();
    this.stopAllTimers();
    this.syncTimers();
    this.state.portsIn.fill(0);
    this.state.portsOut.fill(0);
    this.state.dipSwitches = 0x00;
    this.state.leds = 0x00;
    this.state.displays7 = [0, 0, 0, 0, 0, 0, 0, 0];
    this.state.displays15 = [0, 0, 0, 0, 0, 0, 0, 0];
    this.state.currentKeyPressed = 0x00;
    this.state.currentKeyLabel = 'NULL';
    this.notify();
  }

  private notify(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
