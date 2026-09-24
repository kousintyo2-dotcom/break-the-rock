import Phaser from 'phaser';
import { FEEL } from '../config/feel.ts';
import { specialById, type SpecialId } from '../data/specials.ts';
import { formatNumber } from '../utils/format.ts';
import { drawSpecialIcon } from './specialIcons.ts';
import { COLORS, TEXT, textStyle } from './theme.ts';

const W = FEEL.view.width;

/** Top bar: WALL / BEST / SCRAP, with POWER and its in-run gauge underneath. */
export class Hud {
  readonly root: Phaser.GameObjects.Container;
  private readonly wall: Phaser.GameObjects.Text;
  private readonly best: Phaser.GameObjects.Text;
  private readonly bestLabel: Phaser.GameObjects.Text;
  private readonly scrap: Phaser.GameObjects.Text;
  private readonly power: Phaser.GameObjects.Text;
  private readonly gauge: Phaser.GameObjects.Graphics;
  private readonly icons: Phaser.GameObjects.Graphics;
  private gaugeValue = 1;
  private gaugeTarget = 1;
  private gaugeGain = 0;
  private scrapShown = 0;
  private scrapTarget = 0;
  private bestHot = false;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const bg = scene.add.graphics();
    bg.fillGradientStyle(0x0d0b09, 0x0d0b09, 0x0d0b09, 0x0d0b09, 0.85, 0.85, 0, 0);
    bg.fillRect(0, 0, W, 190);
    const label = (x: number, text: string, originX: number) =>
      scene.add.text(x, 34, text, textStyle(18, TEXT.muted, '800')).setOrigin(originX, 0).setLetterSpacing(3);
    const wallLabel = label(32, 'WALL', 0);
    this.bestLabel = label(W / 2, 'BEST', 0.5);
    const scrapLabel = label(W - 32, 'SCRAP', 1);
    this.wall = scene.add.text(30, 56, '0', textStyle(50, TEXT.main, '900')).setOrigin(0, 0);
    this.best = scene.add.text(W / 2, 56, '0', textStyle(50, TEXT.main, '900')).setOrigin(0.5, 0);
    this.scrap = scene.add.text(W - 30, 56, '0', textStyle(50, TEXT.gold, '900')).setOrigin(1, 0);
    this.power = scene.add.text(W / 2, 126, 'POWER 12', textStyle(20, TEXT.energy, '800')).setOrigin(0.5, 0).setLetterSpacing(2);
    this.gauge = scene.add.graphics();
    this.icons = scene.add.graphics();
    this.root = scene.add.container(0, 0, [bg, wallLabel, this.bestLabel, scrapLabel, this.wall, this.best, this.scrap, this.power, this.gauge, this.icons]);
    this.root.setDepth(100);
  }

  setWall(n: number): void {
    this.wall.setText(`${n}`);
  }

  setBest(n: number, pulse = false): void {
    this.best.setText(`${n}`);
    if (pulse) this.pop(this.best, 1.35);
  }

  /** Highlight BEST when the run is closing in on the record. */
  setBestHot(hot: boolean): void {
    if (hot === this.bestHot) return;
    this.bestHot = hot;
    this.best.setColor(hot ? TEXT.amber : TEXT.main);
    this.bestLabel.setColor(hot ? TEXT.amber : TEXT.muted);
    if (hot) this.pop(this.best, 1.15);
  }

  setScrap(n: number, instant = false): void {
    this.scrapTarget = n;
    if (instant) this.scrapShown = n;
    this.scrap.setText(formatNumber(this.scrapShown, true));
  }

  bumpScrap(): void {
    this.pop(this.scrap, 1.12);
  }

  setPower(power: number): void {
    this.power.setText(`POWER ${formatNumber(power, true)}`);
  }

  /** Remaining power share during a run (1 = full). */
  setGauge(fraction: number, instant = false): void {
    const f = Phaser.Math.Clamp(fraction, 0, 1.6);
    if (f > this.gaugeTarget + 0.01) this.gaugeGain = 1;
    this.gaugeTarget = f;
    if (instant) this.gaugeValue = f;
  }

  setSpecials(ids: readonly SpecialId[]): void {
    const g = this.icons;
    g.clear();
    const size = 20;
    const startX = W / 2 - ((ids.length - 1) * (size + 10)) / 2;
    ids.forEach((id, i) => {
      g.save();
      g.translateCanvas(startX + i * (size + 10), 176);
      drawSpecialIcon(g, id, size, specialById(id).color);
      g.restore();
    });
  }

  private pop(target: Phaser.GameObjects.Text, scale: number): void {
    this.scene.tweens.killTweensOf(target);
    target.setScale(scale);
    this.scene.tweens.add({ targets: target, scale: 1, duration: 260, ease: 'Back.out' });
  }

  update(dt: number): void {
    this.gaugeValue += (this.gaugeTarget - this.gaugeValue) * Math.min(1, dt * 14);
    this.gaugeGain = Math.max(0, this.gaugeGain - dt * 2.5);
    if (this.scrapShown !== this.scrapTarget) {
      const diff = this.scrapTarget - this.scrapShown;
      this.scrapShown += Math.abs(diff) < 2 ? diff : diff * Math.min(1, dt * 10);
      this.scrap.setText(formatNumber(Math.round(this.scrapShown), true));
    }
    const g = this.gauge;
    const w = 260;
    const x = W / 2 - w / 2;
    const y = 156;
    g.clear();
    g.fillStyle(COLORS.stoneDark, 0.9);
    g.fillRoundedRect(x, y, w, 8, 4);
    const v = Math.min(1, this.gaugeValue);
    if (v > 0.005) {
      const low = v < 0.25;
      g.fillStyle(low ? COLORS.amber : COLORS.energy, 1);
      g.fillRoundedRect(x, y, Math.max(8, w * v), 8, 4);
    }
    if (this.gaugeGain > 0) {
      g.fillStyle(0xffffff, this.gaugeGain * 0.7);
      g.fillRoundedRect(x, y, w * v, 8, 4);
    }
  }
}
