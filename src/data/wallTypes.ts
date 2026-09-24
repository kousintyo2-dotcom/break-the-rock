import type { SoundId } from '../audio/soundIds.ts';

export type WallMaterial = 'wood' | 'brick' | 'iron' | 'armored' | 'gold' | 'boost';
export type WallSpecial = 'none' | 'gold' | 'crack' | 'boost' | 'milestone' | 'gate';

export interface DebrisStyle {
  /** Big slabs cut from the wall sprite. */
  chunks: number;
  /** Small chips cut from the wall sprite. */
  chips: number;
  chipSize: readonly [number, number];
  /** Sparks (metal). */
  sparks: number;
  /** Dust puffs. */
  dust: number;
  dustColor: number;
  /** Extra glittering particles. */
  glitter: number;
  glitterColor: number;
}

export interface MaterialDef {
  texture: string;
  label: string;
  debris: DebrisStyle;
  breakSound: SoundId;
  hitSound: SoundId;
}

export const MATERIALS: Record<WallMaterial, MaterialDef> = {
  wood: {
    texture: 'wall-wood',
    label: 'WOOD',
    debris: { chunks: 3, chips: 7, chipSize: [26, 46], sparks: 0, dust: 4, dustColor: 0x9a7b55, glitter: 0, glitterColor: 0 },
    breakSound: 'breakWood',
    hitSound: 'stopWood',
  },
  brick: {
    texture: 'wall-brick',
    label: 'BRICK',
    debris: { chunks: 2, chips: 12, chipSize: [12, 22], sparks: 0, dust: 6, dustColor: 0xa06a4e, glitter: 0, glitterColor: 0 },
    breakSound: 'breakBrick',
    hitSound: 'stopBrick',
  },
  iron: {
    texture: 'wall-iron',
    label: 'IRON',
    debris: { chunks: 2, chips: 8, chipSize: [12, 24], sparks: 14, dust: 3, dustColor: 0x77787a, glitter: 0, glitterColor: 0 },
    breakSound: 'breakIron',
    hitSound: 'stopIron',
  },
  armored: {
    texture: 'wall-armored',
    label: 'ARMOR',
    debris: { chunks: 3, chips: 12, chipSize: [14, 28], sparks: 20, dust: 6, dustColor: 0x5c6066, glitter: 0, glitterColor: 0 },
    breakSound: 'breakIron',
    hitSound: 'stopIron',
  },
  gold: {
    texture: 'wall-gold',
    label: 'GOLD',
    debris: { chunks: 2, chips: 10, chipSize: [12, 22], sparks: 6, dust: 3, dustColor: 0xb8923a, glitter: 18, glitterColor: 0xffd76a },
    breakSound: 'breakGold',
    hitSound: 'stopIron',
  },
  boost: {
    texture: 'wall-boost',
    label: 'BOOST',
    debris: { chunks: 2, chips: 9, chipSize: [12, 22], sparks: 10, dust: 3, dustColor: 0x6b5b58, glitter: 10, glitterColor: 0xff6a3a },
    breakSound: 'breakBoost',
    hitSound: 'stopIron',
  },
};
