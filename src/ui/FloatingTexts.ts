import type Phaser from 'phaser';
import { textStyle } from './theme.ts';

interface Floater {
  text: Phaser.GameObjects.Text;
  age: number;
  life: number;
  vy: number;
  active: boolean;
}

/** Pooled world-space popups (+SCRAP, CRITICAL, BOOST). */
export class FloatingTexts {
  private readonly items: Floater[] = [];

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, size = 14) {
    for (let i = 0; i < size; i++) {
      const text = scene.add.text(0, 0, '', textStyle(28)).setOrigin(0.5).setDepth(60).setVisible(false);
      text.setShadow(0, 2, '#000000', 4, false, true);
      layer.add(text);
      this.items.push({ text, age: 0, life: 1, vy: 0, active: false });
    }
  }

  spawn(message: string, x: number, y: number, color: string, size = 28, life = 0.7): void {
    const f = this.items.find((i) => !i.active) ?? this.items[0]!;
    f.active = true;
    f.age = 0;
    f.life = life;
    f.vy = -110;
    f.text.setText(message).setColor(color).setFontSize(size).setPosition(x, y).setVisible(true).setAlpha(1).setScale(1.3);
  }

  update(dt: number): void {
    for (const f of this.items) {
      if (!f.active) continue;
      f.age += dt;
      const t = f.age / f.life;
      if (t >= 1) {
        f.active = false;
        f.text.setVisible(false);
        continue;
      }
      f.text.y += f.vy * dt;
      f.vy *= 0.92;
      f.text.setScale(1 + 0.3 * Math.max(0, 1 - t * 6));
      f.text.setAlpha(t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4);
    }
  }

  clear(): void {
    for (const f of this.items) {
      f.active = false;
      f.text.setVisible(false);
    }
  }
}
