import { DocsHelper, InstructionDoc } from '../../core/docsHelper.js';

export interface InstructionsPanelCallbacks {
  onInsertCode?: (code: string) => void;
}

export interface InstructionsPanelInstance {
  element: HTMLElement;
  selectInstruction: (name: string) => void;
}

interface CategoryDef {
  id: string;
  label: string;
  match: (group: string) => boolean;
}

const CATEGORIES: CategoryDef[] = [
  { id: 'all', label: 'Todas', match: () => true },
  { id: 'transfer', label: 'Transferencia', match: (g) => g.toLowerCase().includes('transferencia') },
  { id: 'arithmetic', label: 'Aritmética', match: (g) => g.toLowerCase().includes('aritmética') || g.toLowerCase().includes('aritmetica') },
  { id: 'logic', label: 'Lógica y Flags', match: (g) => {
    const s = g.toLowerCase();
    return s.includes('lógica') || s.includes('logica') || s.includes('flag') || s.includes('comparación') || s.includes('comparacion') || s.includes('rotación') || s.includes('rotacion');
  }},
  { id: 'branch', label: 'Saltos', match: (g) => g.toLowerCase().includes('bifurcación') || g.toLowerCase().includes('bifurcacion') },
  { id: 'subroutine', label: 'Subrutinas', match: (g) => {
    const s = g.toLowerCase();
    return s.includes('subrutina') || s.includes('retorno') || s.includes('llamada');
  }},
  { id: 'io_stack', label: 'Pila y E/S', match: (g) => {
    const s = g.toLowerCase();
    return s.includes('pila') || s.includes('entrada/salida') || s.includes('interrup') || s.includes('máquina') || s.includes('maquina');
  }},
  { id: 'directives', label: 'Directivas', match: (g) => g.toLowerCase().includes('directiva') }
];

