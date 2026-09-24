import Phaser from 'phaser';
import { FEEL } from '../config/feel.ts';
import type { SaveData } from '../save/saveData.ts';
import type { RunResult } from '../systems/runSimulator.ts';
import { STAT_IDS, type StatId } from '../systems/stats.ts';
import { STAT_HINT, statPreview, upgradeCost } from '../systems/upgrades.ts';
import { formatNumber } from '../utils/format.ts';
import { Button, drawPanel } from './Button.ts';
import { COLORS, TEXT, textStyle } from './theme.ts';

const { width: W, height: H } = FEEL.view;
export const PANEL_Y = 740 + FEEL.view.extra;
const ROW_Y = 222;
const ROW_H = 82;

interface Row {
  stat: StatId;
  bg: Phaser.GameObjects.Graphics;
  name: Phaser.GameObjects.Text;
  level: Phaser.GameObjects.Text;
  value: Phaser.GameObjects.Text;
  button: Button;
}

export interface Estimate {
  low: number;
  high: number;
}

const estText = (e: Estimate) => (e.low === e.high ? `${e.low}` : `${e.low}–${e.high}`);

/** Slides up over the stopped wall: run summary, three upgrades, BREAK AGAIN. */
export class ResultPanel {
  readonly root: Phaser.GameObjects.Container;
  private readonly walls: Phaser.GameObjects.Text;
  private readonly earned: Phaser.GameObjects.Text;
  private readonly bonus: Phaser.GameObjects.Text;
  private readonly total: Phaser.GameObjects.Text;
  private readonly estimate: Phaser.GameObjects.Text;
  private readonly rows: Row[] = [];
  private readonly scene: Phaser.Scene;
  private estTimer: Phaser.Time.TimerEvent | null = null;
  visible = false;

  constructor(scene: Phaser.Scene, onBuy: (stat: StatId) => void, onBreakAgain: () => void) {
    this.scene = scene;
    const bg = scene.add.graphics();
    drawPanel(bg, 10, 0, W - 20, H - PANEL_Y + 40, 28, 0.97);
    // Grab handle hint.
    bg.fillStyle(COLORS.panelBorder, 1);
    bg.fillRoundedRect(W / 2 - 34, 10, 68, 5, 3);
    const label = (x: number, y: number, text: string, originX: number) =>
      scene.add.text(x, y, text, textStyle(17, TEXT.muted, '800')).setOrigin(originX, 0).setLetterSpacing(3);
    const brokeLabel = label(40, 26, 'THIS RUN', 0);
    const earnedLabel = label(W - 40, 26, 'EARNED', 1);
    this.walls = scene.add.text(38, 46, '', textStyle(46, TEXT.main, '900'));
    this.earned = scene.add.text(W - 38, 46, '', textStyle(46, TEXT.gold, '900')).setOrigin(1, 0);
    this.bonus = scene.add.text(40, 108, '', textStyle(20, TEXT.amber, '800'));
    this.total = scene.add.text(W - 40, 108, '', textStyle(20, TEXT.muted, '800')).setOrigin(1, 0);
    const divider = scene.add.rectangle(W / 2, 144, W - 80, 2, COLORS.panelBorder, 1);
    this.estimate = scene.add.text(W / 2, 162, '', textStyle(24, TEXT.energy, '800')).setOrigin(0.5, 0).setLetterSpacing(1);
    const children: Phaser.GameObjects.GameObject[] = [bg, brokeLabel, earnedLabel, this.walls, this.earned, this.bonus, this.total, divider, this.estimate];

    STAT_IDS.forEach((stat, i) => {
      const y = ROW_Y + i * ROW_H;
      const rowBg = scene.add.graphics();
      const name = scene.add.text(40, y - 26, stat.toUpperCase(), textStyle(26, TEXT.main, '900')).setLetterSpacing(2);
      const level = scene.add.text(40, y + 8, '', textStyle(17, TEXT.muted, '700'));
      const value = scene.add.text(398, y, '', textStyle(26, TEXT.main, '800')).setOrigin(0.5);
      const button = new Button(scene, W - 124, y, {
        width: 188,
        height: 68,
        label: '',
        sublabel: 'SCRAP',
        fontSize: 28,
        variant: 'primary',
        onTap: () => onBuy(stat),
      });
      this.rows.push({ stat, bg: rowBg, name, level, value, button });
      children.push(rowBg, name, level, value, button);
    });

    const again = new Button(scene, W / 2, 486, { width: 640, height: 100, label: 'BREAK AGAIN', fontSize: 44, onTap: onBreakAgain });
    children.push(again);
    this.root = scene.add.container(0, H, children).setDepth(200).setVisible(false);
  }

