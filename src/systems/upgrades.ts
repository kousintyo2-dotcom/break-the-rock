import { TUNING } from '../config/tuning.ts';
import { critChanceForLevel, momentumMultiplier, powerForLevel, type Levels, type StatId } from './stats.ts';

export function upgradeCost(stat: StatId, level: number): number {
  const { base, growth } = TUNING.upgradeCost[stat];
  return Math.round(base * Math.pow(growth, level));
}

export interface StatPreview {
  label: string;
  current: string;
  next: string;
}

/** Human-readable before/after values for an upgrade row. */
export function statPreview(stat: StatId, levels: Levels): StatPreview {
  const level = levels[stat];
  switch (stat) {
    case 'power':
      return { label: 'POWER', current: `${powerForLevel(level)}`, next: `${powerForLevel(level + 1)}` };
    case 'momentum':
      return {
        label: 'MOMENTUM',
        current: `${Math.round(momentumMultiplier(level) * 100)}%`,
        next: `${Math.round(momentumMultiplier(level + 1) * 100)}%`,
      };
    case 'luck':
      return {
        label: 'LUCK',
        current: `${Math.round(critChanceForLevel(level) * 100)}%`,
        next: `${Math.round(critChanceForLevel(level + 1) * 100)}%`,
      };
  }
}

export const STAT_HINT: Record<StatId, string> = {
  power: '破壊力',
  momentum: '壁ごとのPOWER消費',
  luck: 'CRITICAL率',
};
