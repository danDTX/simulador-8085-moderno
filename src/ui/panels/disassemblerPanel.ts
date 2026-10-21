import { CPU8085 } from '../../core/cpu8085.js';
import { Disassembler8085 } from '../../core/disassembler.js';

export interface DisassemblerPanel {
  element: HTMLElement;
  update: () => void;
  goToAddress: (addr: number) => void;
}

export function createDisassemblerPanel(cpu: CPU8085, onStep?: () => void): DisassemblerPanel {
  const container = document.createElement('div');
  container.className = 'disasm-container';
  container.style.cssText = 'display: flex; flex-direction: column; height: 100%; background: var(--bg-window); color: var(--text-main); font-family: var(--font-mono); font-size: 12px;';

  container.innerHTML = `
    <div class="disasm-toolbar" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(0,0,0,0.2); border-bottom: 1px solid var(--border-color); flex-wrap: wrap;">
      <span style="font-weight: 600; font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Dirección Base:</span>
      <input type="text" id="disasm-addr-input" value="0100" maxlength="4" style="width: 65px; background: #0d1117; border: 1px solid var(--border-color); color: #58a6ff; font-family: var(--font-mono); font-weight: bold; padding: 3px 6px; border-radius: 4px; text-transform: uppercase; text-align: center;" />
      <button id="disasm-btn-go" class="tb-btn" style="padding: 3px 8px; font-size: 11px;">🔍 Ir</button>
      <button id="disasm-btn-pc" class="tb-btn" style="padding: 3px 8px; font-size: 11px; color: #f1e05a;" title="Saltar al PC actual">🎯 Ir a PC</button>
      <div style="width: 1px; height: 18px; background: var(--border-color); margin: 0 4px;"></div>
      <button id="disasm-quick-0000" class="tb-btn" style="padding: 2px 6px; font-size: 10px;">0000H (Vectores)</button>
      <button id="disasm-quick-0100" class="tb-btn" style="padding: 2px 6px; font-size: 10px;">0100H (Prog)</button>
      <button id="disasm-quick-0800" class="tb-btn" style="padding: 2px 6px; font-size: 10px;">0800H</button>
      <button id="disasm-quick-e000" class="tb-btn" style="padding: 2px 6px; font-size: 10px;">E000H (VRAM)</button>
      <span id="disasm-status" style="margin-left: auto; font-size: 11px; color: var(--text-muted);">Listo</span>
    </div>
    <div class="disasm-table-header" style="display: grid; grid-template-columns: 80px 100px 1fr 80px; padding: 6px 12px; background: rgba(0,0,0,0.4); font-weight: bold; font-size: 11px; color: var(--text-muted); border-bottom: 1px solid var(--border-color);">
      <div>DIRECCIÓN</div>
      <div>BYTES HEX</div>
      <div>MNEMÓNICO 8085</div>
      <div style="text-align: right;">CICLOS (T)</div>
    </div>
    <div id="disasm-list" class="disasm-list" style="flex: 1; overflow-y: auto; padding: 4px 0;">
    </div>
  `;

  let currentBaseAddr = 0x0100;
  const listElem = container.querySelector('#disasm-list') as HTMLElement;
  const addrInput = container.querySelector('#disasm-addr-input') as HTMLInputElement;
  const statusElem = container.querySelector('#disasm-status') as HTMLElement;

  const render = () => {
    const pc = cpu.regs.pc;
    const instructions = Disassembler8085.disassembleRange(cpu.memory, currentBaseAddr, 60);

    let html = '';
    for (const inst of instructions) {
      const isPc = (inst.address === pc);
      const isSubroutine = inst.mnemonic.startsWith('CALL') || inst.mnemonic.startsWith('RET');
      const isJump = inst.mnemonic.startsWith('J');
      const isHlt = inst.mnemonic === 'HLT';

      let mnemColor = '#79b8ff'; // default mnemonic
      if (isSubroutine) mnemColor = '#f97583';
      else if (isJump) mnemColor = '#b392f0';
      else if (isHlt) mnemColor = '#f85149';

      const rowBg = isPc ? 'background: rgba(241, 224, 90, 0.18); font-weight: bold;' : '';
      const pcIcon = isPc ? '<span style="color: #f1e05a; margin-right: 4px;">▶</span>' : '&nbsp;&nbsp;';

      html += `
        <div class="disasm-row" style="display: grid; grid-template-columns: 80px 100px 1fr 80px; padding: 4px 12px; border-bottom: 1px solid rgba(255,255,255,0.03); ${rowBg} font-family: var(--font-mono);">
          <div style="color: ${isPc ? '#f1e05a' : '#8b949e'};">${pcIcon}${inst.address.toString(16).toUpperCase().padStart(4, '0')}H</div>
          <div style="color: #6a737d;">${inst.hexBytes}</div>
          <div style="color: ${mnemColor};">${inst.mnemonic}</div>
          <div style="text-align: right; color: #8b949e;">${inst.tStates} T</div>
        </div>
      `;
    }

    listElem.innerHTML = html;
    statusElem.textContent = `PC actual: ${pc.toString(16).toUpperCase().padStart(4, '0')}H`;
  };

  const goTo = (addr: number) => {
    currentBaseAddr = addr & 0xFFFF;
    addrInput.value = currentBaseAddr.toString(16).toUpperCase().padStart(4, '0');
    render();
  };

  container.querySelector('#disasm-btn-go')?.addEventListener('click', () => {
    const val = parseInt(addrInput.value, 16);
    if (!isNaN(val)) goTo(val);
  });

  addrInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = parseInt(addrInput.value, 16);
      if (!isNaN(val)) goTo(val);
    }
  });

  container.querySelector('#disasm-btn-pc')?.addEventListener('click', () => {
    goTo(cpu.regs.pc);
  });

  container.querySelector('#disasm-quick-0000')?.addEventListener('click', () => goTo(0x0000));
  container.querySelector('#disasm-quick-0100')?.addEventListener('click', () => goTo(0x0100));
  container.querySelector('#disasm-quick-0800')?.addEventListener('click', () => goTo(0x0800));
  container.querySelector('#disasm-quick-e000')?.addEventListener('click', () => goTo(0xE000));

  render();

  return {
    element: container,
    update: render,
    goToAddress: goTo
  };
}
