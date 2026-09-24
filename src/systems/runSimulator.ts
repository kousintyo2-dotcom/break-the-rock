import { SPECIAL_TUNING, TUNING } from '../config/tuning.ts';
import { getWall, type WallDef } from '../data/walls.ts';
import type { Rng } from '../utils/random.ts';
import { rushLevel, type RunStats } from './stats.ts';

/** One wall the BREAK CORE went through. */
export interface BreakEvent {
  wall: WallDef;
  cost: number;
  crit: boolean;
  powerBefore: number;
  powerAfter: number;
  scrap: number;
  luckyScrap: boolean;
  /** POWER restored by this wall (BOOST, recovery, urge) — shown as a re-acceleration. */
  restored: number;
  restoreSource: 'boost' | 'recovery' | 'urge' | null;
  /** Next wall costs less thanks to 二重破壊. */
  armedDouble: boolean;
  /** Consecutive walls broken so far in this run (1-based). */
  combo: number;
  rushLevel: number;
  /** First wall past the previous best (not flagged on the very first run). */
  newBest: boolean;
}

/** The wall that stopped the run. */
export interface StopEvent {
  wall: WallDef;
  cost: number;
  crit: boolean;
  powerBefore: number;
  /** 0..1 of the wall's durability destroyed. */
  damage: number;
  scrap: number;
}

export interface RunResult {
  startPower: number;
  breaks: BreakEvent[];
  stop: StopEvent;
  wallsBroken: number;
  scrapFromWalls: number;
  recordBonus: number;
  totalScrap: number;
  previousBest: number;
  newBest: boolean;
}

/** Cost multiplier from specials that depend on the position inside a run. */
function positionalMultiplier(stats: RunStats, index: number): number {
  if (stats.specials.has('initialThrust') && index <= SPECIAL_TUNING.initialThrust.walls) {
    return 1 / SPECIAL_TUNING.initialThrust.powerMultiplier;
  }
  return 1;
}

/**
 * Resolve an entire run up front. The scene plays the result back, which keeps
 * the rules deterministic and testable.
 */
export function simulateRun(stats: RunStats, previousBest: number, rng: Rng): RunResult {
  const startPower = stats.power;
  let remaining = startPower;
  let doubleArmed = false;
  const breaks: BreakEvent[] = [];
  let scrapFromWalls = 0;
  let stop: StopEvent | null = null;

  for (let index = 1; index <= TUNING.maxWallsPerRun; index++) {
    const wall = getWall(index);
    const crit = rng() < stats.critChance;
    let multiplier = stats.costMultiplier * positionalMultiplier(stats, index);
    if (doubleArmed) multiplier *= SPECIAL_TUNING.doubleBreak.nextCostMultiplier;
    if (crit) multiplier *= stats.critCostMultiplier;
    const cost = wall.hp * multiplier;
    doubleArmed = false;

    if (remaining + 1e-9 < cost) {
      const damage = Math.min(0.99, Math.max(0.01, remaining / cost));
      const scrap = Math.round(wall.reward * damage * TUNING.scrap.partialRewardRate);
      stop = { wall, cost, crit, powerBefore: remaining, damage, scrap };
      scrapFromWalls += scrap;
      break;
    }

    const powerBefore = remaining;
    remaining -= cost;
    const combo = breaks.length + 1;
    let restored = 0;
    let restoreSource: BreakEvent['restoreSource'] = null;
    if (wall.special === 'boost') {
      restored += startPower * TUNING.special.boostRestoreRatio;
      restoreSource = 'boost';
    }
    if (stats.specials.has('energyRecovery') && rng() < SPECIAL_TUNING.energyRecovery.chance) {
      restored += startPower * SPECIAL_TUNING.energyRecovery.restoreRatio;
      restoreSource ??= 'recovery';
    }
    if (stats.specials.has('destructionUrge') && combo % SPECIAL_TUNING.destructionUrge.everyWalls === 0) {
      restored += startPower * SPECIAL_TUNING.destructionUrge.restoreRatio;
      restoreSource ??= 'urge';
    }
    remaining += restored;
    if (crit && stats.specials.has('doubleBreak') && rng() < SPECIAL_TUNING.doubleBreak.chance) doubleArmed = true;
    const luckyScrap = rng() < stats.luckyScrapChance;
    const scrap = wall.reward * (luckyScrap ? 2 : 1);
    scrapFromWalls += scrap;

    breaks.push({
      wall,
      cost,
      crit,
      powerBefore,
      powerAfter: remaining,
      scrap,
      luckyScrap,
      restored,
      restoreSource,
      armedDouble: doubleArmed,
      combo,
      rushLevel: rushLevel(combo, stats),
      newBest: previousBest > 0 && index === previousBest + 1,
    });
  }

  if (!stop) {
    // Safety net: treat the cap as an unbreakable wall.
    const wall = getWall(TUNING.maxWallsPerRun + 1);
    stop = { wall, cost: wall.hp, crit: false, powerBefore: remaining, damage: 0.01, scrap: 0 };
  }

  const wallsBroken = breaks.length;
  const newBest = wallsBroken > previousBest;
  const recordBonus = newBest ? Math.round(scrapFromWalls * TUNING.scrap.recordBonusRate) : 0;
  return {
    startPower,
    breaks,
    stop,
    wallsBroken,
    scrapFromWalls,
    recordBonus,
    totalScrap: scrapFromWalls + recordBonus,
    previousBest,
    newBest,
  };
}

/** Rough range of walls the next run should reach (for the "EST." display). */
export function estimateWalls(stats: RunStats, samples = 40): { low: number; high: number } {
  const results: number[] = [];
  for (let seed = 1; seed <= samples; seed++) {
    let s = seed * 7919;
    const rng: Rng = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    results.push(simulateRun(stats, Number.MAX_SAFE_INTEGER, rng).wallsBroken);
  }
  results.sort((a, b) => a - b);
  const low = results[Math.floor(samples * 0.2)] ?? 0;
  const high = results[Math.floor(samples * 0.8)] ?? low;
  return { low, high };
}
