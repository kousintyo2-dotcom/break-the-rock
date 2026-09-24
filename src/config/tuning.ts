/**
 * Game balance values. Everything that decides "how far does a run go" lives here
 * so it can be tuned without touching rules or presentation code.
 */
export const TUNING = {
  /** POWER stat: starting value and per-level increment (grows each level). */
  power: {
    base: 12,
    /** Increment for reaching level L is `flatStep + L * rampStep`. */
    flatStep: 2,
    rampStep: 1.2,
  },
  /** MOMENTUM: each level reduces the POWER each wall consumes. */
  momentum: {
    reductionPerLevel: 0.075, // costMultiplier = 1 / (1 + reductionPerLevel * L)
  },
  /** LUCK: critical rate and the hooks for future luck-driven effects. */
  luck: {
    baseCritChance: 0.05,
    critChancePerLevel: 0.025,
    maxCritChance: 0.75,
    /** A critical hit only consumes this fraction of the wall's cost. */
    critCostMultiplier: 0.4,
    /** Chance per broken wall of a lucky double scrap drop. */
    luckyScrapPerLevel: 0.015,
    maxLuckyScrap: 0.3,
  },
  /** Normal upgrade prices: round(base * growth ^ level). */
  upgradeCost: {
    power: { base: 6, growth: 1.42 },
    momentum: { base: 12, growth: 1.5 },
    luck: { base: 16, growth: 1.55 },
  },
  scrap: {
    /** Scrap for a partially damaged (stopping) wall: reward * damage * this. */
    partialRewardRate: 0.5,
    /** Extra scrap on runs that beat the previous best, as a share of run scrap. */
    recordBonusRate: 0.3,
  },
  special: {
    crackHpMultiplier: 0.55,
    boostRestoreRatio: 0.45, // of the run's starting POWER
  },
  /** BREAK RUSH thresholds (consecutive walls broken in one run). */
  rush: {
    comboStart: 5,
    levels: [10, 20, 30] as readonly number[],
    /** PHASE 1 only unlocks Lv1. */
    maxLevel: 1,
  },
  /** Best-wall milestones that offer a special upgrade pick. */
  specialMilestones: [5, 10, 15, 20] as readonly number[],
  /** POWER level at which BREAK CORE evolves to its second form. */
  coreForm2PowerLevel: 10,
  /** Hard safety cap for a single run. */
  maxWallsPerRun: 400,
} as const;

/** Parameters for each special upgrade effect. */
export const SPECIAL_TUNING = {
  heavyWarhead: { powerMultiplier: 1.2 },
  initialThrust: { walls: 5, powerMultiplier: 1.5 },
  destructionUrge: { everyWalls: 5, restoreRatio: 0.05 },
  lightweight: { costMultiplier: 0.92 },
  energyRecovery: { chance: 0.15, restoreRatio: 0.08 },
  weakPoint: { critChanceBonus: 0.1 },
  doubleBreak: { chance: 0.5, nextCostMultiplier: 0.5 },
  turbo: { thresholdReduction: 3 },
} as const;
