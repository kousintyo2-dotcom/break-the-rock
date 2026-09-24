import { createDefaultSave, normalizeSave, type SaveData } from './saveData.ts';

const KEY = 'break-through-save';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): KeyValueStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** localStorage persistence with validation and a safe fallback when storage is unavailable. */
export class SaveStore {
  private readonly storage: KeyValueStorage | null;
  private readonly reducedMotion: boolean;

  constructor(storage: KeyValueStorage | null = browserStorage(), reducedMotion = false) {
    this.storage = storage;
    this.reducedMotion = reducedMotion;
  }

  load(): SaveData {
    try {
      const text = this.storage?.getItem(KEY);
      if (!text) return createDefaultSave(this.reducedMotion);
      return normalizeSave(JSON.parse(text), this.reducedMotion);
    } catch {
      return createDefaultSave(this.reducedMotion);
    }
  }

  save(data: SaveData): void {
    try {
      this.storage?.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage full or blocked: keep playing in memory */
    }
  }

  reset(): SaveData {
    try {
      this.storage?.removeItem(KEY);
    } catch {
      /* ignore */
    }
    return createDefaultSave(this.reducedMotion);
  }
}
