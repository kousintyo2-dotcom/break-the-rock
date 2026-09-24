import Phaser from 'phaser';

export interface ParticleSpec {
  texture: string;
  frame?: string | number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Rotation speed, rad/s. */
  spin?: number;
  rotation?: number;
  life: number;
  gravity?: number;
  /** Per-second velocity damping (0 = none). */
  drag?: number;
  scale: number;
  endScale?: number;
  /** Non-uniform stretch along X (sparks). */
  stretch?: number;
  alpha?: number;
  tint?: number;
  additive?: boolean;
  /** Align rotation with velocity (sparks). */
  alignToVelocity?: boolean;
  /** Seconds before fading starts, as a share of life (0..1). */
  fadeFrom?: number;
  /** Fly toward a moving target (BOOST energy). */
  homing?: () => { x: number; y: number };
  depth?: number;
}

interface Particle {
  img: Phaser.GameObjects.Image;
  active: boolean;
  vx: number;
  vy: number;
  spin: number;
  age: number;
  life: number;
  gravity: number;
  drag: number;
  scale: number;
  endScale: number;
  stretch: number;
  alpha: number;
  align: boolean;
  fadeFrom: number;
  homing: (() => { x: number; y: number }) | null;
  startX: number;
  startY: number;
}

/**
 * Fixed-size pool of short-lived images: debris, sparks, dust, trails.
 * Nothing lives longer than its `life`; when the pool is full the oldest piece is recycled.
 */
export class ParticlePool {
  private readonly items: Particle[] = [];
  private cursor = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, size: number, depth: number) {
    for (let i = 0; i < size; i++) {
      const img = scene.add.image(0, 0, 'dot').setVisible(false).setDepth(depth);
      layer.add(img);
      this.items.push({
        img,
        active: false,
        vx: 0,
        vy: 0,
        spin: 0,
        age: 0,
        life: 1,
        gravity: 0,
        drag: 0,
        scale: 1,
        endScale: 1,
        stretch: 1,
        alpha: 1,
        align: false,
        fadeFrom: 0.5,
        homing: null,
        startX: 0,
        startY: 0,
      });
    }
  }

  get activeCount(): number {
    return this.items.reduce((n, p) => n + (p.active ? 1 : 0), 0);
  }

  spawn(spec: ParticleSpec): void {
    let p = this.items.find((it) => !it.active);
    if (!p) {
      p = this.items[this.cursor]!;
      this.cursor = (this.cursor + 1) % this.items.length;
    }
    const img = p.img;
    img.setTexture(spec.texture, spec.frame);
    img.setPosition(spec.x, spec.y);
    img.setRotation(spec.rotation ?? 0);
    img.setAlpha(spec.alpha ?? 1);
    img.setBlendMode(spec.additive ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    if (spec.tint !== undefined) img.setTint(spec.tint);
    else img.clearTint();
    if (spec.depth !== undefined) img.setDepth(spec.depth);
    img.setVisible(true);
    p.active = true;
    p.vx = spec.vx;
    p.vy = spec.vy;
    p.spin = spec.spin ?? 0;
    p.age = 0;
    p.life = spec.life;
    p.gravity = spec.gravity ?? 0;
    p.drag = spec.drag ?? 0;
    p.scale = spec.scale;
    p.endScale = spec.endScale ?? spec.scale;
    p.stretch = spec.stretch ?? 1;
    p.alpha = spec.alpha ?? 1;
    p.align = spec.alignToVelocity ?? false;
    p.fadeFrom = spec.fadeFrom ?? 0.45;
    p.homing = spec.homing ?? null;
    p.startX = spec.x;
    p.startY = spec.y;
    img.setScale(spec.scale * p.stretch, spec.scale);
  }

  update(dt: number): void {
    for (const p of this.items) {
      if (!p.active) continue;
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) {
        p.active = false;
        p.img.setVisible(false);
        continue;
      }
      const img = p.img;
      if (p.homing) {
        const target = p.homing();
        const e = t * t * (3 - 2 * t);
        const arc = Math.sin(t * Math.PI) * p.vy * 0.25;
        img.x = p.startX + (target.x - p.startX) * e + p.vx * 0.12 * Math.sin(t * Math.PI);
        img.y = p.startY + (target.y - p.startY) * e + arc;
      } else {
        if (p.drag > 0) {
          const k = Math.max(0, 1 - p.drag * dt);
          p.vx *= k;
          p.vy *= k;
        }
        p.vy += p.gravity * dt;
        img.x += p.vx * dt;
        img.y += p.vy * dt;
      }
      if (p.align) img.rotation = Math.atan2(p.vy, p.vx);
      else img.rotation += p.spin * dt;
      const s = p.scale + (p.endScale - p.scale) * t;
      img.setScale(s * p.stretch, s);
      img.alpha = t < p.fadeFrom ? p.alpha : p.alpha * (1 - (t - p.fadeFrom) / (1 - p.fadeFrom));
    }
  }

  clear(): void {
    for (const p of this.items) {
      p.active = false;
      p.img.setVisible(false);
    }
  }
}
