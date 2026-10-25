export function showAboutDialog(): void {
  const existing = document.getElementById('about-modal-backdrop');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'about-modal-backdrop';
  backdrop.className = 'modal-backdrop';

  backdrop.innerHTML = `
    <div class="modal-window" style="width: 520px; max-width: 95vw; animation: fadeIn 0.15s ease;">
      <div class="modal-header" style="border-bottom: 1px solid var(--border-color);">
        <span class="modal-title" style="display: flex; align-items: center; gap: 8px;">
          <span>🏛️</span> Acerca de 8085sim Modern
        </span>
        <button class="modal-close-btn" id="btn-about-close" title="Cerrar ventana">✕</button>
      </div>

      <div class="modal-body" style="padding: 18px 22px;">
        <!-- Banner del Logo Oficial UMSS -->
        <div style="background: #ffffff; border-radius: 8px; padding: 10px 16px; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.25); margin-bottom: 18px;">
          <img src="./logo_umss.png" alt="Universidad Mayor de San Simón" style="width: 100%; height: auto; max-height: 135px; object-fit: contain; display: block;" />
        </div>

        <!-- Título y Versión del Software -->
        <div style="text-align: center; margin-bottom: 16px;">
          <h2 style="font-size: 16px; margin: 0 0 4px 0; color: var(--accent); font-weight: 700;">
            Simulador Moderno Intel 8085 (Desktop MDI)
          </h2>
          <div style="font-size: 12px; color: var(--text-muted);">
            Versión 1.3.0
          </div>
        </div>

        <!-- Ficha de Datos Académicos Institucionales -->
        <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-color); border-radius: 6px; padding: 12px 16px; font-size: 13px; line-height: 1.8;">
          <div style="display: grid; grid-template-columns: 120px 1fr; gap: 4px 10px; align-items: baseline;">
            <span style="color: var(--text-muted); font-size: 12px;">🏛️ Universidad:</span>
            <span style="font-weight: 600; color: var(--text-main);">Univ. Mayor de San Simón (UMSS)</span>

            <span style="color: var(--text-muted); font-size: 12px;">🔬 Facultad:</span>
            <span style="color: var(--text-main);">Facultad de Ciencias y Tecnología (FCyT)</span>

            <span style="color: var(--text-muted); font-size: 12px;">⚡ Carrera:</span>
            <span style="color: var(--text-main); font-weight: 600; color: #58a6ff;">Ingeniería Electrónica</span>

            <span style="color: var(--text-muted); font-size: 12px;">📚 Materia:</span>
            <span style="color: var(--text-main); font-weight: 600;">Microprocesadores I</span>

            <span style="color: var(--text-muted); font-size: 12px;">👨‍🏫 Docente:</span>
            <span style="color: var(--text-main); font-weight: 600;">Ing. Rubén Espinoza Orosco</span>

            <span style="color: var(--text-muted); font-size: 12px;">👨‍💻 Desarrollador:</span>
            <span style="color: var(--text-main); font-weight: 600; color: #7ee787;">Luis Daniel Silicuana Flores</span>
          </div>
        </div>

        <!-- Nota conmemorativa -->
        <div style="margin-top: 14px; font-size: 11px; color: var(--text-muted); text-align: center; line-height: 1.4;">
          Desarrollado para la materia de Microprocesadores I como herramienta moderna y de alto rendimiento para el análisis, programación y depuración de microprocesadores.
        </div>
      </div>

      <div class="modal-footer" style="justify-content: flex-end; border-top: 1px solid var(--border-color); padding: 10px 18px;">
        <button class="modal-btn modal-btn-ok" id="btn-about-ok" style="min-width: 90px;">Entendido</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const close = () => {
    document.removeEventListener('keydown', onKeyDown);
    backdrop.remove();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault();
      close();
    }
  };

  document.addEventListener('keydown', onKeyDown);
  backdrop.querySelector('#btn-about-close')?.addEventListener('click', close);
  backdrop.querySelector('#btn-about-ok')?.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  const okBtn = backdrop.querySelector('#btn-about-ok') as HTMLButtonElement;
  okBtn?.focus();
}
