import { Intel8085 } from '../../core/cpu8085.js';

export function createMemoryPanel(cpu: Intel8085): { element: HTMLElement; update: () => void } {
  const panel = document.createElement('div');
  panel.className = 'panel-memory';

  let currentBase = 0x0100;
  const rowsCount = 16; // 16 rows * 16 bytes = 256 bytes visible at a time

  panel.innerHTML = `
    <div class="memory-wrapper">
      <div class="memory-toolbar">
        <div class="mem-jump-box">
          <label>Ir a Dirección:</label>
          <input type="text" id="mem-jump-input" placeholder="0100H" style="width: 80px;" />
          <button class="small-btn" id="btn-mem-jump">Ir</button>
        </div>
        <div class="mem-quick-nav">
          <button class="small-btn" id="btn-mem-pc">Seguir PC</button>
          <button class="small-btn" id="btn-mem-sp">Seguir SP</button>
          <button class="small-btn" id="btn-mem-hl">Seguir HL</button>
          <button class="small-btn" id="btn-mem-vram">VRAM (E000H)</button>
        </div>
        <div class="mem-scroll-nav">
          <button class="small-btn" id="btn-mem-prev">▲ Anterior</button>
          <button class="small-btn" id="btn-mem-next">▼ Siguiente</button>
        </div>
      </div>
      <div class="memory-table-container">
        <table class="memory-table">
          <thead>
            <tr>
              <th>Dirección</th>
              <th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th>
              <th>8</th><th>9</th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>F</th>
              <th>ASCII</th>
            </tr>
          </thead>
          <tbody id="memory-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = panel.querySelector('#memory-tbody') as HTMLElement;
  const jumpInput = panel.querySelector('#mem-jump-input') as HTMLInputElement;

  const update = () => {
    const pc = cpu.regs.pc;
    const sp = cpu.regs.sp;
    const hl = (cpu.regs.h << 8) | cpu.regs.l;

    let html = '';
    for (let r = 0; r < rowsCount; r++) {
      const rowAddr = (currentBase + (r * 16)) & 0xffff;
      const addrHex = rowAddr.toString(16).padStart(4, '0').toUpperCase() + 'H';

      let hexCells = '';
      let asciiCells = '';

      for (let c = 0; c < 16; c++) {
        const cellAddr = (rowAddr + c) & 0xffff;
        const val = cpu.readByte(cellAddr);
        const valHex = val.toString(16).padStart(2, '0').toUpperCase();

        let cellClass = 'mem-cell';
        if (cellAddr === pc) cellClass += ' mem-pc';
        if (cellAddr === sp) cellClass += ' mem-sp';
        if (cellAddr === hl) cellClass += ' mem-hl';
        if (val !== 0) cellClass += ' mem-nonzero';

        hexCells += `<td class="${cellClass}" data-addr="${cellAddr}">${valHex}</td>`;

        const char = (val >= 32 && val <= 126) ? String.fromCharCode(val) : '.';
        asciiCells += char;
      }

      html += `
        <tr>
          <td class="mem-addr-cell">${addrHex}</td>
          ${hexCells}
          <td class="mem-ascii-cell">${asciiCells}</td>
        </tr>
      `;
    }

    tbody.innerHTML = html;
  };

  const jumpTo = (addr: number) => {
    currentBase = (addr & 0xfff0);
    update();
  };

  panel.querySelector('#btn-mem-jump')?.addEventListener('click', () => {
    const val = jumpInput.value.trim();
    const parsed = parseInt(val.replace(/h$/i, ''), 16);
    if (!isNaN(parsed)) jumpTo(parsed);
  });

  jumpInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = jumpInput.value.trim();
      const parsed = parseInt(val.replace(/h$/i, ''), 16);
      if (!isNaN(parsed)) jumpTo(parsed);
    }
  });

  panel.querySelector('#btn-mem-prev')?.addEventListener('click', () => jumpTo(currentBase - 256));
  panel.querySelector('#btn-mem-next')?.addEventListener('click', () => jumpTo(currentBase + 256));
  panel.querySelector('#btn-mem-pc')?.addEventListener('click', () => jumpTo(cpu.regs.pc));
  panel.querySelector('#btn-mem-sp')?.addEventListener('click', () => jumpTo(cpu.regs.sp));
  panel.querySelector('#btn-mem-hl')?.addEventListener('click', () => jumpTo((cpu.regs.h << 8) | cpu.regs.l));
  panel.querySelector('#btn-mem-vram')?.addEventListener('click', () => jumpTo(0xE000));

  update();
  return { element: panel, update };
}
