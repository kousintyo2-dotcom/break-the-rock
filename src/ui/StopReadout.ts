import type Phaser from 'phaser';
import { FEEL } from '../config/feel.ts';
import { COLORS, TEXT, textStyle } from './theme.ts';

const W = FEEL.view.width;
const Y = 272 + FEEL.view.extra;

/** "WALL 47 / 87% / 13% TO BREAK" — shown when the core gets stuck. Never says FAILED. */
export class StopReadout {
  readonly root: Phaser.GameObjects.Container;
  private readonly wall: Phaser.GameObjects.Text;
  private readonly percent: Phaser.GameObjects.Text;
  private readonly toBreak: Phaser.GameObjects.Text;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const bg = scene.add.graphics();
    bg.fillStyle(0x0d0b09, 0.62);
    bg.fillRoundedRect(-190, -92, 380, 222, 26);
    this.wall = scene.add.text(0, -62, '', textStyle(26, TEXT.muted, '900')).setOrigin(0.5).setLetterSpacing(4);
    this.percent = scene.add.text(0, 8, '', textStyle(100, TEXT.main, '900')).setOrigin(0.5);
    this.bar = scene.add.graphics();
    this.toBreak = scene.add.text(0, 100, '', textStyle(30, TEXT.amber, '900')).setOrigin(0.5).setLetterSpacing(1);
    this.root = scene.add.container(W / 2, Y, [bg, this.wall, this.percent, this.bar, this.toBreak]).setDepth(120).setVisible(false);
  }

  show(wall: number, damage: number): void {
    const pct = Math.min(99, Math.max(1, Math.round(damage * 100)));
    this.wall.setText(`WALL ${wall}`);
    this.percent.setText(`${pct}%`);
    this.toBreak.setText(`${100 - pct}% TO BREAK`);
    this.bar.clear();
    this.bar.fillStyle(COLORS.stoneDark, 1);
    this.bar.fillRoundedRect(-150, 64, 300, 10, 5);
    this.bar.fillStyle(COLORS.amber, 1);
    this.bar.fillRoundedRect(-150, 64, Math.max(10, 300 * (pct / 100)), 10, 5);
    this.root.setVisible(true).setAlpha(0).setScale(1.25);
    this.scene.tweens.add({ targets: this.root, alpha: 1, scale: 1, duration: 200, ease: 'Back.out' });
  }

  /** Raise the readout above the result panel. */
  settle(): void {
    this.scene.tweens.add({ targets: this.root, y: Y, scale: 0.9, duration: 220, ease: 'Quad.out' });
  }

  hide(): void {
    this.scene.tweens.killTweensOf(this.root);
    this.root.setVisible(false).setY(Y);
  }
}
