import { SPECIAL_IDS, type SpecialId } from '../data/specials.ts';
import type { Levels } from '../systems/stats.ts';

export const SAVE_VERSION = 1;

export interface Settings {
  vibration: boolean;
  /** 0..1 */
  shake: number;
  /** 0..1 */
  flash: number;
  /** 0..1 */
  sfx: number;
  /** 0..1 */
  bgm: number;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  best: number;
  scrap: number;
  levels: Levels;
  specials: SpecialId[];
  /** Best-wall milestones whose special pick has been taken. */
  claimedMilestones: number[];
  /** Where the last run stopped — shown as the "beat this" marker. */
  lastStop: { wall: number; damage: number } | null;
  runs: number;
  settings: Settings;
}

export function defaultSettings(reducedMotion = false): Settings {
  return { vibration: true, shake: reducedMotion ? 0.3 : 1, flash: reducedMotion ? 0.3 : 1, sfx: 0.8, bgm: 0.6 };
}

export function createDefaultSave(reducedMotion = false): SaveData {
  return {
    version: SAVE_VERSION,
    best: 0,
    scrap: 0,
    levels: { power: 0, momentum: 0, luck: 0 },
    specials: [],
    claimedMilestones: [],
    lastStop: null,
    runs: 0,
    settings: defaultSettings(reducedMotion),
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function int(v: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : fallback;
}

function unit(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
}

/**
 * Accepts anything (old versions, hand-edited or corrupt data) and returns a valid save.
 * Unknown fields are dropped; missing or invalid fields fall back to defaults.
 */
export function normalizeSave(raw: unknown, reducedMotion = false): SaveData {
  const base = createDefaultSave(reducedMotion);
  if (!isRecord(raw)) return base;
  // Future migrations: switch on raw.version here before normalizing.
  const levels = isRecord(raw.levels) ? raw.levels : {};
  const settings = isRecord(raw.settings) ? raw.settings : {};
  const specials = Array.isArray(raw.specials)
    ? [...new Set(raw.specials.filter((s): s is SpecialId => SPECIAL_IDS.includes(s as SpecialId)))]
    : [];
  const milestones = Array.isArray(raw.claimedMilestones)
    ? [...new Set(raw.claimedMilestones.filter((m): m is number => typeof m === 'number' && Number.isInteger(m) && m > 0))]
    : [];
  const stop = isRecord(raw.lastStop) ? raw.lastStop : null;
  return {
    version: SAVE_VERSION,
    best: int(raw.best, 0, 100000),
    scrap: int(raw.scrap, 0),
    levels: {
      power: int(levels.power, 0, 10000),
      momentum: int(levels.momentum, 0, 10000),
      luck: int(levels.luck, 0, 10000),
    },
    specials,
    claimedMilestones: milestones,
    lastStop: stop && int(stop.wall, 0) > 0 ? { wall: int(stop.wall, 1), damage: unit(stop.damage, 0) } : null,
    runs: int(raw.runs, 0),
    settings: {
      vibration: typeof settings.vibration === 'boolean' ? settings.vibration : base.settings.vibration,
      shake: unit(settings.shake, base.settings.shake),
      flash: unit(settings.flash, base.settings.flash),
      sfx: unit(settings.sfx, base.settings.sfx),
      bgm: unit(settings.bgm, base.settings.bgm),
    },
  };
}
