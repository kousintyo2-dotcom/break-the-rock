import { TUNING } from '../config/tuning.ts';
import { SPECIAL_IDS, type SpecialId } from '../data/specials.ts';
import type { SaveData } from '../save/saveData.ts';
import type { Rng } from '../utils/random.ts';
import type { RunResult } from './runSimulator.ts';
import { deriveStats, type RunStats, type StatId } from './stats.ts';
import { upgradeCost } from './upgrades.ts';

export function statsFromSave(save: SaveData): RunStats {
  return deriveStats(save.levels, save.specials);
}

/** Bank a finished run. Mutates and returns the save. */
export function applyRunResult(save: SaveData, result: RunResult): SaveData {
  save.scrap += result.totalScrap;
  save.best = Math.max(save.best, result.wallsBroken);
  save.lastStop = { wall: result.stop.wall.index, damage: result.stop.damage };
  save.runs += 1;
  return save;
}

export function canAfford(save: SaveData, stat: StatId): boolean {
  return save.scrap >= upgradeCost(stat, save.levels[stat]);
}

export function buyUpgrade(save: SaveData, stat: StatId): boolean {
  const cost = upgradeCost(stat, save.levels[stat]);
  if (save.scrap < cost) return false;
  save.scrap -= cost;
  save.levels[stat] += 1;
  return true;
}

/** The first best-wall milestone reached whose special pick is still unclaimed. */
export function pendingMilestone(save: SaveData): number | null {
  const available = SPECIAL_IDS.some((id) => !save.specials.includes(id));
  if (!available) return null;
  return TUNING.specialMilestones.find((m) => save.best >= m && !save.claimedMilestones.includes(m)) ?? null;
}

/** Up to three unowned specials, in random order. */
export function rollSpecialOffer(save: SaveData, rng: Rng): SpecialId[] {
  const pool = SPECIAL_IDS.filter((id) => !save.specials.includes(id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, 3);
}

export function claimSpecial(save: SaveData, milestone: number, id: SpecialId): void {
  if (!save.claimedMilestones.includes(milestone)) save.claimedMilestones.push(milestone);
  if (!save.specials.includes(id)) save.specials.push(id);
}
