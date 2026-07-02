import { STORAGE_PREFIX } from '@/constants/demo';
import { APP_MODE } from '@/config/appMode';

/**
 * Las claves incluyen el modo (demo | prod) para que los datos NO se crucen:
 * demo tiene su escenario cargado; prod arranca vacío (los datos reales vienen del backend).
 * Así, un negocio recién registrado en prod no ve datos de demostración.
 */
export function storageKey(name: string): string {
  return `${STORAGE_PREFIX}:${APP_MODE}:${name}`;
}

export function listAppKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${STORAGE_PREFIX}:`)) keys.push(key);
  }
  return keys;
}

export function clearAllAppStorage(): void {
  listAppKeys().forEach((key) => localStorage.removeItem(key));
}

/** Tamaño aproximado en KB de los datos locales de la app. */
export function appStorageSizeKb(): number {
  const bytes = listAppKeys().reduce((acc, key) => acc + (localStorage.getItem(key)?.length ?? 0) * 2, 0);
  return Math.round(bytes / 1024);
}

export function exportAllData(): string {
  const data: Record<string, unknown> = {};
  for (const key of listAppKeys()) {
    const raw = localStorage.getItem(key);
    if (raw == null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      data[key] = raw;
    }
  }
  return JSON.stringify({ app: STORAGE_PREFIX, exportedAt: new Date().toISOString(), data }, null, 2);
}

export function importAllData(json: string): { ok: boolean; error?: string } {
  try {
    const parsed = JSON.parse(json) as { app?: string; data?: Record<string, unknown> };
    if (parsed.app !== STORAGE_PREFIX || !parsed.data) {
      return { ok: false, error: 'El archivo no es un backup válido de Mostrador.' };
    }
    clearAllAppStorage();
    for (const [key, value] of Object.entries(parsed.data)) {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se pudo leer el archivo de backup.' };
  }
}
