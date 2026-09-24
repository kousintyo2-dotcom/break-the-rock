import { TUNING } from '../config/tuning.ts';
import type { WallMaterial, WallSpecial } from './wallTypes.ts';

export interface WallDef {
  /** 1-based wall number. */
  index: number;
  material: WallMaterial;
  special: WallSpecial;
  /** Durability after special modifiers (e.g. CRACK). */
  hp: number;
  /** SCRAP for breaking this wall. */
  reward: number;
  /** Visual scale relative to a normal wall. */
  scale: number;
}

type Row = [material: WallMaterial, hp: number, reward: number, special?: WallSpecial, scale?: number];

/**
 * PHASE 1 course, walls 1–20. Special walls are placed deliberately (not random) so
 * the first minutes always show GOLD, CRACK and BOOST.
 */
const PHASE1: readonly Row[] = [
  ['wood', 4, 2],
  ['wood', 4, 2],
  ['gold', 6, 14, 'gold'],
  ['wood', 11, 3],
  ['brick', 18, 4, 'crack'],
  ['brick', 19, 6],
  ['brick', 24, 7],
  ['boost', 24, 9, 'boost'],
  ['brick', 36, 10],
  ['iron', 55, 15, 'milestone', 1.1],
  ['brick', 52, 13],
  ['gold', 60, 40, 'gold'],
  ['iron', 80, 16, 'crack'],
  ['iron', 84, 18],
  ['boost', 80, 20, 'boost'],
  ['iron', 110, 23],
  ['iron', 125, 26],
  ['gold', 135, 80, 'gold'],
  ['iron', 160, 32],
  ['armored', 290, 70, 'gate', 1.28],
];

export const PHASE1_WALL_COUNT = PHASE1.length;

function build(index: number, row: Row): WallDef {
  const [material, baseHp, reward, special = 'none', scale = 1] = row;
  const hp = special === 'crack' ? Math.round(baseHp * TUNING.special.crackHpMultiplier) : baseHp;
  return { index, material, special, hp, reward, scale };
}

const cache = new Map<number, WallDef>();

/** Wall definition for a 1-based index. Beyond the PHASE 1 course, walls keep getting harder. */
export function getWall(index: number): WallDef {
  const hit = cache.get(index);
  if (hit) return hit;
  let def: WallDef;
  const row = PHASE1[index - 1];
  if (row) {
    def = build(index, row);
  } else {
    const n = index - PHASE1.length;
    const hp = Math.round(290 * Math.pow(1.15, n));
    const reward = Math.round(32 * Math.pow(1.12, n));
    const special: WallSpecial = n % 6 === 3 ? 'boost' : n % 6 === 0 ? 'gold' : 'none';
    const material: WallMaterial = special === 'boost' ? 'boost' : special === 'gold' ? 'gold' : n % 2 ? 'iron' : 'armored';
    def = build(index, [material, hp, special === 'gold' ? reward * 4 : reward, special]);
  }
  cache.set(index, def);
  return def;
}
