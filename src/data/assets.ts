/** Images cut from the supplied sprite sheets (see tools/extract-assets.py). */
export const IMAGE_ASSETS = {
  'core-1': 'assets/core-1.png',
  'core-2': 'assets/core-2.png',
  'wall-wood': 'assets/wall-wood.png',
  'wall-brick': 'assets/wall-brick.png',
  'wall-iron': 'assets/wall-iron.png',
  'wall-armored': 'assets/wall-armored.png',
  'wall-gold': 'assets/wall-gold.png',
  'wall-boost': 'assets/wall-boost.png',
  'bg-warehouse': 'assets/bg-warehouse.jpg',
  'bg-factory': 'assets/bg-factory.jpg',
  'fx-impact': 'assets/fx-impact.png',
  'fx-critical': 'assets/fx-critical.png',
  'fx-speed': 'assets/fx-speed.png',
} as const;

/**
 * Extracted but reserved for later phases: core-3, core-4, wall-concrete, wall-glass,
 * wall-energy, wall-void, wall-chain, wall-fullcharge, the-wall, bg-lab, bg-anomaly.
 */
export type ImageKey = keyof typeof IMAGE_ASSETS;

export const WALL_TEXTURES = ['wall-wood', 'wall-brick', 'wall-iron', 'wall-armored', 'wall-gold', 'wall-boost'] as const;

/** BREAK CORE forms: texture and where the sphere's centre sits inside the sprite. */
export const CORE_FORMS = [
  { texture: 'core-1', originX: 0.5, sphere: 150 },
  { texture: 'core-2', originX: 0.64, sphere: 150 },
] as const;

/** Background per wall range. */
export const AREAS = [
  { fromWall: 1, texture: 'bg-warehouse', name: 'WAREHOUSE' },
  { fromWall: 11, texture: 'bg-factory', name: 'FACTORY' },
] as const;

export function areaForWall(wall: number): (typeof AREAS)[number] {
  let area: (typeof AREAS)[number] = AREAS[0];
  for (const a of AREAS) if (wall >= a.fromWall) area = a;
  return area;
}
