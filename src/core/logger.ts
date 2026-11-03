/**
 * logger.ts
 * Sistema de Registro y Telemetría Local (Flight Recorder) para el Simulador 8085.
 * Mantiene un búfer circular en memoria RAM de los últimos 1000 eventos clave
 * sin sobrecargar el disco ni comprometer el rendimiento de la CPU.
 */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  details?: string;
}

export class Logger {
  private static readonly MAX_ENTRIES = 1000;
  private static buffer: LogEntry[] = [];
  private static isInitialized = false;

  /**
   * Inicializa el logger y vincula los capturadores globales de errores no controlados.
   */
  public static init(appVersion: string): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.info('SYSTEM', `Simulador Moderno Intel 8085 v${appVersion} iniciado.`);
    this.info('SYSTEM', `Entorno: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Test'}`);

    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event: ErrorEvent) => {
        this.error('RUNTIME_ERROR', event.message || 'Error no capturado en interfaz', {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        });
      });

      window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        const reason = event.reason;
        const msg = reason instanceof Error ? reason.message : String(reason);
        const stack = reason instanceof Error ? reason.stack : undefined;
        this.error('PROMISE_REJECTION', `Promesa rechazada no controlada: ${msg}`, { stack });
      });
    }
  }

  public static info(tag: string, message: string, details?: any): void {
    this.addEntry('INFO', tag, message, details);
  }

  public static warn(tag: string, message: string, details?: any): void {
    this.addEntry('WARN', tag, message, details);
  }

  public static error(tag: string, message: string, details?: any): void {
    this.addEntry('ERROR', tag, message, details);
  }

  public static debug(tag: string, message: string, details?: any): void {
    this.addEntry('DEBUG', tag, message, details);
  }

  private static addEntry(level: LogLevel, tag: string, message: string, details?: any): void {
    const now = new Date();
    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;

    let formattedDetails: string | undefined;
    if (details !== undefined) {
      try {
        formattedDetails = typeof details === 'string' ? details : JSON.stringify(details);
      } catch {
        formattedDetails = String(details);
      }
    }

    this.buffer.push({
      timestamp,
      level,
      tag: tag.toUpperCase(),
      message,
      details: formattedDetails
    });

    if (this.buffer.length > this.MAX_ENTRIES) {
      this.buffer.shift();
    }
  }

  /**
   * Devuelve todos los registros formateados como texto plano.
   */
  public static getFormattedText(): string {
    return this.buffer.map(entry => {
      let line = `[${entry.timestamp}] [${entry.level}] [${entry.tag}] ${entry.message}`;
      if (entry.details) {
        line += ` | ${entry.details}`;
      }
      return line;
    }).join('\n');
  }

  /**
   * Devuelve la cantidad actual de eventos en el búfer.
   */
  public static getCount(): number {
    return this.buffer.length;
  }

  /**
   * Devuelve una copia superficial de las entradas actuales.
   */
  public static getEntries(): LogEntry[] {
    return [...this.buffer];
  }

  /**
   * Limpia el búfer en memoria.
   */
  public static clear(): void {
    this.buffer = [];
  }

  /**
   * Copia el registro completo formateado al portapapeles del sistema.
   */
  public static async copyToClipboard(): Promise<boolean> {
    const text = this.getFormattedText();
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('Fallo navigator.clipboard.writeText:', err);
      }
    }

    // Fallback estándar con textarea oculto
    if (typeof document !== 'undefined') {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const success = document.execCommand('copy');
        document.body.removeChild(ta);
        return success;
      } catch (err) {
        console.error('Error copiando log al portapapeles:', err);
      }
    }
    return false;
  }

  /**
   * Guarda el archivo log en el disco mediante Neutralino o descarga directa en navegador.
   */
  public static async saveToFile(filename = 'sim8085.log'): Promise<boolean> {
    const text = this.getFormattedText();
    const winNeu = typeof window !== 'undefined' ? (window as any).Neutralino : undefined;

    // 1. Intentar guardar en la carpeta de la aplicación vía Neutralino filesystem
    if (winNeu && winNeu.filesystem && typeof winNeu.filesystem.writeFile === 'function') {
      try {
        await winNeu.filesystem.writeFile(filename, text);
        this.info('SYSTEM', `Log guardado exitosamente en ${filename} vía Neutralino.`);
        return true;
      } catch (err) {
        this.warn('SYSTEM', `No se pudo escribir en disco vía Neutralino, usando descarga web: ${err}`);
      }
    }

    // 2. Fallback estándar vía descarga de Blob en navegador
    if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      try {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        return true;
      } catch (err) {
        console.error('Error descargando archivo de log:', err);
      }
    }

    return false;
  }
}
