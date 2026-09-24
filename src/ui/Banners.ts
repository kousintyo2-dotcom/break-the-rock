import type Phaser from 'phaser';
import { FEEL } from '../config/feel.ts';
import { TEXT, textStyle } from './theme.ts';

const W = FEEL.view.width;

/** Short in-run callouts: combo counter, BREAK RUSH, NEW BEST. They never pause the game. */
export class Banners {
  private readonly combo: Phaser.GameObjects.Text;
  private readonly rush: Phaser.GameObjects.Text;
  private readonly bestTitle: Phaser.GameObjects.Text;
  private readonly bestValue: Phaser.GameObjects.Text;
  private readonly best: Phaser.GameObjects.Container;
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.combo = scene.add.text(W / 2, 222, '', textStyle(34, TEXT.main, '900')).setOrigin(0.5).setAlpha(0).setLetterSpacing(2);
    this.rush = scene.add.text(W / 2, 270, 'BREAK RUSH', textStyle(44, TEXT.amber, '900')).setOrigin(0.5).setAlpha(0).setLetterSpacing(4);
    this.rush.setShadow(0, 3, '#000000', 6, false, true);
    this.bestTitle = scene.add.text(0, -34, 'NEW BEST', textStyle(34, TEXT.amber, '900')).setOrigin(0.5).setLetterSpacing(6);
    this.bestValue = scene.add.text(0, 30, '', textStyle(84, TEXT.main, '900')).setOrigin(0.5);
    this.bestTitle.setShadow(0, 3, '#000000', 6, false, true);
    this.bestValue.setShadow(0, 4, '#000000', 8, false, true);
    this.best = scene.add.container(W / 2, 360, [this.bestTitle, this.bestValue]).setAlpha(0);
    this.root = scene.add.container(0, FEEL.view.extra, [this.combo, this.rush, this.best]).setDepth(130);
  }

  setCombo(count: number, rushLevel: number, comboStart: number): void {
    if (count < comboStart) {
      this.combo.setAlpha(0);
      return;
    }
    this.combo.setText(`${count} BREAK`);
    this.combo.setColor(rushLevel > 0 ? TEXT.amber : TEXT.main);
    this.combo.setAlpha(1);
    this.scene.tweens.killTweensOf(this.combo);
    this.combo.setScale(rushLevel > 0 ? 1.28 : 1.18);
    this.scene.tweens.add({ targets: this.combo, scale: 1, duration: 120, ease: 'Quad.out' });
  }

  showRush(): void {
    this.scene.tweens.killTweensOf(this.rush);
    this.rush.setAlpha(1).setScale(1.6).setX(W / 2 + 60);
    this.scene.tweens.add({ targets: this.rush, scale: 1, x: W / 2, duration: 180, ease: 'Back.out' });
    this.scene.tweens.add({ targets: this.rush, alpha: 0, delay: 900, duration: 300 });
  }

  showNewBest(value: number): void {
    this.bestValue.setText(`${value}`);
    this.scene.tweens.killTweensOf(this.best);
    this.best.setAlpha(1).setScale(1.5);
    this.scene.tweens.add({ targets: this.best, scale: 1, duration: 160, ease: 'Back.out' });
    this.scene.tweens.add({ targets: this.best, alpha: 0, delay: FEEL.record.bannerMs, duration: 260 });
  }

  clear(): void {
    for (const o of [this.combo, this.rush, this.best]) {
      this.scene.tweens.killTweensOf(o);
      o.setAlpha(0);
    }
  }
}
