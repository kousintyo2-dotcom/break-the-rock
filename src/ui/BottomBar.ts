import Phaser from 'phaser';
import { FEEL } from '../config/feel.ts';
import { Button } from './Button.ts';
import { COLORS, TEXT, textStyle } from './theme.ts';

const { width: W, height: H } = FEEL.view;
const TOP = FEEL.layout.fieldBottom + FEEL.view.extra;

/** Ground strip with the big BREAK button, the next-run estimate and the settings gear. */
export class BottomBar {
  readonly root: Phaser.GameObjects.Container;
  readonly breakButton: Button;
  private readonly estimate: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly scene: Phaser.Scene;
  private pulse: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, onBreak: () => void, onSettings: () => void) {
    this.scene = scene;
    const ground = scene.add.graphics();
    ground.fillGradientStyle(COLORS.ground, COLORS.ground, COLORS.ground, COLORS.ground, 0, 0, 1, 1);
    ground.fillRect(0, TOP - 70, W, 70);
    ground.fillStyle(COLORS.ground, 1);
    ground.fillRect(0, TOP, W, H - TOP);
    ground.fillStyle(COLORS.groundEdge, 1);
    ground.fillRect(0, TOP, W, 3);

    this.estimate = scene.add.text(W / 2, TOP + 44, '', textStyle(24, TEXT.muted, '800')).setOrigin(0.5).setLetterSpacing(2);
    this.hint = scene.add.text(W / 2, H - 58, '', textStyle(20, TEXT.dim, '700')).setOrigin(0.5);
    this.breakButton = new Button(scene, W / 2, TOP + 196, {
      width: 540,
      height: 170,
      label: 'BREAK',
      fontSize: 74,
      onTap: onBreak,
    });
    const gear = this.makeGear(onSettings);
    this.root = scene.add.container(0, 0, [ground, this.estimate, this.hint, this.breakButton, gear]).setDepth(150);
  }

  private makeGear(onTap: () => void): Phaser.GameObjects.Container {
    const g = this.scene.add.graphics();
    g.fillStyle(COLORS.panelLight, 1);
    g.fillCircle(0, 0, 30);
    g.lineStyle(3, 0xa99c89, 1);
    g.strokeCircle(0, 0, 11);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineBetween(Math.cos(a) * 13, Math.sin(a) * 13, Math.cos(a) * 19, Math.sin(a) * 19);
    }
    const c = this.scene.add.container(W - 52, TOP + 44, [g]).setSize(64, 64);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerup', onTap);
    return c;
  }

  setEstimate(low: number, high: number): void {
    this.estimate.setText(low === high ? `EST. ${low} WALLS` : `EST. ${low}–${high} WALLS`);
  }

  setHint(text: string): void {
    this.hint.setText(text);
  }

  /** Visible and pulsing while waiting for the first tap. */
  setReady(ready: boolean): void {
    this.breakButton.setEnabled(ready);
    this.pulse?.stop();
    this.pulse = null;
    this.breakButton.setScale(1);
    if (ready) {
      this.pulse = this.scene.tweens.add({ targets: this.breakButton, scale: 1.03, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }
}
