import Phaser from 'phaser';
import { FEEL } from '../config/feel.ts';
import { MATERIALS } from '../data/wallTypes.ts';
import type { WallView } from '../entities/WallView.ts';
import { CHIP_FRAMES, CHUNK_FRAMES } from '../scenes/BootScene.ts';
import { COLORS } from '../ui/theme.ts';
import type { ParticlePool } from './ParticlePool.ts';

const D = FEEL.debris;
const rand = Phaser.Math.FloatBetween;

export interface ShatterOptions {
  crit: boolean;
  /** 1 = normal; grows with combo / record moments. */
  power: number;
  /** How fast the core is moving (debris inherits some of it). */
  speed: number;
  impactY: number;
}

/** Spawns wall debris, sparks, dust and the supplied impact FX sprites. */
export class BreakEffects {
  constructor(
    private readonly debris: ParticlePool,
    private readonly fx: ParticlePool,
  ) {}

  /** A wall breaks: real wall art splits into slabs and chips. */
  shatter(view: WallView, o: ShatterOptions): void {
    const def = view.def;
    if (!def) return;
    const mat = MATERIALS[def.material];
    const style = mat.debris;
    const scale = view.sprite.scaleX;
    const push = 260 + o.speed * 0.35;
    const amount = Math.min(2, o.power) * (o.crit ? 1.5 : 1);
    const top = view.centerY - view.height / 2;

    // Big slabs from the sprite itself.
    let y = top;
    for (let i = 0; i < CHUNK_FRAMES; i++) {
      const frame = view.sprite.texture.get(`chunk${i}`);
      const h = frame.height * scale;
      if (i < style.chunks || o.crit) {
        this.debris.spawn({
          texture: mat.texture,
          frame: `chunk${i}`,
          x: view.x + rand(-6, 6),
          y: y + h / 2,
          vx: push * rand(0.55, 1.1),
          vy: (i - 1) * rand(160, 320) - rand(80, 200),
          spin: rand(-7, 7),
          life: rand(0.38, 0.55),
          gravity: D.gravity,
          scale,
          endScale: scale * 0.85,
          fadeFrom: 0.5,
          depth: 48,
        });
      }
      y += h;
    }

    // Chips (sized per material).
    const chips = Math.round(style.chips * amount);
    for (let i = 0; i < chips; i++) {
      const frameName = `chip${i % CHIP_FRAMES}`;
      const frame = view.sprite.texture.get(frameName);
      const size = rand(style.chipSize[0], style.chipSize[1]);
      const s = size / Math.max(frame.width, frame.height);
      const angle = rand(-1.2, 1.0);
      const v = rand(280, 720) * (o.crit ? 1.25 : 1);
      this.debris.spawn({
        texture: mat.texture,
        frame: frameName,
        x: view.frontX + rand(0, view.width * 0.8),
        y: o.impactY + rand(-view.height * 0.35, view.height * 0.35),
        vx: Math.cos(angle) * v + push * 0.4,
        vy: Math.sin(angle) * v - 120,
        spin: rand(-14, 14),
        life: rand(D.lifeMin, D.lifeMax),
        gravity: D.gravity,
        scale: s,
        endScale: s * 0.6,
        fadeFrom: 0.55,
        depth: 50,
      });
    }

    // Sparks.
    const sparks = Math.round(style.sparks * amount);
    for (let i = 0; i < sparks; i++) {
      const angle = rand(-1.4, 1.4) + (Math.random() < 0.3 ? Math.PI : 0);
      const v = rand(500, 1100);
      this.debris.spawn({
        texture: 'spark',
        x: view.frontX,
        y: o.impactY + rand(-30, 30),
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: rand(0.18, 0.4),
        gravity: 1200,
        drag: 2,
        scale: rand(0.6, 1.1),
        stretch: 1.6,
        tint: Math.random() < 0.5 ? 0xffd27a : 0xfff1c9,
        additive: true,
        alignToVelocity: true,
        fadeFrom: 0.3,
        depth: 52,
      });
    }

    // Dust.
    for (let i = 0; i < style.dust + (o.crit ? 3 : 0); i++) {
      this.debris.spawn({
        texture: 'puff',
        x: view.x + rand(-view.width * 0.5, view.width * 0.5),
        y: view.centerY + rand(-view.height * 0.45, view.height * 0.5),
        vx: rand(-60, 220),
        vy: rand(-80, 30),
        drag: 3,
        life: rand(0.45, 0.75),
        scale: rand(0.9, 1.5),
        endScale: rand(2.2, 3),
        alpha: 0.45,
        tint: style.dustColor,
        fadeFrom: 0.1,
        depth: 47,
      });
    }

    // Glitter (GOLD / BOOST).
    for (let i = 0; i < style.glitter; i++) {
      const angle = rand(0, Math.PI * 2);
      const v = rand(150, 520);
      this.debris.spawn({
        texture: 'dot',
        x: view.x,
        y: view.centerY + rand(-view.height * 0.3, view.height * 0.3),
        vx: Math.cos(angle) * v + 120,
        vy: Math.sin(angle) * v - 150,
        gravity: 700,
        drag: 1.5,
        spin: rand(-10, 10),
        life: rand(0.45, 0.8),
        scale: rand(0.5, 1),
        endScale: 0.2,
        tint: style.glitterColor,
        additive: true,
        fadeFrom: 0.4,
        depth: 53,
      });
    }

    this.impact(view.frontX, o.impactY, o.crit, o.power);
  }