export function createInstructionsPanel(callbacks: InstructionsPanelCallbacks = {}): InstructionsPanelInstance {
  const container = document.createElement('div');
  container.className = 'panel-instructions-dict';

  const allInstructions: InstructionDoc[] = DocsHelper.getAllInstructions();
  let currentCategory = 'all';
  let searchQuery = '';
  let selectedInstruction: InstructionDoc = allInstructions[0];

  container.innerHTML = `
    <div class="inst-dict-sidebar">
      <div class="inst-dict-search-wrap">
        <input type="text" class="inst-dict-search" placeholder="🔍 Buscar por mnemónico, función, flags..." />
        <button class="inst-dict-clear-search" title="Limpiar búsqueda">✕</button>
      </div>
      <div class="inst-dict-pills"></div>
      <div class="inst-dict-count"></div>
      <div class="inst-dict-list" role="listbox"></div>
    </div>
    <div class="inst-dict-detail" role="region" aria-label="Detalles de la Instrucción"></div>
  `;

  const searchInput = container.querySelector('.inst-dict-search') as HTMLInputElement;
  const clearBtn = container.querySelector('.inst-dict-clear-search') as HTMLButtonElement;
  const pillsContainer = container.querySelector('.inst-dict-pills') as HTMLElement;
  const countLabel = container.querySelector('.inst-dict-count') as HTMLElement;
  const listContainer = container.querySelector('.inst-dict-list') as HTMLElement;
  const detailContainer = container.querySelector('.inst-dict-detail') as HTMLElement;

  // Render category pills
  function renderPills(): void {
    pillsContainer.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `inst-pill ${cat.id === currentCategory ? 'active' : ''}`;
      
      const count = allInstructions.filter(inst => cat.match(inst.group)).length;
      pill.textContent = `${cat.label} (${count})`;

      pill.addEventListener('click', () => {
        if (currentCategory === cat.id) return;
        currentCategory = cat.id;
        pillsContainer.querySelectorAll('.inst-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        applyFilter();
      });

      pillsContainer.appendChild(pill);
    });
  }

  // Filter instructions
  function getFilteredList(): InstructionDoc[] {
    const catDef = CATEGORIES.find(c => c.id === currentCategory) || CATEGORIES[0];
    const q = searchQuery.trim().toLowerCase();

    return allInstructions.filter(inst => {
      // Category match
      if (!catDef.match(inst.group)) return false;

      // Query match
      if (q) {
        const nameMatch = inst.name.toLowerCase().includes(q);
        const sigMatch = inst.sig.toLowerCase().includes(q);
        const groupMatch = inst.group.toLowerCase().includes(q);
        const summaryMatch = inst.summary.toLowerCase().includes(q);
        const flagsMatch = inst.flags.toLowerCase().includes(q);
        const paramsMatch = inst.params.toLowerCase().includes(q);
        if (!nameMatch && !sigMatch && !groupMatch && !summaryMatch && !flagsMatch && !paramsMatch) {
          return false;
        }
      }

      return true;
    });
  }

  // Render instruction list
  function renderList(): void {
    const filtered = getFilteredList();
    countLabel.textContent = `Mostrando ${filtered.length} de ${allInstructions.length} instrucciones`;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="inst-dict-empty">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Sin resultados</div>
          <div class="empty-desc">No se encontraron instrucciones con "${escapeHtml(searchQuery)}".</div>
        </div>
      `;
      detailContainer.innerHTML = `
        <div class="inst-detail-empty">
          Selecciona o busca una instrucción en la lista lateral.
        </div>
      `;
      return;
    }

    // If current selected is not in filtered list, select the first one
    if (!filtered.some(i => i.name.toUpperCase() === selectedInstruction.name.toUpperCase())) {
      selectedInstruction = filtered[0];
    }

    let listHtml = '';
    filtered.forEach(inst => {
      const isSelected = inst.name.toUpperCase() === selectedInstruction.name.toUpperCase();
      listHtml += `
        <div class="inst-item ${isSelected ? 'selected' : ''}" data-name="${escapeHtml(inst.name)}">
          <div class="inst-item-row">
            <span class="inst-item-name">${escapeHtml(inst.name)}</span>
            <span class="inst-item-bytes">${escapeHtml(inst.bytes)}</span>
          </div>
          <div class="inst-item-sig">${escapeHtml(inst.sig)}</div>
          <div class="inst-item-summary">${escapeHtml(inst.summary)}</div>
        </div>
      `;
    });

    listContainer.innerHTML = listHtml;

    // Attach click events
    listContainer.querySelectorAll('.inst-item').forEach(el => {
      el.addEventListener('click', () => {
        const name = el.getAttribute('data-name');
        if (!name) return;
        const target = allInstructions.find(i => i.name.toUpperCase() === name.toUpperCase());
        if (target) {
          selectedInstruction = target;
          listContainer.querySelectorAll('.inst-item').forEach(i => i.classList.remove('selected'));
          el.classList.add('selected');
          renderDetail(target);
        }
      });
    });

    renderDetail(selectedInstruction);
  }

  // Helper: copy to clipboard
  function copyToClipboard(text: string, triggerBtn: HTMLElement, successText: string): void {
    const origText = triggerBtn.innerHTML;
    const restore = () => {
      setTimeout(() => {
        triggerBtn.innerHTML = origText;
      }, 1500);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        triggerBtn.innerHTML = successText;
        restore();
      }).catch(() => {
        fallbackCopy(text, triggerBtn, successText, origText);
      });
    } else {
      fallbackCopy(text, triggerBtn, successText, origText);
    }
  }

  function fallbackCopy(text: string, triggerBtn: HTMLElement, successText: string, origText: string): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      triggerBtn.innerHTML = successText;
    } catch {
      triggerBtn.innerHTML = '❌ Error';
    }
    document.body.removeChild(ta);
    setTimeout(() => {
      triggerBtn.innerHTML = origText;
    }, 1500);
  }

  // Render detail inspector
  function renderDetail(inst: InstructionDoc): void {
    const exampleCode = inst.example || `${inst.sig}    ; Ejemplo de uso`;

    detailContainer.innerHTML = `
      <div class="inst-detail-content">
        <!-- Header -->
        <div class="inst-detail-header">
          <div class="inst-detail-title-wrap">
            <h2 class="inst-detail-title">${escapeHtml(inst.sig)}</h2>
            <span class="inst-detail-group-badge">${escapeHtml(inst.group)}</span>
          </div>
          <div class="inst-detail-actions">
            <button class="btn-inst-action" id="btn-copy-sig" title="Copiar mnemónico al portapapeles">📋 Copiar Sintaxis</button>
            <button class="btn-inst-action" id="btn-copy-example" title="Copiar código de ejemplo al portapapeles">📋 Copiar Ejemplo</button>
            <button class="btn-inst-action btn-inst-action-primary" id="btn-insert-editor" title="Insertar ejemplo directamente en la posición del cursor en el Editor ASM">✍️ Insertar en Editor</button>
          </div>
        </div>

        <!-- Spec Grid -->
        <div class="inst-spec-grid">
          <div class="inst-spec-card">
            <div class="inst-spec-icon">📏</div>
            <div class="inst-spec-info">
              <span class="inst-spec-label">Tamaño en Memoria</span>
              <span class="inst-spec-value">${escapeHtml(inst.bytes)}</span>
            </div>
          </div>
          <div class="inst-spec-card">
            <div class="inst-spec-icon">⏱️</div>
            <div class="inst-spec-info">
              <span class="inst-spec-label">Ciclos / Estados T</span>
              <span class="inst-spec-value">${escapeHtml(inst.cycles)}</span>
            </div>
          </div>
          <div class="inst-spec-card">
            <div class="inst-spec-icon">🚩</div>
            <div class="inst-spec-info">
              <span class="inst-spec-label">Banderas Afectadas</span>
              <span class="inst-spec-value ${inst.flags.toLowerCase().includes('ninguna') ? 'flags-none' : 'flags-active'}">${escapeHtml(inst.flags)}</span>
            </div>
          </div>
        </div>

        <!-- Description Section -->
        <div class="inst-section">
          <h3 class="inst-section-title">📝 Descripción Técnica</h3>
          <div class="inst-section-body inst-text-body">
            ${escapeHtml(inst.summary)}
          </div>
        </div>

        <!-- Parameters Section -->
        <div class="inst-section">
          <h3 class="inst-section-title">⚙️ Parámetros y Operandos Válidos</h3>
          <div class="inst-section-body inst-code-bubble">
            <code>${escapeHtml(inst.params)}</code>
          </div>
        </div>

        <!-- Code Example Section -->
        <div class="inst-section">
          <div class="inst-section-header-row">
            <h3 class="inst-section-title">💻 Ejemplo Práctico en Ensamblador</h3>
          </div>
          <div class="inst-example-box">
            <pre class="inst-example-code"><code>${escapeHtml(exampleCode)}</code></pre>
          </div>
        </div>
      </div>
    `;

    // Button event handlers
    const btnCopySig = detailContainer.querySelector('#btn-copy-sig') as HTMLElement;
    btnCopySig?.addEventListener('click', () => {
      copyToClipboard(inst.sig, btnCopySig, '✅ ¡Copiado!');
    });

    const btnCopyExample = detailContainer.querySelector('#btn-copy-example') as HTMLElement;
    btnCopyExample?.addEventListener('click', () => {
      copyToClipboard(exampleCode, btnCopyExample, '✅ ¡Copiado!');
    });

    const btnInsertEditor = detailContainer.querySelector('#btn-insert-editor') as HTMLElement;
    btnInsertEditor?.addEventListener('click', () => {
      if (callbacks.onInsertCode) {
        callbacks.onInsertCode(exampleCode + '\n');
        const orig = btnInsertEditor.innerHTML;
        btnInsertEditor.innerHTML = '✅ ¡Insertado!';
        setTimeout(() => {
          btnInsertEditor.innerHTML = orig;
        }, 1500);
      }
    });
  }

  function applyFilter(): void {
    renderList();
  }

  // Search input events
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    clearBtn.style.display = searchQuery ? 'block' : 'none';
    applyFilter();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearBtn.style.display = 'none';
    searchInput.focus();
    applyFilter();
  });

  // Keyboard navigation inside list
  container.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const filtered = getFilteredList();
      if (filtered.length <= 1) return;
      const curIdx = filtered.findIndex(i => i.name.toUpperCase() === selectedInstruction.name.toUpperCase());
      let nextIdx = curIdx;
      if (e.key === 'ArrowDown') {
        nextIdx = (curIdx + 1) % filtered.length;
      } else {
        nextIdx = (curIdx - 1 + filtered.length) % filtered.length;
      }
      e.preventDefault();
      selectedInstruction = filtered[nextIdx];
      renderList();
      const activeEl = listContainer.querySelector('.inst-item.selected') as HTMLElement;
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  });

  // Initial render
  renderPills();
  renderList();

  return {
    element: container,
    selectInstruction: (name: string) => {
      const found = allInstructions.find(i => i.name.toUpperCase() === name.toUpperCase());
      if (found) {
        selectedInstruction = found;
        currentCategory = 'all';
        searchQuery = '';
        searchInput.value = '';
        clearBtn.style.display = 'none';
        renderPills();
        renderList();
        const activeEl = listContainer.querySelector('.inst-item.selected') as HTMLElement;
        activeEl?.scrollIntoView({ block: 'nearest' });
      }
    }
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
