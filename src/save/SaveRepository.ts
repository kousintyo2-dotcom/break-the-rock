import { ROCKS } from '../data/content.ts';
import { createDefaultSave, type SaveData, SAVE_VERSION } from './schema.ts';

const KEY = 'break-the-rock.save';
export class SaveRepository {
  load(): SaveData {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? this.migrate(JSON.parse(raw) as Partial<SaveData>) : createDefaultSave();
    } catch { return createDefaultSave(); }
  }
  save(data: SaveData): void { localStorage.setItem(KEY, JSON.stringify(data)); }
  clear(): void { localStorage.removeItem(KEY); }

  private migrate(raw: Partial<SaveData>): SaveData {
    const base = createDefaultSave();
    const isLegacy = (raw.version ?? 0) < 3;
    const rockIndex = Math.max(0, raw.rockIndex ?? 0) % ROCKS.length;
    const maxHp = ROCKS[rockIndex]?.maxHp ?? ROCKS[0]!.maxHp;
    return {
      ...base, ...raw, version: SAVE_VERSION, rockIndex,
      rockHp: Math.max(0, Math.min(raw.rockHp ?? maxHp, maxHp)),
      inventory: raw.inventory ?? {}, upgrades: { ...base.upgrades, ...raw.upgrades },
      settings: { ...base.settings, ...raw.settings },
      pendingDrops: Array.isArray(raw.pendingDrops) ? raw.pendingDrops.filter((drop) =>
        typeof drop?.dropId === 'string' && typeof drop.itemId === 'string') : [],
      rockHits: Math.max(0, raw.rockHits ?? 0),
      onboarding: isLegacy
        ? { eligible: false, guaranteedIron: true, guaranteedQuartz: true }
        : { ...base.onboarding, ...raw.onboarding },
    };
  }
}