  show(result: RunResult, save: SaveData, est: Estimate): void {
    this.visible = true;
    this.root.setVisible(true).setY(H);
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({ targets: this.root, y: PANEL_Y, duration: 260, ease: 'Back.out', easeParams: [0.8] });
    const counter = { walls: 0, scrap: 0 };
    this.scene.tweens.add({
      targets: counter,
      walls: result.wallsBroken,
      scrap: result.scrapFromWalls,
      duration: 380,
      delay: 120,
      ease: 'Quad.out',
      onUpdate: () => {
        this.walls.setText(`${Math.round(counter.walls)} WALLS`);
        this.earned.setText(`+${formatNumber(Math.round(counter.scrap))}`);
      },
    });
    this.walls.setText('0 WALLS');
    this.earned.setText('+0');
    this.bonus.setText(result.recordBonus > 0 ? `NEW RECORD BONUS +${formatNumber(result.recordBonus)}` : '');
    this.estimate.setText(`NEXT EST. ${estText(est)} WALLS`).setColor(TEXT.energy);
    this.refresh(save);
  }

  refresh(save: SaveData): void {
    this.total.setText(`SCRAP ${formatNumber(save.scrap)}`);
    for (const row of this.rows) {
      const preview = statPreview(row.stat, save.levels);
      const cost = upgradeCost(row.stat, save.levels[row.stat]);
      row.level.setText(`Lv.${save.levels[row.stat]} · ${STAT_HINT[row.stat]}`);
      row.value.setText(`${preview.current}  →  ${preview.next}`);
      row.button.label.setText(formatNumber(cost));
      const affordable = save.scrap >= cost;
      row.button.setVariant(affordable ? 'primary' : 'secondary');
      row.button.setAlpha(affordable ? 1 : 0.55);
    }
  }

  /** After a purchase: pop the row, show the value jump and the new estimate. */
  celebrate(stat: StatId, before: string, after: string, estBefore: Estimate, estAfter: Estimate): void {
    const row = this.rows.find((r) => r.stat === stat);
    if (!row) return;
    const y = ROW_Y + STAT_IDS.indexOf(stat) * ROW_H;
    row.bg.clear();
    row.bg.fillStyle(COLORS.positive, 0.22);
    row.bg.fillRoundedRect(24, y - 38, W - 48, 76, 14);
    row.bg.setAlpha(1);
    this.scene.tweens.killTweensOf(row.bg);
    this.scene.tweens.add({ targets: row.bg, alpha: 0, duration: 650, ease: 'Quad.in' });

    row.value.setText(`${before}  →  ${after}`).setColor(TEXT.positive);
    this.scene.tweens.killTweensOf(row.value);
    row.value.setScale(1.25);
    this.scene.tweens.add({ targets: row.value, scale: 1, duration: 260, ease: 'Back.out' });
    const beforeNum = Number(before.replace('%', ''));
    const afterNum = Number(after.replace('%', ''));
    const suffix = after.endsWith('%') ? '%' : '';
    if (Number.isFinite(beforeNum) && Number.isFinite(afterNum)) {
      const c = { v: beforeNum };
      this.scene.tweens.add({
        targets: c,
        v: afterNum,
        duration: 320,
        ease: 'Quad.out',
        onUpdate: () => row.value.setText(`${Math.round(c.v)}${suffix}`),
        onComplete: () => row.value.setText(`${after}`),
      });
    }
    this.scene.time.delayedCall(650, () => {
      row.value.setColor(TEXT.main);
      this.refresh(this.lastSave!);
    });

    const grew = estAfter.low > estBefore.low || estAfter.high > estBefore.high;
    this.estimate
      .setText(grew ? `EST. ${estText(estBefore)}  →  ${estText(estAfter)} WALLS` : `NEXT EST. ${estText(estAfter)} WALLS`)
      .setColor(grew ? TEXT.positive : TEXT.energy);
    if (grew) {
      this.scene.tweens.killTweensOf(this.estimate);
      this.estimate.setScale(1.15);
      this.scene.tweens.add({ targets: this.estimate, scale: 1, duration: 280, ease: 'Back.out' });
    }
    this.estTimer?.remove();
    this.estTimer = this.scene.time.delayedCall(1600, () => this.estimate.setText(`NEXT EST. ${estText(estAfter)} WALLS`).setColor(TEXT.energy));
  }

  /** Save reference used by delayed refreshes. */
  lastSave: SaveData | null = null;

  shake(stat: StatId): void {
    const row = this.rows.find((r) => r.stat === stat);
    if (!row) return;
    const x = row.button.x;
    this.scene.tweens.add({ targets: row.button, x: x + 8, duration: 40, yoyo: true, repeat: 2, onComplete: () => row.button.setX(x) });
  }

  hide(onDone?: () => void): void {
    if (!this.visible) {
      onDone?.();
      return;
    }
    this.visible = false;
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({
      targets: this.root,
      y: H,
      duration: 170,
      ease: 'Quad.in',
      onComplete: () => {
        this.root.setVisible(false);
        onDone?.();
      },
    });
  }
}
