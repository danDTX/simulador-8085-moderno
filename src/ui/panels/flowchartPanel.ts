export interface FlowchartPanel {
  element: HTMLElement;
  update: (code: string) => void;
}

interface FlowBlock {
  id: string;
  type: 'start' | 'process' | 'decision' | 'call' | 'end';
  label: string;
  lines: string[];
  nextId?: string;
  branchYesId?: string;
  branchNoId?: string;
}

export function createFlowchartPanel(initialCode: string): FlowchartPanel {
  const container = document.createElement('div');
  container.className = 'flowchart-container';
  container.style.cssText = 'display: flex; flex-direction: column; height: 100%; background: var(--bg-window); color: var(--text-main); font-family: var(--font-sans); box-sizing: border-box;';

  container.innerHTML = `
    <div class="flowchart-toolbar" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0,0,0,0.2); border-bottom: 1px solid var(--border-color); flex-wrap: wrap; gap: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: 700; color: #58a6ff; font-size: 13px;">🔀 Diagrama de Flujo del Algoritmo</span>
        <span id="flowchart-node-count" style="font-size: 11px; color: var(--text-muted); background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 10px;">0 bloques</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <button id="btn-flowchart-copy-mermaid" class="tb-btn" style="padding: 3px 8px; font-size: 11px;" title="Copiar definición de Mermaid para Obsidian">📋 Copiar Mermaid</button>
        <button id="btn-flowchart-refresh" class="tb-btn" style="padding: 3px 8px; font-size: 11px;" title="Actualizar desde el código del editor">🔄 Actualizar</button>
      </div>
    </div>

    <div id="flowchart-viewport" style="flex: 1; overflow: auto; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 16px; background: radial-gradient(circle at 50% 50%, rgba(88, 166, 255, 0.03) 0%, transparent 80%), #0d1117;">
      <div id="flowchart-content" style="display: flex; flex-direction: column; align-items: center; gap: 18px; max-width: 650px; width: 100%;">
      </div>
    </div>
  `;

  const contentElem = container.querySelector('#flowchart-content') as HTMLElement;
  const countElem = container.querySelector('#flowchart-node-count') as HTMLElement;

  let lastMermaidCode = '';

  const parseFlow = (code: string): { blocks: FlowBlock[]; mermaid: string } => {
    const rawLines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith(';'));
    const blocks: FlowBlock[] = [];

    let currentBlock: FlowBlock = {
      id: 'INICIO',
      type: 'start',
      label: 'INICIO',
      lines: []
    };
    blocks.push(currentBlock);

    let blockIdx = 1;

    for (const rawLine of rawLines) {
      const lineWithoutComment = rawLine.split(';')[0].trim();
      if (!lineWithoutComment) continue;

      // Label definition
      if (lineWithoutComment.endsWith(':') || /^[A-Za-z0-9_]+:/.test(lineWithoutComment)) {
        const lbl = lineWithoutComment.replace(':', '').trim();
        currentBlock = {
          id: `node_${lbl}`,
          type: 'process',
          label: lbl,
          lines: []
        };
        blocks.push(currentBlock);
        continue;
      }

      // Directives
      if (lineWithoutComment.startsWith('.')) continue;

      // Conditional Jumps
      const condMatch = lineWithoutComment.match(/^(JZ|JNZ|JC|JNC|JP|JM|JPE|JPO)\s+([A-Za-z0-9_]+)/i);
      if (condMatch) {
        const condType = condMatch[1].toUpperCase();
        const target = condMatch[2];
        const decBlock: FlowBlock = {
          id: `dec_${blockIdx++}`,
          type: 'decision',
          label: `¿${condType}?`,
          lines: [lineWithoutComment],
          branchYesId: `node_${target}`,
          branchNoId: `node_seq_${blockIdx}`
        };
        blocks.push(decBlock);
        currentBlock = {
          id: `node_seq_${blockIdx}`,
          type: 'process',
          label: 'Continuar',
          lines: []
        };
        blocks.push(currentBlock);
        continue;
      }

      // Unconditional Jump
      const jmpMatch = lineWithoutComment.match(/^JMP\s+([A-Za-z0-9_]+)/i);
      if (jmpMatch) {
        currentBlock.lines.push(lineWithoutComment);
        currentBlock.nextId = `node_${jmpMatch[1]}`;
        continue;
      }

      // Subroutine Call
      const callMatch = lineWithoutComment.match(/^CALL\s+([A-Za-z0-9_]+)/i);
      if (callMatch) {
        currentBlock.lines.push(lineWithoutComment);
        continue;
      }

      // Return
      if (lineWithoutComment.toUpperCase() === 'RET') {
        currentBlock.lines.push(lineWithoutComment);
        blocks.push({
          id: `ret_${blockIdx++}`,
          type: 'end',
          label: 'RET (Retorno)',
          lines: []
        });
        continue;
      }

      // Halt
      if (lineWithoutComment.toUpperCase() === 'HLT') {
        currentBlock.lines.push(lineWithoutComment);
        blocks.push({
          id: `end_${blockIdx++}`,
          type: 'end',
          label: 'HLT (Fin de Programa)',
          lines: []
        });
        continue;
      }

      // Standard process instruction
      currentBlock.lines.push(lineWithoutComment);
    }

    // Build Mermaid representation
    let mermaid = 'graph TD\n';
    mermaid += '  Start(["🏁 INICIO"])\n';

    for (const b of blocks) {
      const cleanLabel = (b.label + (b.lines.length > 0 ? '\\n' + b.lines.slice(0, 3).join('\\n') : '')).replace(/"/g, "'");
      if (b.type === 'start') {
        // already started
      } else if (b.type === 'decision') {
        mermaid += `  ${b.id}{"${cleanLabel}"}\n`;
        if (b.branchYesId) mermaid += `  ${b.id} -->|SÍ| ${b.branchYesId}\n`;
        if (b.branchNoId) mermaid += `  ${b.id} -->|NO| ${b.branchNoId}\n`;
      } else if (b.type === 'end') {
        mermaid += `  ${b.id}(["🛑 ${cleanLabel}"])\n`;
      } else {
        mermaid += `  ${b.id}["${cleanLabel}"]\n`;
        if (b.nextId) {
          mermaid += `  ${b.id} --> ${b.nextId}\n`;
        }
      }
    }

    return { blocks: blocks.filter(b => b.lines.length > 0 || b.type !== 'process'), mermaid };
  };

  const render = (code: string) => {
    const { blocks, mermaid } = parseFlow(code);
    lastMermaidCode = mermaid;
    countElem.textContent = `${blocks.length} bloques`;

    let html = '';

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      let cardStyle = '';
      let badgeColor = '#58a6ff';
      let icon = '📦';

      if (b.type === 'start') {
        cardStyle = 'border-color: #3fb950; background: rgba(63, 185, 80, 0.1); border-radius: 20px;';
        badgeColor = '#3fb950';
        icon = '🏁';
      } else if (b.type === 'end') {
        cardStyle = 'border-color: #f85149; background: rgba(248, 81, 73, 0.1); border-radius: 20px;';
        badgeColor = '#f85149';
        icon = '🛑';
      } else if (b.type === 'decision') {
        cardStyle = 'border-color: #d29922; background: rgba(210, 153, 34, 0.12); transform: scale(1.02);';
        badgeColor = '#d29922';
        icon = '❓';
      } else {
        cardStyle = 'border-color: #30363d; background: #161b22;';
        badgeColor = '#79b8ff';
        icon = '⚡';
      }

      html += `
        <div class="flow-node" style="width: 100%; max-width: 480px; border: 1px solid; ${cardStyle} border-radius: 8px; padding: 10px 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); position: relative;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: ${b.lines.length > 0 ? '6px' : '0'};">
            <span style="font-weight: 700; color: ${badgeColor}; font-size: 13px;">${icon} ${b.label}</span>
            <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">${b.type}</span>
          </div>
          ${b.lines.length > 0 ? `
            <div style="background: rgba(0,0,0,0.25); border-radius: 4px; padding: 6px 10px; font-family: var(--font-mono); font-size: 11px; color: #c9d1d9; line-height: 16px;">
              ${b.lines.map(l => `<div>${l}</div>`).join('')}
            </div>
          ` : ''}
          ${b.type === 'decision' ? `
            <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; font-weight: bold;">
              <span style="color: #3fb950;">🟢 SÍ $\\to$ Salto a destino</span>
              <span style="color: #f85149;">🔴 NO $\\to$ Siguiente instrucción</span>
            </div>
          ` : ''}
        </div>
      `;

      if (i < blocks.length - 1) {
        html += `
          <div style="color: #58a6ff; font-size: 16px; margin: -6px 0;">
            ⬇️
          </div>
        `;
      }
    }

    contentElem.innerHTML = html;
  };

  container.querySelector('#btn-flowchart-copy-mermaid')?.addEventListener('click', () => {
    navigator.clipboard.writeText(lastMermaidCode);
    alert('Diagrama Mermaid copiado al portapapeles. ¡Puedes pegarlo directamente en Obsidian o Markdown!');
  });

  render(initialCode);

  return {
    element: container,
    update: (code: string) => render(code)
  };
}
