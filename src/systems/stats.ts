import { SPECIAL_TUNING, TUNING } from '../config/tuning.ts';
import type { SpecialId } from '../data/specials.ts';

export type StatId = 'power' | 'momentum' | 'luck';
export const STAT_IDS: readonly StatId[] = ['power', 'momentum', 'luck'];

export interface Levels {
  power: number;
  momentum: number;
  luck: number;
}

/** Everything a run needs, derived from upgrade levels and owned specials. */
export interface RunStats {
  power: number;
  /** Multiplier on every wall's cost (MOMENTUM, lightweight). */
  costMultiplier: number;
  critChance: number;
  critCostMultiplier: number;
  luckyScrapChance: number;
  comboStart: number;
  rushThresholds: readonly number[];
  specials: ReadonlySet<SpecialId>;
}

export function powerForLevel(level: number): number {
  const { base, flatStep, rampStep } = TUNING.power;
  let power = base;
  for (let l = 1; l <= level; l++) power += Math.round(flatStep + l * rampStep);
  return power;
}

export function momentumMultiplier(level: number): number {
  return 1 / (1 + TUNING.momentum.reductionPerLevel * level);
}

export function critChanceForLevel(level: number): number {
  const { baseCritChance, critChancePerLevel, maxCritChance } = TUNING.luck;
  return Math.min(maxCritChance, baseCritChance + critChancePerLevel * level);
}

export function deriveStats(levels: Levels, specials: Iterable<SpecialId>): RunStats {
  const owned = new Set(specials);
  let power = powerForLevel(levels.power);
  if (owned.has('heavyWarhead')) power = Math.round(power * SPECIAL_TUNING.heavyWarhead.powerMultiplier);
  let costMultiplier = momentumMultiplier(levels.momentum);
  if (owned.has('lightweight')) costMultiplier *= SPECIAL_TUNING.lightweight.costMultiplier;
  let critChance = critChanceForLevel(levels.luck);
  if (owned.has('weakPoint')) critChance = Math.min(TUNING.luck.maxCritChance, critChance + SPECIAL_TUNING.weakPoint.critChanceBonus);
  const luckyScrapChance = Math.min(TUNING.luck.maxLuckyScrap, TUNING.luck.luckyScrapPerLevel * levels.luck);
  const reduction = owned.has('turbo') ? SPECIAL_TUNING.turbo.thresholdReduction : 0;
  return {
    power,
    costMultiplier,
    critChance,
    critCostMultiplier: TUNING.luck.critCostMultiplier,
    luckyScrapChance,
    comboStart: Math.max(2, TUNING.rush.comboStart - Math.ceil(reduction / 2)),
    rushThresholds: TUNING.rush.levels.slice(0, TUNING.rush.maxLevel).map((t) => Math.max(3, t - reduction)),
    specials: owned,
  };
}

/** 0 = normal, 1+ = BREAK RUSH level, for a given number of consecutive breaks. */
export function rushLevel(combo: number, stats: Pick<RunStats, 'rushThresholds'>): number {
  let level = 0;
  stats.rushThresholds.forEach((threshold, i) => {
    if (combo >= threshold) level = i + 1;
  });
  return level;
}
