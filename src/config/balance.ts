export const TAP_SCORE = 10;
export const RISK_PER_TAP = 3;
export const STOP_DELAY = 500;
export const RESULT_DELAY = 900;
export const TOTAL_ROUNDS = 5;

export const STOP_RANGES = [
  { min: 97, result: 'CRAZY' },
  { min: 90, result: 'PERFECT' },
  { min: 75, result: 'GREAT' },
  { min: 50, result: 'GOOD' },
  { min: 0, result: 'SAFE' },
] as const;

export const STOP_MULTIPLIERS = {
  SAFE: 1,
  GOOD: 1.25,
  GREAT: 1.6,
  PERFECT: 2.5,
  CRAZY: 4,
} as const;

export const BURST_RATES = [
  { min: 100, rate: 1 },
  { min: 99, rate: 0.35 },
  { min: 98, rate: 0.2 },
  { min: 96, rate: 0.1 },
  { min: 93, rate: 0.05 },
  { min: 90, rate: 0.03 },
] as const;

export const ROUND_MULTIPLIERS = [
  { score: 1, risk: 0.9 },
  { score: 1.1, risk: 0.95 },
  { score: 1.2, risk: 1 },
  { score: 1.4, risk: 1.05 },
  { score: 2, risk: 1.1 },
] as const;

export type StopResult = keyof typeof STOP_MULTIPLIERS;
