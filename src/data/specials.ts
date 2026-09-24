export type SpecialId =
  | 'heavyWarhead'
  | 'initialThrust'
  | 'destructionUrge'
  | 'lightweight'
  | 'energyRecovery'
  | 'weakPoint'
  | 'doubleBreak'
  | 'turbo';

export interface SpecialDef {
  id: SpecialId;
  name: string;
  /** One or two short lines. */
  effect: string;
  color: number;
}

export const SPECIALS: readonly SpecialDef[] = [
  { id: 'heavyWarhead', name: '重量弾頭', effect: 'POWER +20%', color: 0xc98a4b },
  { id: 'initialThrust', name: '初速強化', effect: '最初の5枚\nPOWER +50%', color: 0x6fa7c9 },
  { id: 'destructionUrge', name: '破壊衝動', effect: '5枚突破ごとに\nPOWER回復 +5%', color: 0xc9634b },
  { id: 'lightweight', name: '軽量化', effect: 'POWER消費 -8%', color: 0x9fb07a },
  { id: 'energyRecovery', name: 'エネルギー回収', effect: '突破時15%で\nPOWER回復', color: 0x6cc0b0 },
  { id: 'weakPoint', name: '弱点看破', effect: 'CRITICAL率 +10%', color: 0xe0b44c },
  { id: 'doubleBreak', name: '二重破壊', effect: 'CRITICAL時50%で\n次の壁の消費半減', color: 0xb07ac9 },
  { id: 'turbo', name: 'ターボ', effect: 'BREAK RUSHが\n3枚早く発動', color: 0xd9d2c0 },
];

export const SPECIAL_IDS: readonly SpecialId[] = SPECIALS.map((s) => s.id);

export function specialById(id: SpecialId): SpecialDef {
  const def = SPECIALS.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown special ${id}`);
  return def;
}
