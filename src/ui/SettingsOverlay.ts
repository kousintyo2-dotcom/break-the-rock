import Phaser from 'phaser';
import { FEEL } from '../config/feel.ts';
import type { Settings } from '../save/saveData.ts';
import { Button, drawPanel } from './Button.ts';
import { TEXT, textStyle } from './theme.ts';

const { width: W, height: H } = FEEL.view;

type Choice = { label: string; value: number };
const LEVELS: Choice[] = [
  { label: 'OFF', value: 0 },
  { label: 'LOW', value: 0.5 },
  { label: 'FULL', value: 1 },
];

/** Vibration, shake, flash and volume. Includes a (deliberately tucked away) RESET SAVE. */
export class SettingsOverlay {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private settings: Settings;
  private readonly refreshers: (() => void)[] = [];
  private resetArmed = false;
  private readonly resetButton: Button;
  visible = false;

  constructor(scene: Phaser.Scene, settings: Settings, onChange: (s: Settings) => void, onReset: () => void) {
    this.scene = scene;
    this.settings = settings;
    const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setInteractive();
    dim.on('pointerup', () => this.hide());
    const panelH = 780;
    const top = (H - panelH) / 2;
    const bg = scene.add.graphics();
    drawPanel(bg, 40, top, W - 80, panelH, 28, 1);
    const blocker = scene.add.rectangle(W / 2, H / 2, W - 80, panelH, 0, 0).setInteractive();
    const title = scene.add.text(W / 2, top + 50, 'SETTINGS', textStyle(32, TEXT.main, '900')).setOrigin(0.5).setLetterSpacing(4);
    const children: Phaser.GameObjects.GameObject[] = [dim, bg, blocker, title];
    let y = top + 130;
    const rowLabel = (text: string) => scene.add.text(76, y, text, textStyle(22, TEXT.muted, '800')).setOrigin(0, 0.5).setLetterSpacing(2);

    // Vibration toggle.
    {
      children.push(rowLabel('VIBRATION'));
      const btn = new Button(scene, W - 170, y, { width: 150, height: 60, label: '', fontSize: 24, variant: 'secondary', onTap: () => {
        this.settings.vibration = !this.settings.vibration;
        onChange(this.settings);
        refresh();
      } });
      const refresh = () => {
        btn.label.setText(this.settings.vibration ? 'ON' : 'OFF');
        btn.setVariant(this.settings.vibration ? 'primary' : 'secondary');
      };
      this.refreshers.push(refresh);
      children.push(btn);
      y += 100;
    }

    const segmented = (label: string, key: 'shake' | 'flash') => {
      children.push(rowLabel(label));
      const buttons = LEVELS.map((choice, i) => {
        const b = new Button(scene, W - 330 + i * 116, y, { width: 104, height: 60, label: choice.label, fontSize: 21, variant: 'secondary', onTap: () => {
          this.settings[key] = choice.value;
          onChange(this.settings);
          refresh();
        } });
        children.push(b);
        return b;
      });
      const refresh = () => {
        const current = LEVELS.reduce((best, c) => (Math.abs(c.value - this.settings[key]) < Math.abs(best.value - this.settings[key]) ? c : best));
        buttons.forEach((b, i) => b.setVariant(LEVELS[i] === current ? 'primary' : 'secondary'));
      };
      this.refreshers.push(refresh);
      y += 100;
    };
    segmented('SCREEN SHAKE', 'shake');
    segmented('FLASH', 'flash');

    const volume = (label: string, key: 'sfx' | 'bgm') => {
      children.push(rowLabel(label));
      const value = scene.add.text(W - 214, y, '', textStyle(26, TEXT.main, '900')).setOrigin(0.5);
      const step = (d: number) => {
        this.settings[key] = Math.round(Phaser.Math.Clamp(this.settings[key] + d, 0, 1) * 10) / 10;
        onChange(this.settings);
        refresh();
      };
      const minus = new Button(scene, W - 330, y, { width: 72, height: 60, label: '−', fontSize: 32, variant: 'secondary', onTap: () => step(-0.2) });
      const plus = new Button(scene, W - 98, y, { width: 72, height: 60, label: '+', fontSize: 32, variant: 'secondary', onTap: () => step(0.2) });
      const refresh = () => value.setText(`${Math.round(this.settings[key] * 100)}%`);
      this.refreshers.push(refresh);
      children.push(value, minus, plus);
      y += 100;
    };
    volume('SE', 'sfx');
    volume('BGM / RUSH', 'bgm');

    const close = new Button(scene, W / 2, top + panelH - 150, { width: 400, height: 84, label: 'CLOSE', fontSize: 32, onTap: () => this.hide() });
    this.resetButton = new Button(scene, W / 2, top + panelH - 56, { width: 260, height: 52, label: 'RESET SAVE', fontSize: 18, variant: 'ghost', onTap: () => {
      if (!this.resetArmed) {
        this.resetArmed = true;
        this.resetButton.label.setText('TAP AGAIN TO RESET');
        scene.time.delayedCall(2500, () => this.disarm());
        return;
      }
      this.disarm();
      onReset();
      this.hide();
    } });
    children.push(close, this.resetButton);
    this.root = scene.add.container(0, 0, children).setDepth(400).setVisible(false);
  }

  private disarm(): void {
    this.resetArmed = false;
    this.resetButton.label.setText('RESET SAVE');
  }

  show(settings: Settings): void {
    this.settings = settings;
    this.refreshers.forEach((r) => r());
    this.visible = true;
    this.root.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.root, alpha: 1, duration: 140 });
  }

  hide(): void {
    this.visible = false;
    this.disarm();
    this.scene.tweens.add({ targets: this.root, alpha: 0, duration: 120, onComplete: () => this.root.setVisible(false) });
  }
}
