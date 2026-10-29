/**
 * updateManager.ts
 * Sistema de verificación y actualización automática para el Simulador 8085
 * Consulta la API pública de GitHub: danDTX/simulador-8085-moderno
 */

export const APP_VERSION = '1.9.1';
export const GITHUB_REPO = 'danDTX/simulador-8085-moderno';
export const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export interface UpdateInfo {
  tagName: string;
  version: string;
  releaseName: string;
  body: string;
  downloadUrl: string;
  assetName: string;
  assetSize: number;
}

/**
 * Compara dos versiones semánticas (ej: '1.8.1' > '1.8.0').
 * Devuelve true si remote es estrictamente más reciente que local.
 */
export function isNewerVersion(remoteTag: string, localVersion: string): boolean {
  const cleanRemote = remoteTag.replace(/^v/i, '').trim();
  const cleanLocal = localVersion.replace(/^v/i, '').trim();

  const rParts = cleanRemote.split('.').map(p => parseInt(p, 10) || 0);
  const lParts = cleanLocal.split('.').map(p => parseInt(p, 10) || 0);

  const maxLen = Math.max(rParts.length, lParts.length);
  for (let i = 0; i < maxLen; i++) {
    const r = rParts[i] || 0;
    const l = lParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }

  return false;
}

/**
 * Consulta la última release publicada en GitHub.
 * Si hay una versión más reciente, devuelve su información; de lo contrario null.
 */
export async function checkGitHubRelease(currentVersion = APP_VERSION): Promise<UpdateInfo | null> {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Simulador8085-App'
      }
    });

    if (!response.ok) {
      console.warn(`[UpdateManager] GitHub API respondió con código: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const tagName = data.tag_name || '';
    if (!tagName) return null;

    if (!isNewerVersion(tagName, currentVersion)) {
      return null;
    }

    // Buscar el activo .zip adjunto a la release
    const assets = Array.isArray(data.assets) ? data.assets : [];
    const zipAsset = assets.find((a: any) => typeof a.name === 'string' && a.name.toLowerCase().endsWith('.zip'));

    if (!zipAsset || !zipAsset.browser_download_url) {
      console.warn('[UpdateManager] Release encontrada pero no contiene archivo .zip adjunto.');
      return null;
    }

    return {
      tagName,
      version: tagName.replace(/^v/i, ''),
      releaseName: data.name || tagName,
      body: data.body || 'Sin descripción de cambios.',
      downloadUrl: zipAsset.browser_download_url,
      assetName: zipAsset.name,
      assetSize: zipAsset.size || 0
    };
  } catch (err) {
    console.warn('[UpdateManager] Error consultando actualizaciones en GitHub:', err);
    return null;
  }
}

/**
 * Genera el script por lotes .bat que reemplaza los binarios en Windows
 * liberando el bloqueo de archivo del proceso actual y relanzándolo.
 */
export function generateUpdaterBatch(oldPid: number, appDir: string, downloadUrl: string): string {
  const cleanAppDir = appDir.replace(/\//g, '\\').replace(/\\+$/, '');

  return `@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Actualizador Simulador 8085

echo ===================================================
echo   Actualizando Simulador 8085 a la nueva version...
echo ===================================================

:: 1. Esperar a que el proceso anterior finalice
echo [1/4] Finalizando proceso anterior (PID: ${oldPid})...
timeout /t 1 /nobreak >nul
if "${oldPid}" neq "0" (
    taskkill /PID ${oldPid} /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: 2. Descargar y descomprimir en directorio temporal
echo [2/4] Descargando y descomprimiendo paquete de actualizacion...
set "ZIP_FILE=%TEMP%\\sim8085_update.zip"
set "EXTRACT_DIR=%TEMP%\\sim8085_extract_%RANDOM%"
if exist "!EXTRACT_DIR!" rd /s /q "!EXTRACT_DIR!"
mkdir "!EXTRACT_DIR!"

powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '${downloadUrl}' -OutFile '!ZIP_FILE!' -UseBasicParsing; Expand-Archive -Path '!ZIP_FILE!' -DestinationPath '!EXTRACT_DIR!' -Force"

:: 3. Reemplazar archivos en el directorio de la aplicacion preservando sim8085_config.json
echo [3/4] Instalando archivos nuevos en: ${cleanAppDir}
for %%F in ("!EXTRACT_DIR!\\*") do (
    if /i not "%%~nxF"=="sim8085_config.json" (
        copy /y "%%F" "${cleanAppDir}\\" >nul
    ) else (
        if not exist "${cleanAppDir}\\sim8085_config.json" (
            copy /y "%%F" "${cleanAppDir}\\" >nul
        )
    )
)

for /d %%D in ("!EXTRACT_DIR!\\*") do (
    xcopy /e /y /i "%%D" "${cleanAppDir}\\%%~nxD" >nul
)

:: 4. Limpieza de temporales
echo [4/4] Limpiando temporales y relanzando...
rd /s /q "!EXTRACT_DIR!" >nul 2>&1
del /f /q "!ZIP_FILE!" >nul 2>&1

:: 5. Relanzar aplicacion actualizada
cd /d "${cleanAppDir}"
if exist "${cleanAppDir}\\Simulador_8085.exe" (
    start "" "${cleanAppDir}\\Simulador_8085.exe"
) else if exist "${cleanAppDir}\\simulador-8085-win_x64.exe" (
    start "" "${cleanAppDir}\\simulador-8085-win_x64.exe"
) else if exist "${cleanAppDir}\\iniciar_simulador.bat" (
    start "" "${cleanAppDir}\\iniciar_simulador.bat"
)

:: Auto-eliminacion del script
(goto) 2>nul & del "%~f0"
`;
}

/**
 * Descarga el archivo de actualización con seguimiento en tiempo real del progreso.
 */
export async function downloadUpdateBinary(
  url: string,
  expectedSize: number,
  onProgress: (percent: number, statusText: string) => void
): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error en servidor de GitHub: HTTP ${response.status}`);
  }

  const contentLength = Number(response.headers.get('content-length')) || expectedSize || 0;
  const reader = response.body?.getReader();

  if (!reader) {
    onProgress(50, 'Descargando paquete...');
    const buf = await response.arrayBuffer();
    onProgress(100, 'Descarga completada');
    return buf;
  }

  let receivedBytes = 0;
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedBytes += value.length;

    if (contentLength > 0) {
      const percent = Math.min(100, Math.round((receivedBytes / contentLength) * 100));
      const mbRecv = (receivedBytes / (1024 * 1024)).toFixed(2);
      const mbTotal = (contentLength / (1024 * 1024)).toFixed(2);
      onProgress(percent, `Descargando: ${percent}% (${mbRecv} MB / ${mbTotal} MB)...`);
    } else {
      const mbRecv = (receivedBytes / (1024 * 1024)).toFixed(2);
      onProgress(50, `Descargando: ${mbRecv} MB...`);
    }
  }

  const fullBuffer = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    fullBuffer.set(chunk, offset);
    offset += chunk.length;
  }

  onProgress(100, 'Descarga completada. Preparando instalación...');
  return fullBuffer.buffer;
}
