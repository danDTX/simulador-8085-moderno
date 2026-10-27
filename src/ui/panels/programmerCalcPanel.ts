export interface ProgrammerCalcOptions {
  onInsertCode?: (code: string) => void;
}

export interface ProgrammerCalcInstance {
  element: HTMLElement;
  destroy: () => void;
}

export function createProgrammerCalcPanel(options: ProgrammerCalcOptions = {}): ProgrammerCalcInstance {
  const container = document.createElement('div');
  container.className = 'programmer-calc-container';
  container.style.cssText = 'display: flex; flex-direction: column; height: 100%; padding: 12px; box-sizing: border-box; overflow-y: auto; gap: 12px; font-family: var(--font-sans); color: var(--text-main); font-size: 13px;';

  let is16Bit = false;
  let value = 0; // Current accumulator (0 to 0xFF or 0xFFFF)
  let pendingOp: string | null = null;
  let prevValue: number | null = null;

  const getMask = () => (is16Bit ? 0xffff : 0xff);

  const setValue = (newVal: number, updateInputs = true) => {
    const mask = getMask();
    value = ((newVal % (mask + 1)) + (mask + 1)) % (mask + 1);
    render(updateInputs);
  };

  container.innerHTML = `
    <!-- Header with Bit Mode Toggle & Clear -->
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-weight: 600; font-size: 13px;">Modo de Trabajo:</span>
        <div style="display: inline-flex; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 2px;">
          <button id="calc-mode-8" class="calc-mode-btn active" style="border: none; background: var(--accent); color: #fff; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;">8 Bits (Byte)</button>
          <button id="calc-mode-16" class="calc-mode-btn" style="border: none; background: transparent; color: var(--text-muted); padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;">16 Bits (Palabra)</button>
        </div>
      </div>
      <button id="calc-btn-clr" class="tb-btn" style="padding: 4px 10px; font-size: 11px; font-weight: 600; color: #f85149;" title="Poner a 0">CLR (0)</button>
    </div>

    <!-- Base Value Fields (Synchronized Hex, Dec, Oct, Bin) -->
    <div style="display: grid; grid-template-columns: 140px 1fr auto; gap: 6px; align-items: center; background: var(--bg-card); padding: 10px; border-radius: 6px; border: 1px solid var(--border-color);">
      <!-- HEX -->
      <label style="font-weight: bold; font-family: var(--font-mono); color: #ff7b72; font-size: 11px;">HEX (H):</label>
      <input id="calc-in-hex" type="text" style="background: var(--bg-input); color: #79c0ff; border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; font-family: var(--font-mono); font-size: 13px; font-weight: bold; text-transform: uppercase;" spellcheck="false" placeholder="00" />
      <button class="calc-copy-btn tb-btn" data-target="hex" style="padding: 3px 8px; font-size: 11px;" title="Copiar valor Hex">📋</button>

      <!-- DEC (Sin signo) -->
      <label style="font-weight: bold; font-family: var(--font-mono); color: #7ee787; font-size: 11px;">DEC (Sin signo):</label>
      <input id="calc-in-dec" type="number" style="background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; font-family: var(--font-mono); font-size: 13px;" placeholder="0" />
      <button class="calc-copy-btn tb-btn" data-target="dec" style="padding: 3px 8px; font-size: 11px;" title="Copiar valor Decimal">📋</button>

      <!-- DEC (Con signo / C2) -->
      <label style="font-weight: bold; font-family: var(--font-mono); color: #d2a8ff; font-size: 11px;">DEC (Con signo / C2):</label>
      <input id="calc-in-sdec" type="number" style="background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; font-family: var(--font-mono); font-size: 13px;" placeholder="0" />
      <button class="calc-copy-btn tb-btn" data-target="sdec" style="padding: 3px 8px; font-size: 11px;" title="Copiar valor con signo">📋</button>

      <!-- BIN -->
      <label style="font-weight: bold; font-family: var(--font-mono); color: #e3b341; font-size: 11px;">BIN (B):</label>
      <input id="calc-in-bin" type="text" style="background: var(--bg-input); color: #e3b341; border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; font-family: var(--font-mono); font-size: 13px; letter-spacing: 1px;" spellcheck="false" placeholder="00000000" />
      <button class="calc-copy-btn tb-btn" data-target="bin" style="padding: 3px 8px; font-size: 11px;" title="Copiar valor Binario">📋</button>
    </div>

    <!-- Interactive Bit Matrix (Click to toggle any bit) -->
    <div style="background: var(--bg-card); padding: 10px; border-radius: 6px; border: 1px solid var(--border-color);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-size: 11px; font-weight: bold; color: var(--text-muted); text-transform: uppercase;">Matriz Interactiva de Bits (Haz clic para alternar):</span>
        <span id="calc-bit-status" style="font-size: 11px; font-family: var(--font-mono); color: #79c0ff;"></span>
      </div>
      <div id="calc-bit-grid" style="display: flex; justify-content: center; gap: 4px; flex-wrap: wrap;"></div>
    </div>

    <!-- Operations Panel (Unary & Binary) -->
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <span style="font-size: 11px; font-weight: bold; color: var(--text-muted); text-transform: uppercase;">Operaciones Lógicas y Aritméticas:</span>
      
      <!-- Unary Quick Actions -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(70px, 1fr)); gap: 6px;">
        <button class="calc-op-unary tb-btn" data-op="not" title="Inversión bit a bit (Complemento a 1)" style="padding: 6px 4px; font-size: 11px; font-weight: 600;">NOT (CMA)</button>
        <button class="calc-op-unary tb-btn" data-op="neg" title="Complemento a 2 (Invertir + 1)" style="padding: 6px 4px; font-size: 11px; font-weight: 600;">NEG (-X)</button>
        <button class="calc-op-unary tb-btn" data-op="shl" title="Desplazamiento a la izquierda (<< 1)" style="padding: 6px 4px; font-size: 11px; font-weight: 600;">SHL (<<)</button>
        <button class="calc-op-unary tb-btn" data-op="shr" title="Desplazamiento a la derecha (>> 1)" style="padding: 6px 4px; font-size: 11px; font-weight: 600;">SHR (>>)</button>
        <button class="calc-op-unary tb-btn" data-op="rol" title="Rotar a la izquierda circular" style="padding: 6px 4px; font-size: 11px; font-weight: 600;">ROL (RLC)</button>
        <button class="calc-op-unary tb-btn" data-op="ror" title="Rotar a la derecha circular" style="padding: 6px 4px; font-size: 11px; font-weight: 600;">ROR (RRC)</button>
        <button class="calc-op-unary tb-btn" data-op="inc" title="Incrementar en 1 (INR)" style="padding: 6px 4px; font-size: 11px; font-weight: 600;">+1 (INR)</button>
        <button class="calc-op-unary tb-btn" data-op="dec" title="Decrementar en 1 (DCR)" style="padding: 6px 4px; font-size: 11px; font-weight: 600;">-1 (DCR)</button>
      </div>

      <!-- Binary Operations Toolbar -->
      <div style="display: flex; gap: 6px; align-items: center; background: var(--bg-card); padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color);">
        <span style="font-size: 11px; font-weight: bold; color: var(--text-muted);">Op. Binaria:</span>
        <button class="calc-op-binary tb-btn" data-bop="AND" style="padding: 4px 8px; font-size: 11px; font-weight: 600;">AND</button>
        <button class="calc-op-binary tb-btn" data-bop="OR" style="padding: 4px 8px; font-size: 11px; font-weight: 600;">OR</button>
        <button class="calc-op-binary tb-btn" data-bop="XOR" style="padding: 4px 8px; font-size: 11px; font-weight: 600;">XOR</button>
        <button class="calc-op-binary tb-btn" data-bop="ADD" style="padding: 4px 8px; font-size: 11px; font-weight: 600;">+</button>
        <button class="calc-op-binary tb-btn" data-bop="SUB" style="padding: 4px 8px; font-size: 11px; font-weight: 600;">-</button>
        <span id="calc-pending-label" style="margin-left: auto; font-size: 11px; color: #e3b341; font-family: var(--font-mono); font-weight: bold;"></span>
        <button id="calc-btn-eq" class="tb-btn" style="background: var(--accent); color: #fff; padding: 4px 12px; font-weight: bold; font-size: 12px; border: none; border-radius: 4px; cursor: pointer;">=</button>
      </div>
    </div>

    <!-- Quick Assembler Snippet Actions -->
    <div style="margin-top: auto; border-top: 1px solid var(--border-color); padding-top: 10px; display: flex; flex-direction: column; gap: 6px;">
      <span style="font-size: 11px; font-weight: bold; color: var(--text-muted); text-transform: uppercase;">Inserción Directa en el Editor ASM:</span>
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button id="calc-btn-insert-mvi" class="tb-btn" style="flex: 1; min-width: 140px; padding: 6px; font-size: 11px; font-weight: 600;">
          ✍️ Insertar MVI / LXI
        </button>
        <button id="calc-btn-insert-db" class="tb-btn" style="flex: 1; min-width: 140px; padding: 6px; font-size: 11px; font-weight: 600;">
          📦 Insertar dB / dW
        </button>
      </div>
    </div>
  `;

  // DOM Elements
  const mode8Btn = container.querySelector('#calc-mode-8') as HTMLButtonElement;
  const mode16Btn = container.querySelector('#calc-mode-16') as HTMLButtonElement;
  const clrBtn = container.querySelector('#calc-btn-clr') as HTMLButtonElement;

  const hexInput = container.querySelector('#calc-in-hex') as HTMLInputElement;
  const decInput = container.querySelector('#calc-in-dec') as HTMLInputElement;
  const sdecInput = container.querySelector('#calc-in-sdec') as HTMLInputElement;
  const binInput = container.querySelector('#calc-in-bin') as HTMLInputElement;

  const bitGrid = container.querySelector('#calc-bit-grid') as HTMLElement;
  const bitStatus = container.querySelector('#calc-bit-status') as HTMLElement;
  const pendingLabel = container.querySelector('#calc-pending-label') as HTMLElement;
  const eqBtn = container.querySelector('#calc-btn-eq') as HTMLButtonElement;

  const insertMviBtn = container.querySelector('#calc-btn-insert-mvi') as HTMLButtonElement;
  const insertDbBtn = container.querySelector('#calc-btn-insert-db') as HTMLButtonElement;

  // Render logic
  const render = (updateInputs = true) => {
    const totalBits = is16Bit ? 16 : 8;
    const hexDigits = is16Bit ? 4 : 2;

    const hexStr = value.toString(16).padStart(hexDigits, '0').toUpperCase();
    const binStr = value.toString(2).padStart(totalBits, '0');

    // Signed decimal calculation
    let signedDec = value;
    if (is16Bit) {
      if (value >= 0x8000) signedDec = value - 0x10000;
    } else {
      if (value >= 0x80) signedDec = value - 0x100;
    }

    if (updateInputs) {
      hexInput.value = hexStr;
      decInput.value = value.toString(10);
      sdecInput.value = signedDec.toString(10);
      binInput.value = binStr;
    }

    bitStatus.textContent = `${hexStr}H = ${value}d`;

    // Render interactive bit buttons
    let bitHtml = '';
    for (let i = totalBits - 1; i >= 0; i--) {
      const bitVal = (value & (1 << i)) !== 0 ? 1 : 0;
      const isNibbleBorder = i > 0 && i % 4 === 0;
      const bg = bitVal ? 'var(--accent)' : 'var(--bg-input)';
      const color = bitVal ? '#ffffff' : 'var(--text-muted)';
      const borderColor = bitVal ? 'var(--accent)' : 'var(--border-color)';

      bitHtml += `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; ${isNibbleBorder ? 'margin-right: 6px;' : ''}">
          <span style="font-size: 9px; font-family: var(--font-mono); color: var(--text-muted);">${i}</span>
          <button class="calc-bit-toggle" data-bit="${i}" style="width: 24px; height: 26px; border-radius: 4px; border: 1px solid ${borderColor}; background: ${bg}; color: ${color}; font-family: var(--font-mono); font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.1s ease;">
            ${bitVal}
          </button>
        </div>
      `;
    }
    bitGrid.innerHTML = bitHtml;

    // Attach listeners to bit buttons
    bitGrid.querySelectorAll('.calc-bit-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bitIdx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-bit') || '0', 10);
        setValue(value ^ (1 << bitIdx));
      });
    });

    // Update buttons labels
    if (is16Bit) {
      insertMviBtn.textContent = `✍️ Insertar LXI H, ${hexStr}H`;
      insertDbBtn.textContent = `📦 Insertar dW ${hexStr}H`;
    } else {
      insertMviBtn.textContent = `✍️ Insertar MVI A, ${hexStr}H`;
      insertDbBtn.textContent = `📦 Insertar dB ${hexStr}H`;
    }

    if (pendingOp && prevValue !== null) {
      const pStr = prevValue.toString(16).padStart(hexDigits, '0').toUpperCase();
      pendingLabel.textContent = `${pStr}H ${pendingOp}`;
    } else {
      pendingLabel.textContent = '';
    }
  };

  // Event handlers
  mode8Btn.addEventListener('click', () => {
    is16Bit = false;
    mode8Btn.style.background = 'var(--accent)';
    mode8Btn.style.color = '#fff';
    mode16Btn.style.background = 'transparent';
    mode16Btn.style.color = 'var(--text-muted)';
    setValue(value & 0xff);
  });

  mode16Btn.addEventListener('click', () => {
    is16Bit = true;
    mode16Btn.style.background = 'var(--accent)';
    mode16Btn.style.color = '#fff';
    mode8Btn.style.background = 'transparent';
    mode8Btn.style.color = 'var(--text-muted)';
    setValue(value & 0xffff);
  });

  clrBtn.addEventListener('click', () => {
    pendingOp = null;
    prevValue = null;
    setValue(0);
  });

  // Direct Input Listeners
  hexInput.addEventListener('input', () => {
    const raw = hexInput.value.replace(/[^0-9A-Fa-f]/g, '');
    const parsed = parseInt(raw, 16);
    if (!isNaN(parsed)) {
      setValue(parsed, false);
      decInput.value = value.toString(10);
      sdecInput.value = (is16Bit && value >= 0x8000 ? value - 0x10000 : (!is16Bit && value >= 0x80 ? value - 0x100 : value)).toString(10);
      binInput.value = value.toString(2).padStart(is16Bit ? 16 : 8, '0');
    }
  });

  decInput.addEventListener('input', () => {
    const parsed = parseInt(decInput.value, 10);
    if (!isNaN(parsed)) {
      setValue(parsed, false);
      hexInput.value = value.toString(16).padStart(is16Bit ? 4 : 2, '0').toUpperCase();
      sdecInput.value = (is16Bit && value >= 0x8000 ? value - 0x10000 : (!is16Bit && value >= 0x80 ? value - 0x100 : value)).toString(10);
      binInput.value = value.toString(2).padStart(is16Bit ? 16 : 8, '0');
    }
  });

  sdecInput.addEventListener('input', () => {
    const parsed = parseInt(sdecInput.value, 10);
    if (!isNaN(parsed)) {
      const mask = getMask();
      setValue(parsed & mask, false);
      hexInput.value = value.toString(16).padStart(is16Bit ? 4 : 2, '0').toUpperCase();
      decInput.value = value.toString(10);
      binInput.value = value.toString(2).padStart(is16Bit ? 16 : 8, '0');
    }
  });

  binInput.addEventListener('input', () => {
    const raw = binInput.value.replace(/[^01]/g, '');
    const parsed = parseInt(raw, 2);
    if (!isNaN(parsed)) {
      setValue(parsed, false);
      hexInput.value = value.toString(16).padStart(is16Bit ? 4 : 2, '0').toUpperCase();
      decInput.value = value.toString(10);
      sdecInput.value = (is16Bit && value >= 0x8000 ? value - 0x10000 : (!is16Bit && value >= 0x80 ? value - 0x100 : value)).toString(10);
    }
  });

  // Copy Buttons
  container.querySelectorAll('.calc-copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = (e.currentTarget as HTMLElement).getAttribute('data-target');
      let text = '';
      if (target === 'hex') text = value.toString(16).padStart(is16Bit ? 4 : 2, '0').toUpperCase() + 'H';
      else if (target === 'dec') text = value.toString(10);
      else if (target === 'sdec') text = sdecInput.value;
      else if (target === 'bin') text = value.toString(2).padStart(is16Bit ? 16 : 8, '0') + 'B';
      if (text) {
        navigator.clipboard.writeText(text);
      }
    });
  });

  // Unary Operations
  container.querySelectorAll('.calc-op-unary').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const op = (e.currentTarget as HTMLElement).getAttribute('data-op');
      const mask = getMask();
      const totalBits = is16Bit ? 16 : 8;

      if (op === 'not') {
        setValue(~value & mask);
      } else if (op === 'neg') {
        setValue((~value + 1) & mask);
      } else if (op === 'shl') {
        setValue((value << 1) & mask);
      } else if (op === 'shr') {
        setValue(value >>> 1);
      } else if (op === 'rol') {
        const msb = (value >> (totalBits - 1)) & 1;
        setValue(((value << 1) | msb) & mask);
      } else if (op === 'ror') {
        const lsb = value & 1;
        setValue((value >>> 1) | (lsb << (totalBits - 1)));
      } else if (op === 'inc') {
        setValue((value + 1) & mask);
      } else if (op === 'dec') {
        setValue((value - 1) & mask);
      }
    });
  });

  // Binary Operations
  container.querySelectorAll('.calc-op-binary').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const bop = (e.currentTarget as HTMLElement).getAttribute('data-bop') || '';
      prevValue = value;
      pendingOp = bop;
      setValue(0);
    });
  });

  eqBtn.addEventListener('click', () => {
    if (pendingOp && prevValue !== null) {
      const mask = getMask();
      let res = value;
      if (pendingOp === 'AND') res = prevValue & value;
      else if (pendingOp === 'OR') res = prevValue | value;
      else if (pendingOp === 'XOR') res = prevValue ^ value;
      else if (pendingOp === 'ADD') res = (prevValue + value) & mask;
      else if (pendingOp === 'SUB') res = (prevValue - value) & mask;

      pendingOp = null;
      prevValue = null;
      setValue(res);
    }
  });

  // Insert into editor actions
  insertMviBtn.addEventListener('click', () => {
    const hexStr = value.toString(16).padStart(is16Bit ? 4 : 2, '0').toUpperCase();
    const code = is16Bit ? `LXI H, ${hexStr}H` : `MVI A, ${hexStr}H`;
    if (options.onInsertCode) {
      options.onInsertCode(code);
    } else {
      navigator.clipboard.writeText(code);
    }
  });

  insertDbBtn.addEventListener('click', () => {
    const hexStr = value.toString(16).padStart(is16Bit ? 4 : 2, '0').toUpperCase();
    const code = is16Bit ? `dW ${hexStr}H` : `dB ${hexStr}H`;
    if (options.onInsertCode) {
      options.onInsertCode(code);
    } else {
      navigator.clipboard.writeText(code);
    }
  });

  // Initial render
  setValue(0);

  return {
    element: container,
    destroy: () => {}
  };
}
