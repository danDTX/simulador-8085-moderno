export interface UnsavedDialogOptions {
  title?: string;
  message?: string;
  files: { name: string }[];
  saveButtonText?: string;
}

export function showUnsavedChangesDialog(options: UnsavedDialogOptions): Promise<'save' | 'discard' | 'cancel'> {
  return new Promise((resolve) => {
    const existing = document.getElementById('unsaved-modal-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'unsaved-modal-backdrop';
    backdrop.className = 'modal-backdrop';

    const title = options.title || '⚠️ Archivos con cambios no guardados';
    const message = options.message || 'Los siguientes archivos tienen modificaciones pendientes que se perderán si no se guardan:';
    const saveText = options.saveButtonText || 'Guardar y Continuar';

    let filesHtml = '';
    for (const file of options.files) {
      filesHtml += `
        <div class="unsaved-file-item">
          <span class="unsaved-dot">•</span>
          <span class="unsaved-file-icon">📄</span>
          <span class="unsaved-file-name">${escapeHtml(file.name)}</span>
          <span class="unsaved-badge">Modificado</span>
        </div>
      `;
    }

    backdrop.innerHTML = `
      <div class="modal-window" style="width: 480px;">
        <div class="modal-header">
          <span class="modal-title">${escapeHtml(title)}</span>
          <button class="modal-close-btn" id="btn-unsaved-close" title="Cerrar ventana">✕</button>
        </div>
        <div class="modal-body">
          <div style="font-size: 13px; line-height: 1.5; color: var(--text-main);">
            ${escapeHtml(message)}
          </div>
          <div class="unsaved-files-list">
            ${filesHtml}
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">
            ¿Qué acción deseas realizar con estos cambios?
          </div>
        </div>
        <div class="modal-footer" style="justify-content: space-between;">
          <button class="modal-btn modal-btn-danger" id="btn-unsaved-discard" title="Descartar todas las modificaciones y continuar">🗑️ Descartar Cambios</button>
          <div style="display: flex; gap: 8px;">
            <button class="modal-btn modal-btn-cancel" id="btn-unsaved-cancel" title="Permanecer en la aplicación sin cerrar">Cancelar</button>
            <button class="modal-btn modal-btn-ok" id="btn-unsaved-save" style="background: #238636; border-color: #2ea043; color: #fff;" title="Guardar cambios y continuar">💾 ${escapeHtml(saveText)}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const close = (action: 'save' | 'discard' | 'cancel') => {
      document.removeEventListener('keydown', onKeyDown);
      backdrop.remove();
      resolve(action);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close('cancel');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        close('save');
      }
    };

    document.addEventListener('keydown', onKeyDown);

    backdrop.querySelector('#btn-unsaved-close')?.addEventListener('click', () => close('cancel'));
    backdrop.querySelector('#btn-unsaved-cancel')?.addEventListener('click', () => close('cancel'));
    backdrop.querySelector('#btn-unsaved-discard')?.addEventListener('click', () => close('discard'));
    backdrop.querySelector('#btn-unsaved-save')?.addEventListener('click', () => close('save'));

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        close('cancel');
      }
    });

    const saveBtn = backdrop.querySelector('#btn-unsaved-save') as HTMLButtonElement;
    saveBtn?.focus();
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
