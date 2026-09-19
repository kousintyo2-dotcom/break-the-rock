import type { ItemDefinition } from '../data/types';

const RARITY_MASS = { COMMON: 0.75, UNCOMMON: 0.9, RARE: 1.05, EPIC: 1.18, LEGENDARY: 1.3 } as const;

export class DroppedItem {
  readonly dropId: string;
  readonly item: ItemDefinition;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation = 0;
  settled = false;
  age = 0;
  readonly radius = 24;
  private readonly spin: number;
  private bounces = 0;
  private readonly mass: number;

  constructor(dropId: string, item: ItemDefinition, x: number, y: number, direction = 1, restored = false) {
    this.dropId = dropId;
    this.item = item;
    this.x = x;
    this.y = y;
    this.mass = RARITY_MASS[item.rarity];
    this.vx = direction * (90 + Math.random() * 85) / this.mass;
    this.vy = -(245 + Math.random() * 65) / this.mass;
    this.spin = (Math.random() - 0.5) * 7 / this.mass;
    if (restored) { this.vx = 0; this.vy = 0; this.age = 1; this.settled = true; }
  }

  update(dt: number, ground: number, bounds: number): void {
    if (this.settled) return;
    this.age += dt;
    this.vy += 820 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.spin * dt;
    if (this.x < this.radius || this.x > bounds - this.radius) this.vx *= -0.45;
    this.x = Math.max(this.radius, Math.min(bounds - this.radius, this.x));
    if (this.y + this.radius >= ground) {
      this.y = ground - this.radius;
      this.bounces += 1;
      if (this.bounces < 3 && this.age < 0.78) {
        this.vy = -Math.abs(this.vy) * 0.28;
        this.vx *= 0.5;
      } else {
        this.vy = 0;
        this.vx = 0;
        this.settled = true;
      }
    }
    if (this.age >= 1) { this.y = ground - this.radius; this.vx = 0; this.vy = 0; this.settled = true; }
  }

  hit(x: number, y: number): boolean {
    return Math.hypot(this.x - x, this.y - y) <= 34; // 68px forgiving mobile target
  }
}
