import type Phaser from 'phaser';
import { FEEL } from '../config/feel.ts';
import { getWall } from '../data/walls.ts';
import { WallView, type WallTag } from './WallView.ts';

const L = FEEL.layout;
const POOL = 9;

/** Positions walls in world space and recycles WallViews as the camera moves. */
export class WallField {
  private readonly views: WallView[] = [];
  private broken = 0;
  private recordWall = 0;
  private lastStop: { wall: number; damage: number } | null = null;
  private first = -1;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    for (let i = 0; i < POOL; i++) this.views.push(new WallView(scene, layer));
  }

  static centerX(index: number): number {
    return L.firstWallGap + (index - 1) * L.wallSpacing;
  }

  reset(best: number, lastStop: { wall: number; damage: number } | null): void {
    this.broken = 0;
    this.recordWall = best > 0 ? best + 1 : 0;
    this.lastStop = lastStop;
    this.first = -1;
  }

  markBroken(index: number): void {
    this.broken = Math.max(this.broken, index);
    this.view(index)?.setBroken(true);
  }

  view(index: number): WallView | undefined {
    return this.views.find((v) => v.index === index);
  }

  /** Front face of a wall (where the core makes contact). */
  frontX(index: number): number {
    const v = this.view(index);
    if (v) return v.frontX;
    const def = getWall(index);
    return WallField.centerX(index) - 105 * def.scale * 0.42;
  }

  private tagFor(index: number): WallTag {
    return {
      record: index === this.recordWall,
      lastDamage: this.lastStop && this.lastStop.wall === index ? this.lastStop.damage : null,
    };
  }

  /** Assign pooled views to the walls around the camera. */
  update(scrollX: number, force = false): void {
    const first = Math.max(1, Math.floor((scrollX - L.firstWallGap - 120) / L.wallSpacing) + 1);
    if (first === this.first && !force) return;
    this.first = first;
    const wanted = new Set<number>();
    for (let i = first; i < first + POOL; i++) wanted.add(i);
    const free = this.views.filter((v) => !wanted.has(v.index) || force);
    const have = new Set(this.views.filter((v) => !free.includes(v)).map((v) => v.index));
    for (const index of wanted) {
      if (have.has(index)) continue;
      const view = free.pop();
      if (!view) break;
      view.configure(getWall(index), WallField.centerX(index), index <= this.broken, this.tagFor(index));
    }
  }

  /** Walls with the given special coming up that are still off-screen to the right. */
  nextOffscreen(scrollX: number, viewWidth: number, fromIndex: number, lookahead = 8): { index: number; special: string } | null {
    for (let i = fromIndex; i < fromIndex + lookahead; i++) {
      const def = getWall(i);
      if (def.special !== 'gold' && def.special !== 'boost') continue;
      if (WallField.centerX(i) - scrollX > viewWidth + 30) return { index: i, special: def.special };
    }
    return null;
  }
}
