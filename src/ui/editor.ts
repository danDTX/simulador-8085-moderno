import { DocsHelper, InstructionDoc, RegisterDoc } from '../core/docsHelper.js';
import { showUnsavedChangesDialog } from './dialogs/unsavedChangesDialog.js';

export interface EditorTab {
  id: string;
  name: string;
  code: string;
  isDirty: boolean;
  fileHandle?: any;
  filePath?: string;
}

export interface EditorCallbacks {
  onChange?: (code: string) => void;
  onTabChange?: (filename: string, code: string) => void;
  onWordWrapChange?: (enabled: boolean) => void;
  onOpenDelayGen?: () => void;
  onAssemble?: () => void;
  onStep?: () => void;
  onStepOver?: () => void;
  onStepBack?: () => void;
  onRun?: () => void;
  onReset?: () => void;
  onSave?: () => void;
  onSaveTab?: (tab: EditorTab) => Promise<boolean>;
  onToggleBreakpoint?: (line: number, active: boolean) => void;
}

export class CodeEditor {
  private container: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private lineNumbers: HTMLElement;
  private highlightOverlay: HTMLElement;
  private errorBadge: HTMLElement;
  private cursorPosBadge: HTMLElement;
  private filenameBadge: HTMLElement;
  private hoverTooltip: HTMLElement;
  private autocompleteBox: HTMLElement;
  private tabsScrollElem: HTMLElement;
  private editorWrapper!: HTMLElement;
  private callbacks: EditorCallbacks;
  private pcLine: number = -1;
  public breakpoints: Set<number> = new Set();
  public isDirty: boolean = false;
  public needsAssemble: boolean = true;
  public isWordWrap: boolean = true;

  // Tabs state
  public tabs: EditorTab[] = [];
  public activeTabId: string = '';

  // Status & error navigation state
  private statusResetTimer: any = null;
  private currentErrorLine: number | null = null;

  // Autocomplete state
  private acItems: { label: string; detail: string; insertText: string }[] = [];
  private acSelectedIndex: number = 0;
  private isAcOpen: boolean = false;
  private acWordStart: number = 0;
  private acWordEnd: number = 0;

