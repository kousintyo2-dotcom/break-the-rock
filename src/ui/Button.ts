import Phaser from 'phaser';
import { COLORS, TEXT, textStyle } from './theme.ts';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonOptions {
  width: number;
  height: number;
  label: string;
  fontSize?: number;
  variant?: ButtonVariant;
  sublabel?: string;
  onTap: () => void;
}

const PALETTE: Record<ButtonVariant, { top: number; bottom: number; lip: number; text: string; border: number }> = {
  primary: { top: 0xe39a3b, bottom: 0xc7731f, lip: 0x7b420e, text: '#fff8ec', border: 0xf6c27a },
  secondary: { top: 0x4a4238, bottom: 0x3a332b, lip: 0x1f1b16, text: TEXT.main, border: 0x6a5d4d },
  ghost: { top: 0x2a251f, bottom: 0x25211b, lip: 0x15120f, text: TEXT.muted, border: 0x433a30 },
};

/** Chunky, tactile button drawn with Graphics (no HTML buttons). */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  readonly label: Phaser.GameObjects.Text;
  readonly sublabel: Phaser.GameObjects.Text | null;
  private variant: ButtonVariant;
  private enabledState = true;
  private readonly bw: number;
  private readonly bh: number;
  private pressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, options: ButtonOptions) {
    super(scene, x, y);
    this.bw = options.width;
    this.bh = options.height;
    this.variant = options.variant ?? 'primary';
    this.bg = scene.add.graphics();
    const size = options.fontSize ?? Math.round(options.height * 0.36);
    this.label = scene.add.text(0, options.sublabel ? -size * 0.32 : -3, options.label, textStyle(size, PALETTE[this.variant].text, '900')).setOrigin(0.5);
    this.label.setLetterSpacing(Math.round(size * 0.06));
    this.sublabel = options.sublabel
      ? scene.add.text(0, size * 0.5, options.sublabel, textStyle(Math.round(size * 0.48), PALETTE[this.variant].text, '700')).setOrigin(0.5).setAlpha(0.85)
      : null;
    this.add([this.bg, this.label]);
    if (this.sublabel) this.add(this.sublabel);
    this.draw();
    this.setSize(this.bw, this.bh);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      if (!this.enabledState) return;
      this.pressed = true;
      this.setScale(0.96);
      this.draw(true);
    });
    const release = (fire: boolean) => {
      if (!this.pressed) return;
      this.pressed = false;
      this.setScale(1);
      this.draw();
      if (fire && this.enabledState) options.onTap();
    };
    this.on('pointerup', () => release(true));
    this.on('pointerout', () => release(false));
    scene.add.existing(this);
  }

  setVariant(variant: ButtonVariant): this {
    this.variant = variant;
    this.label.setColor(PALETTE[variant].text);
    this.sublabel?.setColor(PALETTE[variant].text);
    this.draw();
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.enabledState = enabled;
    this.setAlpha(enabled ? 1 : 0.6);
    return this;
  }

  get enabled(): boolean {
    return this.enabledState;
  }

  private draw(pressed = false): void {
    const p = PALETTE[this.variant];
    const g = this.bg;
    const w = this.bw;
    const h = this.bh;
    const r = Math.min(18, h * 0.28);
    const lip = pressed ? 2 : Math.max(4, Math.round(h * 0.07));
    g.clear();
    g.fillStyle(COLORS.shadow, 0.35);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 6, w, h, r);
    g.fillStyle(p.lip, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.fillStyle(p.bottom, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h - lip, r);
    g.fillStyle(p.top, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, (h - lip) * 0.55, { tl: r, tr: r, bl: 0, br: 0 });
    g.lineStyle(2, p.border, 0.55);
    g.strokeRoundedRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - lip - 2, r);
    this.label.y = (this.sublabel ? -this.bh * 0.12 : -3) + (pressed ? 3 : 0) - lip / 2 + 3;
    if (this.sublabel) this.sublabel.y = this.bh * 0.2 + (pressed ? 3 : 0) - lip / 2 + 3;
  }
}

/** Rounded panel background. */
export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, radius = 22, alpha = 0.96): void {
  g.fillStyle(COLORS.shadow, 0.4);
  g.fillRoundedRect(x, y + 6, w, h, radius);
  g.fillStyle(COLORS.panel, alpha);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(2, COLORS.panelBorder, 0.9);
  g.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, radius);
}
