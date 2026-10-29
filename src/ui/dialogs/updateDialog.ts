/**
 * updateDialog.ts
 * Diálogo modal para notificar, descargar y aplicar actualizaciones automáticas
 */

import { APP_VERSION, UpdateInfo, downloadUpdateBinary, generateUpdaterBatch } from '../../core/updateManager.js';

export function showUpdateDialog(info: UpdateInfo | null, isManualCheck = false): void {
  const existing = document.getElementById('update-modal-backdrop');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'update-modal-backdrop';
  backdrop.className = 'modal-backdrop';

  // Caso: Comprobación manual y ya está en la versión más reciente
  if (!info) {
    if (!isManualCheck) return;

    backdrop.innerHTML = `
      <div class="modal-window" style="width: 440px; max-width: 95vw; animation: fadeIn 0.15s ease;">
        <div class="modal-header" style="border-bottom: 1px solid var(--border-color);">
          <span class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <span>🔄</span> Actualizaciones de Software
          </span>
          <button class="modal-close-btn" id="btn-update-close" title="Cerrar ventana">✕</button>
        </div>
        <div class="modal-body" style="padding: 24px 20px; text-align: center;">
          <div style="font-size: 38px; margin-bottom: 12px;">✅</div>
          <h3 style="margin: 0 0 8px 0; color: var(--text-main); font-size: 16px;">¡Estás al día!</h3>
          <p style="margin: 0; color: var(--text-muted); font-size: 13px; line-height: 1.5;">
            Actualmente tienes instalada la versión más reciente: <strong style="color: #58a6ff;">v${APP_VERSION}</strong>.<br/>
            No hay actualizaciones pendientes en GitHub.
          </p>
        </div>
        <div class="modal-footer" style="padding: 12px 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end;">
          <button class="tb-btn tb-btn-active" id="btn-update-ok" style="padding: 6px 18px; font-weight: 600;">Entendido</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    const closeDialog = () => backdrop.remove();
    backdrop.querySelector('#btn-update-close')?.addEventListener('click', closeDialog);
    backdrop.querySelector('#btn-update-ok')?.addEventListener('click', closeDialog);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeDialog();
    });
    return;
  }

  // Caso: Existe una nueva versión disponible
  const sizeMb = (info.assetSize / (1024 * 1024)).toFixed(2);
  const formattedBody = escapeHtml(info.body).replace(/\r?\n/g, '<br/>');

  backdrop.innerHTML = `
    <div class="modal-window" style="width: 520px; max-width: 95vw; animation: fadeIn 0.15s ease;">
      <div class="modal-header" style="border-bottom: 1px solid var(--border-color);">
        <span class="modal-title" style="display: flex; align-items: center; gap: 8px; color: #58a6ff;">
          <span>🚀</span> ¡Nueva Versión Disponible!
        </span>
        <button class="modal-close-btn" id="btn-update-close" title="Cerrar ventana">✕</button>
      </div>

      <div class="modal-body" style="padding: 18px 22px;">
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px; background: rgba(88, 166, 255, 0.08); border: 1px solid rgba(88, 166, 255, 0.25); border-radius: 8px; padding: 12px 16px;">
          <div style="font-size: 32px;">📦</div>
          <div>
            <div style="font-size: 15px; font-weight: 700; color: var(--text-main);">
              ${escapeHtml(info.releaseName || info.tagName)}
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 3px;">
              Tu versión actual: <span style="color: #f85149; font-weight: 600;">v${APP_VERSION}</span>
              &nbsp;➔&nbsp;
              Nueva versión: <span style="color: #7ee787; font-weight: 700;">${escapeHtml(info.tagName)}</span>
              &nbsp;(${sizeMb} MB)
            </div>
          </div>
        </div>

        <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
          Novedades y Mejoras:
        </div>
        <div class="update-notes-container" style="background: rgba(0, 0, 0, 0.25); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px 14px; max-height: 150px; overflow-y: auto; font-size: 12px; line-height: 1.6; color: var(--text-main); margin-bottom: 18px;">
          ${formattedBody}
        </div>

        <!-- Barra de Progreso (Oculta hasta presionar Actualizar) -->
        <div id="update-progress-section" style="display: none; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">
            <span id="update-status-label">Descargando actualización...</span>
            <span id="update-percent-label" style="font-weight: 700; color: #58a6ff;">0%</span>
          </div>
          <div style="width: 100%; height: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 5px; overflow: hidden;">
            <div id="update-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #238636, #2ea043); transition: width 0.15s ease;"></div>
          </div>
        </div>
      </div>

      <div class="modal-footer" style="padding: 12px 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 10px;">
        <button class="tb-btn" id="btn-update-later" style="padding: 6px 14px;">Recordármelo más tarde</button>
        <button class="tb-btn tb-btn-active" id="btn-update-install" style="padding: 6px 18px; font-weight: 700; background: #238636; border-color: #2ea043; color: #ffffff;">
          🚀 Actualizar y Reiniciar Ahora
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const closeDialog = () => backdrop.remove();
  const btnClose = backdrop.querySelector('#btn-update-close');
  const btnLater = backdrop.querySelector('#btn-update-later') as HTMLButtonElement;
  const btnInstall = backdrop.querySelector('#btn-update-install') as HTMLButtonElement;
  const progressSection = backdrop.querySelector('#update-progress-section') as HTMLElement;
  const progressBar = backdrop.querySelector('#update-progress-bar') as HTMLElement;
  const statusLabel = backdrop.querySelector('#update-status-label') as HTMLElement;
  const percentLabel = backdrop.querySelector('#update-percent-label') as HTMLElement;

  btnClose?.addEventListener('click', closeDialog);
  btnLater?.addEventListener('click', closeDialog);

  btnInstall?.addEventListener('click', async () => {
    btnInstall.disabled = true;
    btnLater.disabled = true;
    if (btnClose) (btnClose as HTMLElement).style.display = 'none';

    progressSection.style.display = 'block';

    try {
      const winNeu = (window as any).Neutralino;
      if (winNeu && winNeu.os && winNeu.filesystem && winNeu.app) {
        // Entorno Desktop Neutralino WebView2
        statusLabel.textContent = '📦 Conectando con servidor de actualización...';
        progressBar.style.width = '30%';
        percentLabel.textContent = '30%';

        const tempEnv = await winNeu.os.getEnv('TEMP').catch(() => 'C:\\Windows\\Temp');
        const timestamp = Date.now();
        const batPath = `${tempEnv}\\sim8085_updater_${timestamp}.bat`;
        const appDir = (window as any).NL_PATH || '.';

        // Obtener PID seguro como número
        let pid = 0;
        try {
          const pidRes = await winNeu.app.getProcessId();
          pid = typeof pidRes === 'object' && pidRes ? (pidRes.pid || 0) : (Number(pidRes) || 0);
        } catch {
          pid = Number((window as any).NL_PID) || 0;
        }

        // 1. Generar y escribir script por lotes autónomo
        statusLabel.textContent = '⚡ Descargando y preparando reemplazo...';
        progressBar.style.width = '70%';
        percentLabel.textContent = '70%';

        const batCode = generateUpdaterBatch(pid, appDir, info.downloadUrl);
        await winNeu.filesystem.writeFile(batPath, batCode);

        statusLabel.textContent = '🚀 Relanzando simulador actualizado...';
        progressBar.style.width = '100%';
        percentLabel.textContent = '100%';

        // 2. Ejecutar script desacoplado en segundo plano
        await winNeu.os.execCommand(`cmd /c start "" /min "${batPath}"`, { background: true });

        // 3. Salir limpiamente de la aplicación
        setTimeout(async () => {
          await winNeu.app.exit();
        }, 500);
      } else {
        // Modo navegador web puro: abrir enlace directo de descarga
        window.open(info.downloadUrl, '_blank');
        statusLabel.textContent = '✅ Descarga iniciada en tu navegador.';
        progressBar.style.width = '100%';
        percentLabel.textContent = '100%';
        btnLater.disabled = false;
        btnLater.textContent = 'Cerrar';
      }
    } catch (err: any) {
      console.error('[UpdateDialog] Error al aplicar actualización:', err);
      statusLabel.style.color = '#f85149';
      statusLabel.textContent = `❌ Falló la actualización: ${err.message || err}`;
      btnLater.disabled = false;
      btnLater.textContent = 'Cerrar';
    }
  });
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