  constructor(container: HTMLElement, initialCode: string, callbacks: EditorCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    const savedWrap = localStorage.getItem('sim8085_word_wrap');
    this.isWordWrap = (savedWrap !== 'false');

    this.container.innerHTML = `
      <div class="editor-wrapper ${this.isWordWrap ? 'word-wrap' : ''}">
        <div class="editor-tab-bar" id="editor-tab-bar">
          <div class="editor-tabs-scroll" id="editor-tabs-scroll"></div>
          <button id="btn-tab-add" class="tab-add-btn" title="Nueva Pestaña (+)">+</button>
        </div>
        <div class="editor-toolbar">
          <button id="btn-assemble" class="tb-btn" title="Ensamblar a Memoria (F9)">⚙️ Ensamblar (F9)</button>
          <button id="btn-step" class="tb-btn" title="Paso a Paso (F7)">⏩ Paso (F7)</button>
          <button id="btn-step-over" class="tb-btn" title="Paso sin Entrar / Step Over (F8)">⤴️ Over (F8)</button>
          <button id="btn-step-back" class="tb-btn" title="Paso Atrás / Step Back (Shift+F7)">◁ Back</button>
          <button id="btn-run" class="tb-btn" title="Ejecutar Continuo (F5)">▶️ Ejecutar (F5)</button>
          <button id="btn-pause" class="tb-btn" title="Pausar">⏸️ Pausar</button>
          <button id="btn-reset" class="tb-btn" title="Reiniciar CPU">🔄 Reset</button>
          <button id="btn-format" class="tb-btn" title="Formatear Código (Shift+Alt+F)">✨ Formatear</button>
          <button id="btn-wrap" class="tb-btn ${this.isWordWrap ? 'tb-btn-active' : ''}" title="Ajuste de Línea Automático (Alt+Z)">↩️ Ajuste</button>
          <button id="btn-delay-gen" class="tb-btn" title="Asistente Calculador de Retardos">⏱️ Retardo</button>
          <span id="editor-filename" class="editor-filename-badge" title="Archivo activo">📄 sin_titulo.asm</span>
        </div>
        <div class="editor-container">
          <div class="editor-gutters">
            <div class="editor-line-numbers" id="editor-line-numbers"></div>
          </div>
          <div class="editor-code-area">
            <pre class="editor-highlight" id="editor-highlight" aria-hidden="true"></pre>
            <textarea class="editor-textarea" id="editor-textarea" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" wrap="${this.isWordWrap ? 'soft' : 'off'}"></textarea>
            <div class="editor-hover-tooltip" id="editor-hover-tooltip" style="display: none;"></div>
            <div class="editor-autocomplete-dropdown" id="editor-autocomplete" style="display: none;"></div>
          </div>
        </div>
        <div class="editor-statusbar" id="editor-statusbar">
          <div class="editor-status-left" id="editor-status-left">
            <span id="editor-status" class="editor-status status-ok">Listo</span>
          </div>
          <div class="editor-status-right">
            <span id="editor-cursor-pos" class="editor-cursor-info">Lín 1, Col 1</span>
            <span class="editor-mode-info">Intel 8085</span>
          </div>
        </div>
      </div>
    `;

    this.editorWrapper = this.container.querySelector('.editor-wrapper') as HTMLElement;
    this.textarea = this.container.querySelector('#editor-textarea') as HTMLTextAreaElement;
    this.lineNumbers = this.container.querySelector('#editor-line-numbers') as HTMLElement;
    this.highlightOverlay = this.container.querySelector('#editor-highlight') as HTMLElement;
    this.errorBadge = this.container.querySelector('#editor-status') as HTMLElement;
    this.cursorPosBadge = this.container.querySelector('#editor-cursor-pos') as HTMLElement;
    this.filenameBadge = this.container.querySelector('#editor-filename') as HTMLElement;
    this.hoverTooltip = this.container.querySelector('#editor-hover-tooltip') as HTMLElement;
    this.autocompleteBox = this.container.querySelector('#editor-autocomplete') as HTMLElement;
    this.tabsScrollElem = this.container.querySelector('#editor-tabs-scroll') as HTMLElement;

    // Clic interactivo en el mensaje de error para saltar directo a la línea fallida
    this.errorBadge.addEventListener('click', () => {
      if (this.currentErrorLine && this.currentErrorLine > 0) {
        this.goToLine(this.currentErrorLine - 1);
      }
    });

    // ResizeObserver for dynamic word wrap recalculations
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        if (this.isWordWrap) {
          this.syncGutterHeights();
        }
      });
      ro.observe(this.highlightOverlay);
    }

    // Initialize first tab
    const initialTab: EditorTab = {
      id: 'tab_' + Date.now(),
      name: 'sin_titulo.asm',
      code: initialCode,
      isDirty: false
    };
    this.tabs = [initialTab];
    this.activeTabId = initialTab.id;
    this.textarea.value = initialCode;

    this.renderTabs();
    this.setupEvents();
    this.setupHoverDocs();
    this.setupAutocomplete();
    this.updateEditor();
  }

  public renderTabs(): void {
    if (!this.tabsScrollElem) return;
    this.tabsScrollElem.innerHTML = '';
    for (const tab of this.tabs) {
      const isActive = (tab.id === this.activeTabId);
      const dirtyDot = tab.isDirty ? '<span class="editor-tab-dirty">•</span>' : '';
      
      const tabEl = document.createElement('div');
      tabEl.className = `editor-tab ${isActive ? 'active' : ''}`;
      tabEl.setAttribute('data-tabid', tab.id);
      tabEl.title = `${tab.name} (Doble clic para renombrar)`;
      tabEl.innerHTML = `
        <span class="editor-tab-title">📄 <span class="editor-tab-name">${tab.name}</span></span>
        ${dirtyDot}
        <span class="editor-tab-close" data-closeid="${tab.id}" title="Cerrar pestaña">✕</span>
      `;

      tabEl.addEventListener('dblclick', (e) => {
        const closeTarget = (e.target as HTMLElement).closest('.editor-tab-close');
        if (closeTarget) return;
        e.stopPropagation();
        this.startTabRename(tab.id, tabEl);
      });

      this.tabsScrollElem.appendChild(tabEl);
    }
  }

  public startTabRename(tabId: string, tabElement: HTMLElement): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    if (tabElement.querySelector('.tab-rename-input')) return;

    const titleSpan = tabElement.querySelector('.editor-tab-title') as HTMLElement;
    if (!titleSpan) return;

    const oldName = tab.name;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tab-rename-input';
    input.value = oldName;

    titleSpan.innerHTML = '📄 ';
    titleSpan.appendChild(input);

    input.focus();
    const dotIdx = oldName.lastIndexOf('.');
    if (dotIdx > 0) {
      input.setSelectionRange(0, dotIdx);
    } else {
      input.select();
    }

    let finished = false;
    const finishRename = (commit: boolean) => {
      if (finished) return;
      finished = true;
      if (commit) {
        let newName = input.value.trim();
        if (newName.length > 0) {
          if (!newName.includes('.')) {
            newName += '.asm';
          }
          tab.name = newName;
          if (tab.id === this.activeTabId) {
            this.setFileName(newName);
            if (this.callbacks.onTabChange) {
              this.callbacks.onTabChange(newName, tab.code);
            }
          }
        }
      }
      this.renderTabs();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishRename(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finishRename(false);
      }
    });

    input.addEventListener('blur', () => {
      finishRename(true);
    });

    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('dblclick', (e) => e.stopPropagation());
    input.addEventListener('mousedown', (e) => e.stopPropagation());
  }

  private setupEvents(): void {
    // Tab Bar click, dblclick and add
    this.tabsScrollElem.addEventListener('dblclick', (e) => {
      const closeTarget = (e.target as HTMLElement).closest('.editor-tab-close');
      if (closeTarget) return;
      const tabTarget = (e.target as HTMLElement).closest('.editor-tab') as HTMLElement;
      if (!tabTarget) return;
      const tabId = tabTarget.getAttribute('data-tabid');
      if (tabId) {
        this.startTabRename(tabId, tabTarget);
      }
    });

    this.tabsScrollElem.addEventListener('click', (e) => {
      const closeTarget = (e.target as HTMLElement).closest('.editor-tab-close') as HTMLElement;
      if (closeTarget) {
        e.stopPropagation();
        const closeId = closeTarget.getAttribute('data-closeid');
        if (closeId) this.closeTab(closeId);
        return;
      }
      const tabTarget = (e.target as HTMLElement).closest('.editor-tab') as HTMLElement;
      if (tabTarget) {
        const tabId = tabTarget.getAttribute('data-tabid');
        if (tabId) this.switchTab(tabId);
      }
    });

    this.container.querySelector('#btn-tab-add')?.addEventListener('click', () => {
      this.newTab();
    });

    this.textarea.addEventListener('input', () => {
      this.isDirty = true;
      this.needsAssemble = true;
      this.currentErrorLine = null;
      const curTab = this.tabs.find(t => t.id === this.activeTabId);
      if (curTab) {
        curTab.code = this.textarea.value;
        curTab.isDirty = true;
      }
      this.renderTabs();
      this.setStatus('✏️ Modificado (se compilará al ejecutar)');
      this.updateCursorPos();
      this.updateEditor();
      this.checkAutocomplete();
      if (this.callbacks.onChange) {
        this.callbacks.onChange(this.textarea.value);
      }
    });

    this.textarea.addEventListener('keyup', () => {
      this.updateCursorPos();
    });

    this.textarea.addEventListener('scroll', () => {
      this.highlightOverlay.scrollTop = this.textarea.scrollTop;
      if (!this.isWordWrap) {
        this.highlightOverlay.scrollLeft = this.textarea.scrollLeft;
      }
      this.lineNumbers.scrollTop = this.textarea.scrollTop;
      this.hideHover();
      this.hideAutocomplete();
    });

    // Ctrl + Click to Go to Definition & Cursor position tracking
    this.textarea.addEventListener('click', (e: MouseEvent) => {
      this.updateCursorPos();
      if (e.ctrlKey || e.metaKey) {
        this.goToDefinitionAtCursor();
      }
    });

    this.textarea.addEventListener('keydown', (e: KeyboardEvent) => {
      // 1. Handle Autocomplete Keyboard Navigation
      if (this.isAcOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.acSelectedIndex = (this.acSelectedIndex + 1) % this.acItems.length;
          this.renderAutocompleteList();
          return;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.acSelectedIndex = (this.acSelectedIndex - 1 + this.acItems.length) % this.acItems.length;
          this.renderAutocompleteList();
          return;
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          this.insertAutocompleteItem(this.acItems[this.acSelectedIndex]);
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.hideAutocomplete();
          return;
        }
      }

      // 2. Tab Key Indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        this.textarea.value = this.textarea.value.substring(0, start) + '    ' + this.textarea.value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 4;
        this.isDirty = true;
        this.needsAssemble = true;
        const curTab = this.tabs.find(t => t.id === this.activeTabId);
        if (curTab) {
          curTab.code = this.textarea.value;
          curTab.isDirty = true;
        }
        this.renderTabs();
        this.updateEditor();
        if (this.callbacks.onChange) this.callbacks.onChange(this.textarea.value);
        return;
      }

      // 3. Format Shortcut: Shift + Alt + F
      if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        this.formatDocument();
        return;
      }

      // Word Wrap Shortcut: Alt + Z
      if (e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.toggleWordWrap();
        return;
      }

      // 4. Go to Definition Shortcut: F12
      if (e.key === 'F12') {
        e.preventDefault();
        this.goToDefinitionAtCursor();
        return;
      }

      // 5. Hotkeys
      if (e.key === 'F9') {
        e.preventDefault();
        if (this.callbacks.onAssemble) this.callbacks.onAssemble();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (this.callbacks.onStepOver) this.callbacks.onStepOver();
      } else if (e.key === 'F7' && e.shiftKey) {
        e.preventDefault();
        if (this.callbacks.onStepBack) this.callbacks.onStepBack();
      } else if (e.key === 'F7') {
        e.preventDefault();
        if (this.callbacks.onStep) this.callbacks.onStep();
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (this.callbacks.onRun) this.callbacks.onRun();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        this.toggleBreakpoint(this.getCursorLine());
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (this.callbacks.onSave) this.callbacks.onSave();
      }
    });

    // Gutter click for Breakpoints & Wheel scroll forwarding
    this.lineNumbers.addEventListener('wheel', (e: WheelEvent) => {
      this.textarea.scrollTop += e.deltaY;
      this.textarea.scrollLeft += e.deltaX;
    }, { passive: true });

    this.lineNumbers.addEventListener('click', (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.line-number') as HTMLElement;
      if (!target) return;
      const line = parseInt(target.getAttribute('data-line') || '0', 10);
      if (line > 0) {
        this.toggleBreakpoint(line);
      }
    });

    // Toolbar buttons
    this.container.querySelector('#btn-assemble')?.addEventListener('click', () => {
      if (this.callbacks.onAssemble) this.callbacks.onAssemble();
    });
    this.container.querySelector('#btn-step')?.addEventListener('click', () => {
      if (this.callbacks.onStep) this.callbacks.onStep();
    });
    this.container.querySelector('#btn-step-over')?.addEventListener('click', () => {
      if (this.callbacks.onStepOver) this.callbacks.onStepOver();
    });
    this.container.querySelector('#btn-step-back')?.addEventListener('click', () => {
      if (this.callbacks.onStepBack) this.callbacks.onStepBack();
    });
    this.container.querySelector('#btn-run')?.addEventListener('click', () => {
      if (this.callbacks.onRun) this.callbacks.onRun();
    });
    this.container.querySelector('#btn-pause')?.addEventListener('click', () => {
      if (this.callbacks.onRun) this.callbacks.onRun();
    });
    this.container.querySelector('#btn-reset')?.addEventListener('click', () => {
      if (this.callbacks.onReset) this.callbacks.onReset();
    });
    this.container.querySelector('#btn-format')?.addEventListener('click', () => {
      this.formatDocument();
    });
    this.container.querySelector('#btn-wrap')?.addEventListener('click', () => {
      this.toggleWordWrap();
    });
    this.container.querySelector('#btn-delay-gen')?.addEventListener('click', () => {
      if (this.callbacks.onOpenDelayGen) this.callbacks.onOpenDelayGen();
    });
  }

  // --- FORMATEADOR AUTOMATICO DE CODIGO (Shift + Alt + F) ---
  public formatDocument(): void {
    const formatted = DocsHelper.formatAssembly(this.textarea.value);
    if (formatted !== this.textarea.value) {
      const curPos = this.textarea.selectionStart;
      this.textarea.value = formatted;
      this.textarea.selectionStart = this.textarea.selectionEnd = Math.min(curPos, formatted.length);
      this.isDirty = true;
      this.needsAssemble = true;
      const curTab = this.tabs.find(t => t.id === this.activeTabId);
      if (curTab) {
        curTab.code = formatted;
        curTab.isDirty = true;
      }
      this.renderTabs();
      this.updateEditor();
      if (this.callbacks.onChange) this.callbacks.onChange(formatted);
      this.setStatus('✨ Código formateado correctamente');
    } else {
      this.setStatus('Código ya formateado');
    }
  }

  // --- IR A DEFINICION (F12 o Ctrl + Clic) ---
  public goToDefinitionAtCursor(): void {
    const pos = this.textarea.selectionStart;
    const text = this.textarea.value;
    let start = pos;
    let end = pos;
    while (start > 0 && /[a-zA-Z0-9_]/.test(text[start - 1])) start--;
    while (end < text.length && /[a-zA-Z0-9_]/.test(text[end])) end++;
    const word = text.substring(start, end).trim();
    if (!word) return;

    const labels = DocsHelper.scanLabels(text);
    if (labels.has(word)) {
      const info = labels.get(word)!;
      this.goToLine(info.line);
      this.setStatus(`📍 Saltó a la definición de '${word}' (Línea ${info.line + 1})`);
    } else {
      this.setStatus(`No se encontró la definición de la etiqueta '${word}'`, true);
    }
  }

  public goToLine(lineIndex: number): void {
    const lines = this.textarea.value.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    let charIndex = 0;
    for (let i = 0; i < lineIndex; i++) {
      charIndex += lines[i].length + 1;
    }
    this.textarea.selectionStart = this.textarea.selectionEnd = charIndex;
    if (this.isWordWrap && this.highlightOverlay.children[lineIndex]) {
      const lineEl = this.highlightOverlay.children[lineIndex] as HTMLElement;
      this.textarea.scrollTop = Math.max(0, lineEl.offsetTop - 60);
    } else {
      const lineHeight = parseFloat(getComputedStyle(this.textarea).lineHeight) || 20;
      this.textarea.scrollTop = Math.max(0, lineIndex * lineHeight - 60);
    }
    this.textarea.focus();
    this.updateEditor();
  }

  // --- HOVER DOCUMENTATION (Extension VS Code 8085sim-helper) ---
  private setupHoverDocs(): void {
    let hoverTimeout: any = null;

    this.textarea.addEventListener('mousemove', (e: MouseEvent) => {
      // 1. Localizar con precisión la línea de código visual bajo el cursor
      const codeLines = this.highlightOverlay.children;
      let targetLineEl: HTMLElement | null = null;
      for (let i = 0; i < codeLines.length; i++) {
        const lineEl = codeLines[i] as HTMLElement;
        const lineRect = lineEl.getBoundingClientRect();
        if (e.clientY >= lineRect.top && e.clientY <= lineRect.bottom) {
          targetLineEl = lineEl;
          break;
        }
      }

      if (!targetLineEl) {
        clearTimeout(hoverTimeout);
        this.hideHover();
        return;
      }

      // 2. Localizar el token o palabra exacta inspeccionando los spans renderizados
      let foundWord = '';
      let targetSpanRect: DOMRect | null = null;
      const spans = targetLineEl.querySelectorAll('span');
      for (let s = 0; s < spans.length; s++) {
        const span = spans[s] as HTMLElement;
        const sRect = span.getBoundingClientRect();
        if (
          e.clientX >= sRect.left &&
          e.clientX <= sRect.right &&
          e.clientY >= sRect.top &&
          e.clientY <= sRect.bottom
        ) {
          if (span.classList.contains('syn-comment')) {
            // En comentarios no desplegar documentación de instrucciones
            break;
          }
          foundWord = span.getAttribute('data-token') || span.textContent?.replace(/:$/, '').trim() || '';
          targetSpanRect = sRect;
          break;
        }
      }

      if (foundWord) {
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
          this.showHoverForToken(foundWord, e.clientX, e.clientY, targetSpanRect);
        }, 120);
      } else {
        clearTimeout(hoverTimeout);
        this.hideHover();
      }
    });

    this.textarea.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimeout);
      this.hideHover();
    });
  }

  private showHoverForToken(token: string, x: number, y: number, tokenRect?: DOMRect | null): void {
    const upper = token.toUpperCase();
    let contentHtml = '';

    // 1. Número Hexadecimal (ej. 54H, 0E030H, 0x12)
    if (/(^0x[0-9a-f]+$)|(^[0-9][0-9a-f]*h$)/i.test(token)) {
      const hexDoc = DocsHelper.renderHexHoverHtml(token);
      if (hexDoc) {
        contentHtml = hexDoc;
      }
    }

    // 2. Instrucción o Directiva
    if (!contentHtml) {
      const inst = DocsHelper.getInstruction(upper);
      if (inst) {
        contentHtml = DocsHelper.renderInstructionHoverHtml(inst);
      }
    }

    // 3. Registro
    if (!contentHtml) {
      const reg = DocsHelper.getRegister(upper);
      if (reg) {
        contentHtml = DocsHelper.renderRegisterHoverHtml(reg);
      }
    }

    // 4. Etiqueta / Subrutina existente en el documento
    if (!contentHtml) {
      const labels = DocsHelper.scanLabels(this.textarea.value);
      if (labels.has(token)) {
        const info = labels.get(token)!;
        contentHtml = DocsHelper.renderLabelHoverHtml(token, info.line);
      }
    }

    if (!contentHtml) {
      this.hideHover();
      return;
    }

    this.hoverTooltip.innerHTML = contentHtml;
    this.hoverTooltip.style.display = 'block';

    const parent = (this.hoverTooltip.offsetParent as HTMLElement) || this.textarea.parentElement || this.container;
    const parentRect = parent.getBoundingClientRect();

    const tooltipW = this.hoverTooltip.offsetWidth || 360;
    const tooltipH = this.hoverTooltip.offsetHeight || 280;

    const tokenTop = tokenRect ? tokenRect.top - parentRect.top : y - parentRect.top;
    const tokenBottom = tokenRect ? tokenRect.bottom - parentRect.top : y - parentRect.top + 20;
    const tokenLeft = tokenRect ? tokenRect.left - parentRect.left : x - parentRect.left;

    // Posicionamiento horizontal: alineado al token o cursor, protegido de bordes
    let posX = tokenLeft;
    if (posX + tooltipW > parentRect.width - 15) {
      posX = parentRect.width - tooltipW - 15;
    }
    if (posX < 10) {
      posX = 10;
    }

    // Posicionamiento vertical inteligente (Flip arriba/abajo según disponibilidad)
    let posY = tokenBottom + 8; // Posición estándar: debajo de la instrucción

    // Si desborda por la parte inferior del contenedor del editor
    if (posY + tooltipH > parentRect.height - 10) {
      // Si cabe completo en la parte superior de la instrucción
      if (tokenTop - tooltipH - 8 >= 5) {
        posY = tokenTop - tooltipH - 8;
      } else {
        // Si no cabe completo arriba ni abajo, colocar donde haya mayor altura disponible
        if (tokenTop > parentRect.height - tokenBottom) {
          posY = Math.max(5, tokenTop - tooltipH - 8);
        } else {
          posY = Math.max(5, Math.min(tokenBottom + 8, parentRect.height - tooltipH - 10));
        }
      }
    }

    this.hoverTooltip.style.left = `${Math.round(posX)}px`;
    this.hoverTooltip.style.top = `${Math.round(posY)}px`;
  }

  private hideHover(): void {
    this.hoverTooltip.style.display = 'none';
  }

  // --- AUTOCOMPLETADO INTELIGENTE (Extension VS Code 8085sim-helper) ---
  private setupAutocomplete(): void {
    this.autocompleteBox.addEventListener('click', (e) => {
      const itemElem = (e.target as HTMLElement).closest('.ac-item') as HTMLElement;
      if (itemElem) {
        const idx = parseInt(itemElem.getAttribute('data-idx') || '0', 10);
        this.insertAutocompleteItem(this.acItems[idx]);
      }
    });

    // Cerrar el modal al hacer clic en cualquier otra parte de la ventana o del documento
    document.addEventListener('pointerdown', (e: PointerEvent) => {
      if (this.isAcOpen && !this.autocompleteBox.contains(e.target as Node)) {
        this.hideAutocomplete();
      }
    });
  }

  private checkAutocomplete(): void {
    const pos = this.textarea.selectionStart;
    const text = this.textarea.value;

    const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
    const linePrefix = text.substring(lineStart, pos);
    const trimmedPrefix = linePrefix.trim();

    // -------------------------------------------------------------
    // FEATURE A: DISPARADORES DE CABECERAS Y SEPARADORES (;;;, ;;, ;;=, ;;sub, ;;p)
    // -------------------------------------------------------------
    const isBannerTrigger = /^;{2,3}$/.test(trimmedPrefix) || (trimmedPrefix.startsWith(';;') && trimmedPrefix.length >= 2);
    if (isBannerTrigger) {
      const bannerItems = [
        {
          label: ';;; Separador de Bloque (---)',
          detail: 'Bloque con guiones y título al medio',
          insertText:
            '; -------------------------------------------------------------------------\n' +
            '; Descripción o Título del bloque\n' +
            '; -------------------------------------------------------------------------\n'
        },
        {
          label: ';;= Cabecera Principal (===)',
          detail: 'Bloque maestro con líneas dobles',
          insertText:
            '; ==============================================================================\n' +
            '; SECCIÓN PRINCIPAL\n' +
            '; ==============================================================================\n'
        },
        {
          label: ';;sub Subrutina Documentada',
          detail: 'Plantilla con Propósito, Entrada, Salida y RET',
          insertText:
            '; -------------------------------------------------------------------------\n' +
            '; Subrutina: NOMBRE_SUBRUTINA\n' +
            '; Propósito:  Descripción de la función\n' +
            '; Entrada:    Registros de entrada\n' +
            '; Salida:     Registros de salida / Flags\n' +
            '; -------------------------------------------------------------------------\n' +
            'NOMBRE_SUBRUTINA:\n' +
            '    \n' +
            '    RET\n'
        },
        {
          label: ';;p Paso o Fase Numerada',
          detail: '--- PASO 1: Descripción ---',
          insertText: '; --- PASO 1: Descripción del paso ---\n'
        }
      ];

      this.acItems = bannerItems;
      this.acSelectedIndex = 0;
      const leadingSpace = linePrefix.length - trimmedPrefix.length;
      this.acWordStart = lineStart + leadingSpace;
      this.acWordEnd = pos;
      this.isAcOpen = true;

      this.renderAutocompleteList();
      this.positionPopup(lineStart, pos);
      return;
    }

    // Si estamos dentro de un comentario ordinario después de ';', no autocompletar
    if (linePrefix.includes(';')) {
      this.hideAutocomplete();
      return;
    }

    const codeOnly = linePrefix.split(';')[0];
    const stripped = codeOnly.replace(/^\s*([A-Za-z_][A-Za-z0-9_]*:)?\s*/, '');
    const tokens = stripped.split(/\s+/).filter(t => t.length > 0);

    let isOperandZone = false;
    let currentOpcode = '';

    if (tokens.length >= 2) {
      isOperandZone = true;
      currentOpcode = tokens[0].toUpperCase();
    } else if (tokens.length === 1 && !stripped.endsWith(tokens[0])) {
      isOperandZone = true;
      currentOpcode = tokens[0].toUpperCase();
    }

    // Validación de aridad para autocompletado inteligente
    if (isOperandZone) {
      const ZERO_OPERANDS = new Set([
        'NOP', 'HLT', 'RET', 'RC', 'RNC', 'RZ', 'RNZ', 'RP', 'RM', 'RPE', 'RPO',
        'DAA', 'CMA', 'STC', 'CMC', 'RLC', 'RRC', 'RAL', 'RAR', 'EI', 'DI',
        'RIM', 'SIM', 'XCHG', 'XTHL', 'SPHL', 'PCHL'
      ]);

      if (ZERO_OPERANDS.has(currentOpcode)) {
        this.hideAutocomplete();
        return;
      }

      const ONE_OPERAND_SET = new Set([
        'ADD', 'ADC', 'SUB', 'SBB', 'ANA', 'ORA', 'XRA', 'CMP', 'INR', 'DCR',
        'INX', 'DCX', 'DAD', 'PUSH', 'POP', 'LDAX', 'STAX',
        'ADI', 'ACI', 'SUI', 'SBI', 'ANI', 'XRI', 'ORI', 'CPI', 'IN', 'OUT', 'RST',
        'CALL', 'CC', 'CNC', 'CZ', 'CNZ', 'CM', 'CP', 'CPE', 'CPO',
        'JMP', 'JC', 'JNC', 'JZ', 'JNZ', 'JM', 'JP', 'JPE', 'JPO',
        'LDA', 'STA', 'LHLD', 'SHLD'
      ]);

      if (ONE_OPERAND_SET.has(currentOpcode)) {
        // Instrucciones de 1 solo parámetro: no deben tener coma ni más operandos
        if (codeOnly.includes(',')) {
          this.hideAutocomplete();
          return;
        }
        // Si ya completó el operando y dejó un espacio posterior (ej. 'ADD B ')
        if (tokens.length >= 2 && /\s$/.test(codeOnly)) {
          this.hideAutocomplete();
          return;
        }
      } else if (currentOpcode === 'MOV') {
        const commaCount = (codeOnly.match(/,/g) || []).length;
        if (commaCount > 1) {
          this.hideAutocomplete();
          return;
        }
        if (commaCount === 1 && /\s$/.test(codeOnly) && tokens.length >= 3) {
          this.hideAutocomplete();
          return;
        }
      } else if (currentOpcode === 'MVI') {
        // En MVI, el segundo operando tras la coma es dato numérico, no registro
        if (codeOnly.includes(',')) {
          this.hideAutocomplete();
          return;
        }
      }
    }

    // Palabra siendo escrita actualmente
    let start = pos;
    while (start > 0 && /[a-zA-Z0-9_\.]/.test(text[start - 1])) {
      start--;
    }
    const currentWord = text.substring(start, pos);

    if (currentWord.length < 1 && !isOperandZone) {
      this.hideAutocomplete();
      return;
    }

    const query = currentWord.toUpperCase();
    const suggestions: { label: string; detail: string; insertText: string }[] = [];

    // -------------------------------------------------------------
    // FEATURE B: ZONA DE OPERANDOS (Etiquetas de salto o Registros)
    // -------------------------------------------------------------
    if (isOperandZone) {
      const jumpCallOpcodes = ['CALL', 'CC', 'CNC', 'CZ', 'CNZ', 'CM', 'CP', 'CPE', 'CPO', 'JMP', 'JC', 'JNC', 'JZ', 'JNZ', 'JM', 'JP', 'JPE', 'JPO'];
      const isLxiLabelZone = (currentOpcode === 'LXI' && codeOnly.includes(','));

      if (jumpCallOpcodes.includes(currentOpcode) || isLxiLabelZone) {
        // Autocompletar con todas las ETIQUETAS del documento
        const labels = DocsHelper.scanLabels(text);
        for (const [name, info] of labels.entries()) {
          if (name.toUpperCase().startsWith(query)) {
            suggestions.push({
              label: name,
              detail: `Etiqueta (Línea ${info.line + 1})`,
              insertText: name
            });
          }
        }
      } else {
        // Autocompletar con los REGISTROS permitidos según la instrucción
        let allowedRegs: string[] = [];
        if (['LDAX', 'STAX'].includes(currentOpcode)) {
          allowedRegs = ['B', 'D'];
        } else if (['PUSH', 'POP'].includes(currentOpcode)) {
          allowedRegs = ['PSW', 'B', 'D', 'H'];
        } else if (['INX', 'DCX', 'DAD'].includes(currentOpcode) || (currentOpcode === 'LXI' && !codeOnly.includes(','))) {
          allowedRegs = ['B', 'D', 'H', 'SP'];
        } else if (['MOV', 'ADD', 'ADC', 'SUB', 'SBB', 'ANA', 'ORA', 'XRA', 'CMP', 'INR', 'DCR'].includes(currentOpcode) || (currentOpcode === 'MVI' && !codeOnly.includes(','))) {
          allowedRegs = ['A', 'B', 'C', 'D', 'E', 'H', 'L', 'M'];
        }

        for (const r of allowedRegs) {
          if (r.startsWith(query)) {
            suggestions.push({
              label: r,
              detail: `Registro ${r}`,
              insertText: r
            });
          }
        }
      }
    } else {
      // -------------------------------------------------------------
      // FEATURE C: INSTRUCCIONES, DIRECTIVAS Y PLANTILLAS
      // -------------------------------------------------------------
      // Snippet inicio
      if ('INICIO'.startsWith(query) && query.length >= 1) {
        suggestions.push({
          label: 'inicio',
          detail: 'Plantilla base 8085sim (.DATA y .ORG)',
          insertText:
            '; ==============================================================================\n' +
            '; Programa: Nombre del Programa\n' +
            '; ==============================================================================\n\n' +
            '; --- 1. BLOQUE DE DATOS EN RAM ---\n' +
            '.DATA 0200H\n' +
            'TABLA:  DB 10H, 20H, 30H\n\n' +
            '.DATA 0250H\n' +
            'MAYOR:  DB 00H\n' +
            'MENOR:  DB 00H\n\n' +
            '; --- 2. CODIGO PRINCIPAL ---\n' +
            '.ORG 0100H\n' +
            'INICIO:\n' +
            '    LXI SP, 0FFFFH      ; Inicializar puntero de pila\n' +
            '    \n' +
            '    HLT\n'
        });
      }

      // Instrucciones 8085
      for (const inst of DocsHelper.getAllInstructions()) {
        const isDirective = inst.name.startsWith('.');
        const nameClean = isDirective ? inst.name.substring(1) : inst.name;

        if (inst.name.toUpperCase().startsWith(query) || nameClean.toUpperCase().startsWith(query)) {
          suggestions.push({
            label: inst.name,
            detail: `${inst.sig} [${inst.cycles}]`,
            insertText: inst.name
          });
        }
      }
    }

    if (suggestions.length === 0) {
      this.hideAutocomplete();
      return;
    }

    this.acItems = suggestions.slice(0, 10);
    this.acSelectedIndex = 0;
    this.acWordStart = start;
    this.acWordEnd = pos;
    this.isAcOpen = true;

    this.renderAutocompleteList();
    this.positionPopup(lineStart, pos);
  }

  private positionPopup(lineStart: number, pos: number): void {
    const text = this.textarea.value;
    const lines = text.substring(0, pos).split('\n');
    const lineIndex = lines.length - 1;
    const colIndex = lines[lineIndex].length;

    const lineHeight = parseFloat(getComputedStyle(this.textarea).lineHeight) || 20;
    const charWidth = 7.8;
    const top = Math.min((lineIndex + 1) * lineHeight - this.textarea.scrollTop + 40, this.container.clientHeight - 200);
    const left = Math.min(colIndex * charWidth + 50 - this.textarea.scrollLeft, this.container.clientWidth - 280);

    this.autocompleteBox.style.top = `${Math.max(35, top)}px`;
    this.autocompleteBox.style.left = `${Math.max(50, left)}px`;
    this.autocompleteBox.style.display = 'block';
  }

  private renderAutocompleteList(): void {
    let html = '';
    this.acItems.forEach((item, idx) => {
      const isSelected = (idx === this.acSelectedIndex);
      html += `
        <div class="ac-item ${isSelected ? 'ac-selected' : ''}" data-idx="${idx}">
          <span class="ac-icon">⚡</span>
          <span class="ac-label">${item.label}</span>
          <span class="ac-detail">${item.detail}</span>
        </div>
      `;
    });
    this.autocompleteBox.innerHTML = html;
  }

  private insertAutocompleteItem(item: { label: string; insertText: string }): void {
    if (!item) return;
    const before = this.textarea.value.substring(0, this.acWordStart);
    const after = this.textarea.value.substring(this.acWordEnd);

    // If it's a multiline snippet or directive, insert directly; if opcode, add space
    const isSnippet = item.insertText.includes('\n');
    const replacement = isSnippet ? item.insertText : item.insertText + ' ';

    this.textarea.value = before + replacement + after;
    this.textarea.selectionStart = this.textarea.selectionEnd = before.length + replacement.length;
    this.isDirty = true;
    this.needsAssemble = true;
    const cur = this.tabs.find(t => t.id === this.activeTabId);
    if (cur) {
      cur.code = this.textarea.value;
      cur.isDirty = true;
    }
    this.renderTabs();
    this.hideAutocomplete();
    this.updateEditor();
    if (this.callbacks.onChange) {
      this.callbacks.onChange(this.textarea.value);
    }
    this.textarea.focus();
  }

  private hideAutocomplete(): void {
    this.isAcOpen = false;
    this.autocompleteBox.style.display = 'none';
  }

  public getValue(): string {
    return this.textarea.value;
  }

  public syncScroll(): void {
    this.highlightOverlay.scrollTop = this.textarea.scrollTop;
    if (!this.isWordWrap) {
      this.highlightOverlay.scrollLeft = this.textarea.scrollLeft;
    }
    this.lineNumbers.scrollTop = this.textarea.scrollTop;
  }

  public setValue(code: string): void {
    this.textarea.value = code;
    this.isDirty = false;
    const cur = this.tabs.find(t => t.id === this.activeTabId);
    if (cur) {
      cur.code = code;
      cur.isDirty = false;
    }
    this.renderTabs();
    this.updateEditor();
  }

  public insertAtCursor(code: string): void {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const before = this.textarea.value.substring(0, start);
    const after = this.textarea.value.substring(end);

    this.textarea.value = before + code + after;
    this.textarea.selectionStart = this.textarea.selectionEnd = start + code.length;
    this.isDirty = true;
    this.needsAssemble = true;
    const cur = this.tabs.find(t => t.id === this.activeTabId);
    if (cur) {
      cur.code = this.textarea.value;
      cur.isDirty = true;
    }
    this.renderTabs();
    this.setStatus('✏️ Modificado (se compilará al ejecutar)');
    this.updateEditor();
    if (this.callbacks.onChange) {
      this.callbacks.onChange(this.textarea.value);
    }
    this.textarea.focus();
  }

  public setFileName(name: string): void {
    if (this.filenameBadge) {
      this.filenameBadge.textContent = `📄 ${name}`;
      this.filenameBadge.title = `Archivo activo: ${name}`;
    }
    const cur = this.tabs.find(t => t.id === this.activeTabId);
    if (cur) {
      cur.name = name;
      this.renderTabs();
    }
  }

  public getActiveTab(): EditorTab | undefined {
    return this.tabs.find(t => t.id === this.activeTabId);
  }

  public openTab(name: string, code: string, fileHandle?: any, filePath?: string): void {
    const existing = this.tabs.find(t => t.name === name);
    if (existing) {
      existing.code = code;
      if (fileHandle) existing.fileHandle = fileHandle;
      if (filePath) existing.filePath = filePath;
      existing.isDirty = false;
      this.switchTab(existing.id, true);
      return;
    }

    if (this.tabs.length === 1 && !this.tabs[0].isDirty && this.tabs[0].code.trim().length <= 40 && this.tabs[0].name.startsWith('sin_titulo')) {
      this.tabs[0].name = name;
      this.tabs[0].code = code;
      this.tabs[0].fileHandle = fileHandle;
      this.tabs[0].filePath = filePath;
      this.tabs[0].isDirty = false;
      this.switchTab(this.tabs[0].id, true);
      return;
    }

    const newTab: EditorTab = {
      id: 'tab_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name,
      code,
      isDirty: false,
      fileHandle,
      filePath
    };
    this.tabs.push(newTab);
    this.switchTab(newTab.id, true);
  }

  public switchTab(id: string, force: boolean = false): void {
    if (this.activeTabId === id && !force) return;

    const current = this.tabs.find(t => t.id === this.activeTabId);
    if (current && (!force || current.id !== id)) {
      current.code = this.textarea.value;
      current.isDirty = this.isDirty;
    }

    const target = this.tabs.find(t => t.id === id);
    if (!target) return;

    this.activeTabId = target.id;
    this.textarea.value = target.code;
    this.isDirty = target.isDirty;
    if (this.filenameBadge) {
      this.filenameBadge.textContent = `📄 ${target.name}`;
      this.filenameBadge.title = `Archivo activo: ${target.name}`;
    }
    this.renderTabs();
    this.updateEditor();
    if (this.callbacks.onTabChange) {
      this.callbacks.onTabChange(target.name, target.code);
    }
  }

  public syncCurrentTab(): void {
    const current = this.tabs.find(t => t.id === this.activeTabId);
    if (current) {
      current.code = this.textarea.value;
      current.isDirty = this.isDirty;
    }
  }

  public hasUnsavedChanges(): boolean {
    this.syncCurrentTab();
    return this.tabs.some(t => t.isDirty);
  }

  public getUnsavedTabs(): EditorTab[] {
    this.syncCurrentTab();
    return this.tabs.filter(t => t.isDirty);
  }

  public async closeTab(id: string): Promise<boolean> {
    const tabIdx = this.tabs.findIndex(t => t.id === id);
    if (tabIdx === -1) return false;

    this.syncCurrentTab();
    const tab = this.tabs[tabIdx];
    if (tab.isDirty) {
      const action = await showUnsavedChangesDialog({
        title: 'Archivo con cambios no guardados',
        message: `El archivo "${tab.name}" tiene modificaciones pendientes. ¿Deseas guardarlas antes de cerrar la pestaña?`,
        files: [tab],
        saveButtonText: 'Guardar y Cerrar'
      });

      if (action === 'cancel') {
        return false;
      }

      if (action === 'save') {
        if (this.callbacks.onSaveTab) {
          const success = await this.callbacks.onSaveTab(tab);
          if (!success) return false;
        }
      }
      // If discard: proceed to remove tab without saving
    }

    this.tabs.splice(tabIdx, 1);

    if (this.tabs.length === 0) {
      const newTab: EditorTab = {
        id: 'tab_' + Date.now(),
        name: 'sin_titulo.asm',
        code: '.org 0100H\n\nINICIO:\n    HLT\n',
        isDirty: false
      };
      this.tabs.push(newTab);
      this.switchTab(newTab.id);
    } else {
      const nextTab = this.tabs[Math.max(0, tabIdx - 1)];
      this.switchTab(nextTab.id);
    }
    return true;
  }

  public newTab(name?: string, code?: string): void {
    const count = this.tabs.length + 1;
    const tabName = name || `sin_titulo_${count}.asm`;
    const tabCode = code || `.org 0100H\n\nINICIO:\n    HLT\n`;
    const newTab: EditorTab = {
      id: 'tab_' + Date.now(),
      name: tabName,
      code: tabCode,
      isDirty: false
    };
    this.tabs.push(newTab);
    this.switchTab(newTab.id);
  }

  public updateCursorPos(): void {
    if (!this.cursorPosBadge) return;
    const pos = this.textarea.selectionStart;
    const text = this.textarea.value.substring(0, pos);
    const lines = text.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    this.cursorPosBadge.textContent = `Lín ${line}, Col ${col}`;
  }

  public setStatus(msg: string, isError: boolean = false, isWarning: boolean = false, errorLine?: number): void {
    if (this.statusResetTimer) {
      clearTimeout(this.statusResetTimer);
      this.statusResetTimer = null;
    }

    let lineToJump = errorLine;
    if (isError && !lineToJump) {
      const match = msg.match(/l[íi]nea\s+(\d+)/i);
      if (match) lineToJump = parseInt(match[1], 10);
    }
    this.currentErrorLine = lineToJump ?? null;

    const icon = isError ? '❌ ' : isWarning ? '⚠️ ' : (msg.startsWith('✓') || msg.startsWith('✨') || msg.startsWith('📍') || msg.startsWith('✏️') || msg.startsWith('📄')) ? '' : '✓ ';
    const fullMsg = (isError || isWarning) ? `${icon}${msg}` : msg;

    this.errorBadge.textContent = fullMsg;
    const cls = isError ? 'status-error' : isWarning ? 'status-warning' : 'status-ok';
    this.errorBadge.className = `editor-status ${cls}`;

    if (isError && this.currentErrorLine) {
      this.errorBadge.title = `${msg} (Haz clic para ir a la línea ${this.currentErrorLine})`;
      this.errorBadge.style.cursor = 'pointer';
    } else {
      this.errorBadge.title = msg;
      this.errorBadge.style.cursor = 'default';
    }

    // Volver a 'Listo' tras 3 segundos para mensajes de éxito
    if (!isError && !isWarning && msg !== 'Listo' && !msg.startsWith('✏️')) {
      this.statusResetTimer = setTimeout(() => {
        if (!this.isDirty) {
          this.errorBadge.textContent = 'Listo';
          this.errorBadge.className = 'editor-status status-ok';
          this.errorBadge.title = 'Listo';
          this.errorBadge.style.cursor = 'default';
          this.currentErrorLine = null;
        }
      }, 3000);
    }
  }

  public setExecutionLine(lineNum: number): void {
    if (this.pcLine === lineNum) return;
    const oldLine = this.pcLine;
    this.pcLine = lineNum;

    // Fast-path: Update only the targeted lines in gutter and highlight overlay (Zero full-file regex execution)
    if (oldLine > 0) {
      const oldGutter = this.lineNumbers.querySelector(`[data-line="${oldLine}"]`);
      if (oldGutter) {
        oldGutter.classList.remove('active-pc-line');
        const hasBp = this.breakpoints.has(oldLine);
        oldGutter.textContent = hasBp ? '🔴' : `${oldLine}`;
      }
      const oldCodeLine = this.highlightOverlay.children[oldLine - 1];
      if (oldCodeLine) oldCodeLine.classList.remove('code-line-pc');
    }

    if (lineNum > 0) {
      const newGutter = this.lineNumbers.querySelector(`[data-line="${lineNum}"]`);
      if (newGutter) {
        newGutter.classList.add('active-pc-line');
        newGutter.textContent = '▶';
      }
      const newCodeLine = this.highlightOverlay.children[lineNum - 1];
      if (newCodeLine) newCodeLine.classList.add('code-line-pc');
    }
  }

  public toggleBreakpoint(line: number): boolean {
    const hasNow = !this.breakpoints.has(line);
    if (hasNow) {
      this.breakpoints.add(line);
    } else {
      this.breakpoints.delete(line);
    }
    const gutter = this.lineNumbers.querySelector(`[data-line="${line}"]`);
    if (gutter) {
      gutter.classList.toggle('has-breakpoint', hasNow);
      const isPc = (line === this.pcLine);
      gutter.textContent = hasNow ? '🔴' : (isPc ? '▶' : `${line}`);
    }
    if (this.callbacks.onToggleBreakpoint) {
      this.callbacks.onToggleBreakpoint(line, hasNow);
    }
    return hasNow;
  }

  public setBreakpoints(lines: Set<number>): void {
    this.breakpoints = new Set(lines);
    this.updateEditor();
  }

  public getCursorLine(): number {
    const pos = this.textarea.selectionStart;
    const lines = this.textarea.value.substring(0, pos).split('\n');
    return lines.length;
  }

  private updateEditor(): void {
    const text = this.textarea.value;
    const lines = text.split('\n');

    // Update Line Numbers with Breakpoints
    let gutterHtml = '';
    for (let i = 1; i <= lines.length; i++) {
      const isPc = (i === this.pcLine);
      const hasBp = this.breakpoints.has(i);
      const icon = hasBp ? '🔴' : (isPc ? '▶' : i);
      const cls = `line-number ${isPc ? 'active-pc-line' : ''} ${hasBp ? 'has-breakpoint' : ''}`;
      const title = hasBp ? 'Punto de interrupción activo (clic para quitar)' : 'Clic para alternar breakpoint';
      gutterHtml += `<div class="${cls}" data-line="${i}" title="${title}">${icon}</div>`;
    }
    this.lineNumbers.innerHTML = gutterHtml;

    // Syntax Highlighted HTML
    let highlighted = '';
    for (let i = 0; i < lines.length; i++) {
      const isPc = (i + 1 === this.pcLine);
      const highlightedLine = this.highlightLine(lines[i]);
      highlighted += `<div class="code-line ${isPc ? 'code-line-pc' : ''}">${highlightedLine || '&nbsp;'}</div>`;
    }
    this.highlightOverlay.innerHTML = highlighted;

    if (this.isWordWrap) {
      requestAnimationFrame(() => {
        this.syncGutterHeights();
        this.syncScroll();
      });
    } else {
      const gutterLines = this.lineNumbers.children;
      for (let i = 0; i < gutterLines.length; i++) {
        (gutterLines[i] as HTMLElement).style.height = '';
      }
      this.syncScroll();
    }

    // Linter / Validation check for unresolved labels
    const broken = DocsHelper.validateLabels(text);
    if (broken.length > 0) {
      this.setStatus(`${broken.length} etiqueta(s) pendiente(s): ${broken.map(b => b.label).slice(0, 2).join(', ')}`, false, true);
    } else if (!this.currentErrorLine) {
      if (this.isDirty) {
        this.setStatus('✏️ Modificado (se compilará al ejecutar)');
      } else {
        this.setStatus('Listo');
      }
    }
  }

  public toggleWordWrap(): void {
    this.setWordWrap(!this.isWordWrap);
  }

  public setWordWrap(enabled: boolean): void {
    this.isWordWrap = enabled;
    try {
      localStorage.setItem('sim8085_word_wrap', enabled ? 'true' : 'false');
    } catch {}

    if (this.editorWrapper) {
      if (enabled) {
        this.editorWrapper.classList.add('word-wrap');
      } else {
        this.editorWrapper.classList.remove('word-wrap');
      }
    }

    if (this.textarea) {
      this.textarea.wrap = enabled ? 'soft' : 'off';
    }

    const wrapBtn = this.container.querySelector('#btn-wrap');
    if (wrapBtn) {
      wrapBtn.classList.toggle('tb-btn-active', enabled);
    }

    this.updateEditor();
    this.setStatus(enabled ? '↩️ Ajuste de línea activado (Alt+Z)' : '➡️ Ajuste de línea desactivado');
    if (this.callbacks.onWordWrapChange) {
      this.callbacks.onWordWrapChange(enabled);
    }
  }

  public syncGutterHeights(): void {
    if (!this.isWordWrap) return;
    const codeLines = this.highlightOverlay.children;
    const gutterLines = this.lineNumbers.children;
    const len = Math.min(codeLines.length, gutterLines.length);
    for (let i = 0; i < len; i++) {
      const h = (codeLines[i] as HTMLElement).offsetHeight;
      if (h > 0) {
        (gutterLines[i] as HTMLElement).style.height = `${h}px`;
      }
    }
  }

  private highlightLine(line: string): string {
    const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const commentIdx = line.indexOf(';');
    if (commentIdx !== -1) {
      const codePart = line.substring(0, commentIdx);
      const commentPart = line.substring(commentIdx);
      return this.highlightTokens(codePart) + `<span class="syn-comment">${escape(commentPart)}</span>`;
    }

    return this.highlightTokens(line);
  }

  private highlightTokens(code: string): string {
    const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return escape(code).replace(/(\.org|\.data|\.define|\bdb\b|\bdw\b|\bds\b)|(\b[A-Za-z0-9_]+:)|(\b(?:MOV|MVI|LXI|LDA|STA|LHLD|SHLD|LDAX|STAX|XCHG|ADD|ADI|ADC|ACI|SUB|SUI|SBB|SBI|INR|DCR|INX|DCX|DAD|DAA|ANA|ANI|XRA|XRI|ORA|ORI|CMP|CPI|RLC|RRC|RAL|RAR|CMA|CMC|STC|JMP|JNZ|JZ|JNC|JC|JPO|JPE|JP|JM|CALL|CNZ|CZ|CNC|CC|CPO|CPE|CP|CM|RET|RNZ|RZ|RNC|RC|RPO|RPE|RP|RM|RST|PUSH|POP|XTHL|SPHL|PCHL|IN|OUT|EI|DI|HLT|NOP|RIM|SIM)\b)|(\b(?:A|B|C|D|E|H|L|M|SP|PSW|BC|DE|HL)\b)|(\b[0-9]+[bB]\b|\b[0-9a-fA-F]+[hH]\b|\b0x[0-9a-fA-F]+\b|\b[0-9]+[dD]?\b)|(".*?"|'.*?')/gi,
      (match, directive, label, mnemonic, register, number, string) => {
        if (directive) return `<span class="syn-directive" data-token="${match}" data-tokentype="directive">${match}</span>`;
        if (label) return `<span class="syn-label">${match}</span>`;
        if (mnemonic) return `<span class="syn-mnemonic" data-token="${match}" data-tokentype="mnemonic">${match}</span>`;
        if (register) return `<span class="syn-register" data-token="${match}" data-tokentype="register">${match}</span>`;
        if (number) return `<span class="syn-number" data-token="${match}" data-tokentype="number">${match}</span>`;
        if (string) return `<span class="syn-string">${match}</span>`;
        return match;
      }
    );
  }
}
