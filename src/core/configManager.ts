export interface OpenTabConfig {
  name: string;
  filePath?: string;
  code?: string;
}

export interface AppConfig {
  theme: 'dark' | 'light';
  wordWrap: boolean;
  zoomLevel: number;
  openTabs: OpenTabConfig[];
  activeTabName: string;
  recentFiles: string[];
  traceTableStartPC?: string;
  traceTableMaxSteps?: number;
}

export const DEFAULT_CONFIG: AppConfig = {
  theme: 'dark',
  wordWrap: true,
  zoomLevel: 1.0,
  openTabs: [],
  activeTabName: 'sin_titulo.asm',
  recentFiles: [],
  traceTableStartPC: '0000H',
  traceTableMaxSteps: 1000
};

const CONFIG_FILE = 'sim8085_config.json';
const STORAGE_KEY = 'sim8085_app_config';

export class ConfigManager {
  private static cachedConfig: AppConfig = { ...DEFAULT_CONFIG };

  private static getNeutralino(): any {
    return typeof window !== 'undefined' ? (window as any).Neutralino : undefined;
  }

  private static getStorage(): Storage | null {
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof window !== 'undefined' && (window as any).localStorage) return (window as any).localStorage;
    return null;
  }

  public static async load(): Promise<AppConfig> {
    const winNeu = this.getNeutralino();
    let rawJson: string | null = null;

    // 1. Intentar leer desde archivo de configuración nativo en disco (Neutralino)
    if (winNeu && winNeu.filesystem && typeof winNeu.filesystem.readFile === 'function') {
      try {
        rawJson = await winNeu.filesystem.readFile(CONFIG_FILE);
      } catch {
        // El archivo aún no existe en el primer arranque
      }
    }

    // 2. Si no se obtuvo de disco, intentar Neutralino Storage
    if (!rawJson && winNeu && winNeu.storage && typeof winNeu.storage.getData === 'function') {
      try {
        rawJson = await winNeu.storage.getData(STORAGE_KEY);
      } catch {}
    }

    // 3. Fallback a localStorage de navegador
    if (!rawJson) {
      const storage = this.getStorage();
      if (storage) {
        try {
          rawJson = storage.getItem(STORAGE_KEY);
        } catch {}
      }
    }

    if (rawJson) {
      try {
        const parsed = JSON.parse(rawJson);
        this.cachedConfig = {
          ...DEFAULT_CONFIG,
          ...parsed,
          openTabs: Array.isArray(parsed.openTabs) ? parsed.openTabs : [],
          recentFiles: Array.isArray(parsed.recentFiles) ? parsed.recentFiles : []
        };
        return this.cachedConfig;
      } catch (e) {
        console.warn('Error parseando configuración persistente:', e);
      }
    }

    this.cachedConfig = { ...DEFAULT_CONFIG };
    return this.cachedConfig;
  }

  public static async save(partial: Partial<AppConfig>): Promise<void> {
    this.cachedConfig = {
      ...this.cachedConfig,
      ...partial
    };

    const jsonString = JSON.stringify(this.cachedConfig, null, 2);
    const winNeu = this.getNeutralino();

    // 1. Persistir en archivo nativo de disco (Neutralino)
    if (winNeu && winNeu.filesystem && typeof winNeu.filesystem.writeFile === 'function') {
      try {
        await winNeu.filesystem.writeFile(CONFIG_FILE, jsonString);
      } catch (err) {
        console.warn('Error guardando en archivo config nativo:', err);
      }
    }

    // 2. Persistir en Neutralino Storage
    if (winNeu && winNeu.storage && typeof winNeu.storage.setData === 'function') {
      try {
        await winNeu.storage.setData(STORAGE_KEY, jsonString);
      } catch {}
    }

    // 3. Persistir en localStorage
    const storage = this.getStorage();
    if (storage) {
      try {
        storage.setItem(STORAGE_KEY, jsonString);
      } catch {}
    }
  }

  public static get(): AppConfig {
    return this.cachedConfig;
  }

  public static async addRecentFile(filePath: string): Promise<string[]> {
    if (!filePath || typeof filePath !== 'string') return this.cachedConfig.recentFiles;
    
    // Normalizar separadores a barra diagonal para consistencia
    const norm = filePath.replace(/\\/g, '/');
    const existing = this.cachedConfig.recentFiles.filter(p => p.replace(/\\/g, '/') !== norm);
    const updated = [norm, ...existing].slice(0, 8); // Mantener hasta 8 archivos recientes

    await this.save({ recentFiles: updated });
    return updated;
  }

  public static async clearRecentFiles(): Promise<void> {
    await this.save({ recentFiles: [] });
  }

  public static async checkFileExists(filePath: string): Promise<boolean> {
    if (!filePath) return false;
    const winNeu = this.getNeutralino();
    if (winNeu && winNeu.filesystem && typeof winNeu.filesystem.getStats === 'function') {
      try {
        await winNeu.filesystem.getStats(filePath);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }

  public static async readNativeFile(filePath: string): Promise<string | null> {
    const winNeu = this.getNeutralino();
    if (winNeu && winNeu.filesystem && typeof winNeu.filesystem.readFile === 'function') {
      try {
        return await winNeu.filesystem.readFile(filePath);
      } catch {
        return null;
      }
    }
    return null;
  }
}
