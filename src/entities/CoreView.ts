import Phaser from 'phaser';
import { FEEL } from '../config/feel.ts';
import { CORE_FORMS } from '../data/assets.ts';
import type { ParticlePool } from '../effects/ParticlePool.ts';
import { COLORS } from '../ui/theme.ts';

const L = FEEL.layout;

/** The BREAK CORE: sprite, glow, speed streak and afterimage trail. */
export class CoreView {
  readonly sprite: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly streak: Phaser.GameObjects.Image;
  private form = -1;
  x = 0;
  readonly y = L.floorY - L.wallHeight * 0.42;
  private bobTime = 0;
  private trailTimer = 0;
  offsetX = 0;
  squash = 0;
  /** 0 idle .. 1 running .. 2 combo .. 3 rush */
  intensity = 0;
  surge = 0;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.scene = scene;
    this.shadow = scene.add.image(0, L.floorY + 2, 'puff').setTint(0x000000).setAlpha(0.5).setDepth(20);
    this.streak = scene.add.image(0, this.y, 'fx-speed').setOrigin(0.92, 0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(33);
    this.glow = scene.add.image(0, this.y, 'puff').setTint(COLORS.energy).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setDepth(34);
    this.sprite = scene.add.image(0, this.y, 'core-1').setDepth(35);
    layer.add([this.shadow, this.streak, this.glow, this.sprite]);
    this.setForm(0);
  }

  get radius(): number {
    return L.coreSize / 2;
  }

  setForm(form: number): void {
    const f = CORE_FORMS[Math.min(form, CORE_FORMS.length - 1)]!;
    if (form === this.form) return;
    this.form = form;
    this.sprite.setTexture(f.texture).setOrigin(f.originX, 0.5);
    this.sprite.setScale(L.coreSize / f.sphere);
  }

  /** Flash when absorbing energy (BOOST). */
  pulse(color: number = COLORS.energy): void {
    this.glow.setTint(color);
    this.scene.tweens.add({
      targets: this.glow,
      scale: { from: 4.2, to: 2.2 },
      alpha: { from: 0.95, to: 0.4 },
      duration: 320,
      ease: 'Quad.out',
      onComplete: () => this.glow.setTint(COLORS.energy),
    });
  }

  update(dt: number, running: boolean, speed: number, trail: ParticlePool): void {
    this.bobTime += dt;
    const bob = running ? 0 : Math.sin(this.bobTime * 2.4) * 4;
    this.squash = Math.max(0, this.squash - dt * 6);
    this.surge = Math.max(0, this.surge - dt);
    const x = this.x + this.offsetX;
    const baseScale = L.coreSize / CORE_FORMS[this.form]!.sphere;
    this.sprite.setPosition(x, this.y + bob);
    this.sprite.setScale(baseScale * (1 - this.squash * 0.18), baseScale * (1 + this.squash * 0.14));
    this.sprite.rotation = running ? Math.sin(this.bobTime * 30) * 0.015 * this.intensity : 0;
    this.glow.setPosition(x + 10, this.y + bob);
    if (!this.scene.tweens.isTweening(this.glow)) {
      const target = 1.6 + this.intensity * 0.35;
      this.glow.setScale(target + Math.sin(this.bobTime * 5) * 0.08);
      this.glow.setAlpha(0.25 + this.intensity * 0.08);
    }
    this.shadow.setPosition(x, L.floorY + 2).setDisplaySize(L.coreSize * 1.3, 18);

    // Speed streak: only once the core is really moving; strongest in RUSH.
    const streakAlpha = running ? Math.min(1, Math.max(0, (this.intensity - 1) * 0.45 + this.surge)) : 0;
    this.streak.setPosition(x - this.radius * 0.6, this.y);
    this.streak.alpha += (streakAlpha - this.streak.alpha) * Math.min(1, dt * 12);
    this.streak.setScale(0.55 + this.intensity * 0.18, 0.7 + this.intensity * 0.08);

    // Afterimages + thruster embers.
    if (running && speed > 0) {
      this.trailTimer -= dt;
      const interval = this.intensity >= 3 ? 0.016 : this.intensity >= 2 ? 0.03 : 0.05;
      if (this.trailTimer <= 0) {
        this.trailTimer = interval;
        trail.spawn({
          texture: this.sprite.texture.key,
          x,
          y: this.y,
          vx: 0,
          vy: 0,
          life: this.intensity >= 3 ? 0.2 : 0.12,
          scale: baseScale,
          endScale: baseScale * 0.92,
          alpha: 0.18 + this.intensity * 0.07,
          tint: COLORS.energy,
          additive: true,
          fadeFrom: 0,
        });
        trail.spawn({
          texture: 'puff',
          x: x - this.radius * 0.9,
          y: this.y + Phaser.Math.Between(-8, 8),
          vx: -speed * 0.15 - 60,
          vy: Phaser.Math.Between(-30, 30),
          life: 0.22,
          scale: 0.5,
          endScale: 0.1,
          alpha: 0.7,
          tint: 0x9fdcff,
          additive: true,
          fadeFrom: 0.2,
        });
      }
    }
  }
}