  /** Supplied IMPACT / CRITICAL FX sprites, short and punchy. */
  impact(x: number, y: number, crit: boolean, power = 1): void {
    const s = 0.42 + Math.min(1, power - 1) * 0.12;
    this.fx.spawn({
      texture: 'fx-impact',
      x: x + 6,
      y,
      vx: 0,
      vy: 0,
      rotation: rand(-0.3, 0.3),
      life: 0.16,
      scale: s * 0.7,
      endScale: s * 1.15,
      additive: true,
      fadeFrom: 0.25,
    });
    if (crit) {
      this.fx.spawn({
        texture: 'fx-critical',
        x: x + 10,
        y,
        vx: 0,
        vy: 0,
        rotation: rand(-0.2, 0.2),
        life: 0.3,
        scale: 0.8,
        endScale: 1.35,
        additive: true,
        fadeFrom: 0.35,
      });
    }
  }

  /** Stuck in a wall: a few chips and dust, no breakthrough. */
  stopHit(view: WallView, impactY: number): void {
    const def = view.def;
    if (!def) return;
    const mat = MATERIALS[def.material];
    for (let i = 0; i < 6; i++) {
      const frameName = `chip${i}`;
      const frame = view.sprite.texture.get(frameName);
      const s = rand(12, 20) / Math.max(frame.width, frame.height);
      this.debris.spawn({
        texture: mat.texture,
        frame: frameName,
        x: view.frontX,
        y: impactY + rand(-40, 40),
        vx: rand(-420, -120),
        vy: rand(-420, -80),
        spin: rand(-12, 12),
        life: rand(0.4, 0.65),
        gravity: D.gravity,
        scale: s,
        fadeFrom: 0.6,
        depth: 50,
      });
    }
    for (let i = 0; i < 4; i++) {
      this.debris.spawn({
        texture: 'puff',
        x: view.frontX + rand(-10, 10),
        y: impactY + rand(-50, 60),
        vx: rand(-160, -30),
        vy: rand(-50, 20),
        drag: 3,
        life: rand(0.5, 0.75),
        scale: 1,
        endScale: 2.6,
        alpha: 0.4,
        tint: mat.debris.dustColor,
        fadeFrom: 0.1,
        depth: 47,
      });
    }
    this.fx.spawn({ texture: 'fx-impact', x: view.frontX, y: impactY, vx: 0, vy: 0, life: 0.2, scale: 0.35, endScale: 0.6, additive: true, alpha: 0.8 });
  }

  /** BOOST: energy streams out of the broken wall into the core. */
  absorb(fromX: number, fromY: number, target: () => { x: number; y: number }, color: number = COLORS.boost): void {
    for (let i = 0; i < 16; i++) {
      this.fx.spawn({
        texture: i % 3 === 0 ? 'spark' : 'puff',
        x: fromX + rand(-30, 30),
        y: fromY + rand(-120, 120),
        vx: rand(-200, 200),
        vy: rand(-300, 300),
        homing: target,
        life: rand(0.18, 0.3),
        scale: i % 3 === 0 ? 1.2 : rand(0.35, 0.6),
        endScale: 0.2,
        tint: i % 2 ? color : 0xffc07a,
        additive: true,
        fadeFrom: 0.7,
      });
    }
  }

  /** Charge-up sparks converging on the core before launch. */
  charge(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const a = rand(0, Math.PI * 2);
      const r = rand(70, 120);
      this.fx.spawn({
        texture: 'puff',
        x: x + Math.cos(a) * r,
        y: y + Math.sin(a) * r,
        vx: 0,
        vy: 0,
        homing: () => ({ x, y }),
        life: 0.24,
        scale: 0.3,
        endScale: 0.12,
        tint: COLORS.energy,
        additive: true,
        fadeFrom: 0.8,
      });
    }
  }
}
