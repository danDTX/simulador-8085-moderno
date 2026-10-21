import { CPU8085 } from '../../core/cpu8085.js';

export interface StackVisualizerPanel {
  element: HTMLElement;
  update: () => void;
}

export function createStackVisualizerPanel(cpu: CPU8085): StackVisualizerPanel {
  const container = document.createElement('div');
  container.className = 'stack-visualizer-container';
  container.style.cssText = 'display: flex; flex-direction: column; height: 100%; background: var(--bg-window); color: var(--text-main); font-family: var(--font-mono); font-size: 12px;';

  container.innerHTML = `
    <div class="stack-toolbar" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0,0,0,0.2); border-bottom: 1px solid var(--border-color); flex-wrap: wrap; gap: 8px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-weight: 700; color: #58a6ff; font-size: 13px;">📚 Pila LIFO (0FFFFH $\\to$ SP)</span>
        <span id="stack-depth-badge" style="background: rgba(88, 166, 255, 0.15); color: #79c0ff; border: 1px solid rgba(88, 166, 255, 0.3); padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">0 elementos</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <button id="btn-stack-reset" class="tb-btn" style="padding: 3px 8px; font-size: 11px;" title="Restablecer Puntero de Pila (SP) a 0FFFFH">🔄 Reset SP</button>
      </div>
    </div>

    <div class="stack-status-bar" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: rgba(0,0,0,0.3); border-bottom: 1px solid var(--border-color); font-size: 11px;">
      <div><strong>SP Actual:</strong> <span id="stack-sp-val" style="color: #f1e05a; font-weight: bold;">FFFFH</span></div>
      <div><strong>Tope de Pila:</strong> <span style="color: #8b949e;">FFFFH</span></div>
      <div id="stack-health" style="color: #3fb950; font-weight: 600;">✅ Estado Normal</div>
    </div>

    <div class="stack-list-header" style="display: grid; grid-template-columns: 80px 70px 1fr 100px; padding: 6px 12px; background: rgba(0,0,0,0.4); font-weight: bold; font-size: 11px; color: var(--text-muted); border-bottom: 1px solid var(--border-color);">
      <div>DIRECCIÓN</div>
      <div>VALOR</div>
      <div>ANÁLISIS DE CONTENIDO</div>
      <div style="text-align: right;">PUNTERO</div>
    </div>

    <div id="stack-items-list" style="flex: 1; overflow-y: auto; padding: 6px 0;">
    </div>
  `;

  const spValElem = container.querySelector('#stack-sp-val') as HTMLElement;
  const depthElem = container.querySelector('#stack-depth-badge') as HTMLElement;
  const healthElem = container.querySelector('#stack-health') as HTMLElement;
  const listElem = container.querySelector('#stack-items-list') as HTMLElement;

  const render = () => {
    const sp = cpu.regs.sp;
    spValElem.textContent = sp.toString(16).toUpperCase().padStart(4, '0') + 'H';

    const depth = (0xFFFF - sp);
    depthElem.textContent = `${depth} byte(s) en pila`;

    // Health warning
    if (sp > 0xFFFF) {
      healthElem.innerHTML = `<span style="color: #f85149;">⚠ Desbordamiento Inferior (SP > FFFFH)</span>`;
    } else if (sp < 0x0500) {
      healthElem.innerHTML = `<span style="color: #f85149;">🚨 ¡Alerta! Peligro de colisión de Pila con Código/Datos (< 0500H)</span>`;
    } else if (depth > 256) {
      healthElem.innerHTML = `<span style="color: #d29922;">⚠ Pila Profunda (> 256 bytes)</span>`;
    } else {
      healthElem.innerHTML = `<span style="color: #3fb950;">✅ Estado Normal</span>`;
    }

    if (sp >= 0xFFFF) {
      listElem.innerHTML = `
        <div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 12px;">
          <div style="font-size: 28px; margin-bottom: 8px;">📭</div>
          <div><strong>La Pila está vacía</strong></div>
          <div style="font-size: 11px; margin-top: 4px; color: #6a737d;">El puntero SP se encuentra en <code>0xFFFF</code>.<br/>Ejecuta <code>PUSH</code> o <code>CALL</code> para observar los datos insertados en LIFO.</div>
        </div>
      `;
      return;
    }

    // Render stack entries from SP up to FFFFH (or max 40 entries)
    let html = '';
    const startAddr = sp;
    const endAddr = Math.min(0xFFFF, sp + 60);

    for (let addr = startAddr; addr <= endAddr; addr++) {
      const isSp = (addr === sp);
      const val = cpu.memory[addr];
      const valHex = val.toString(16).toUpperCase().padStart(2, '0') + 'H';
      const addrHex = addr.toString(16).toUpperCase().padStart(4, '0') + 'H';

      let description = '<span style="color: #8b949e;">Dato de pila</span>';
      let tagBg = 'rgba(255, 255, 255, 0.05)';
      let tagColor = '#c9d1d9';

      // Smart stack classification (paired words: even offset from SP)
      const offset = (addr - sp);
      const isWordHigh = (offset % 2 === 1);
      const isWordLow = (offset % 2 === 0);

      if (isWordLow && addr < 0xFFFF) {
        const nextVal = cpu.memory[addr + 1];
        const wordVal = (nextVal << 8) | val;
        const wordHex = wordVal.toString(16).toUpperCase().padStart(4, '0') + 'H';

        // Check if word corresponds to a known code address (like after a CALL)
        if (wordVal >= 0x0100 && wordVal < 0xE000) {
          description = `<span style="color: #f97583; font-weight: bold;">🎯 Dir. de Retorno (Word: ${wordHex})</span>`;
        } else {
          description = `<span style="color: #79b8ff;">📦 Registro / Palabra (${wordHex})</span>`;
        }
      } else if (isWordHigh) {
        description = `<span style="color: #6a737d;">└── Byte Alto de palabra anterior</span>`;
      }

      const rowBg = isSp ? 'background: rgba(241, 224, 90, 0.15); font-weight: bold;' : '';
      const pointerText = isSp
        ? '<span style="color: #f1e05a; font-weight: bold;">👉 SP</span>'
        : (addr === 0xFFFF ? '<span style="color: #8b949e;">Tope (0xFFFF)</span>' : '');

      html += `
        <div style="display: grid; grid-template-columns: 80px 70px 1fr 100px; padding: 5px 12px; border-bottom: 1px solid rgba(255,255,255,0.03); ${rowBg} font-family: var(--font-mono);">
          <div style="color: ${isSp ? '#f1e05a' : '#8b949e'};">${addrHex}</div>
          <div style="color: #79c0ff; font-weight: bold;">${valHex}</div>
          <div>${description}</div>
          <div style="text-align: right;">${pointerText}</div>
        </div>
      `;
    }

    if (endAddr < 0xFFFF) {
      html += `
        <div style="padding: 6px 12px; text-align: center; color: var(--text-muted); font-size: 11px;">
          ... (+ ${(0xFFFF - endAddr)} bytes más hasta 0xFFFF) ...
        </div>
      `;
    }

    listElem.innerHTML = html;
  };

  container.querySelector('#btn-stack-reset')?.addEventListener('click', () => {
    cpu.regs.sp = 0xFFFF;
    render();
  });

  render();

  return {
    element: container,
    update: render
  };
}
