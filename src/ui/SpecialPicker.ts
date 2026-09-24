import Phaser from 'phaser';
import { FEEL } from '../config/feel.ts';
import { specialById, type SpecialId } from '../data/specials.ts';
import { drawPanel } from './Button.ts';
import { drawSpecialIcon } from './specialIcons.ts';
import { COLORS, TEXT, textStyle } from './theme.ts';

const { width: W, height: H } = FEEL.view;
const CARD_W = 212;
const CARD_H = 330;

/** Three special-upgrade cards. Pick one; the others vanish and play resumes immediately. */
export class SpecialPicker {
  readonly root: Phaser.GameObjects.Container;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;
  private cards: Phaser.GameObjects.Container[] = [];
  private readonly scene: Phaser.Scene;
  private locked = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.66).setInteractive();
    this.title = scene.add.text(W / 2, 400, 'SPECIAL UPGRADE', textStyle(34, TEXT.amber, '900')).setOrigin(0.5).setLetterSpacing(4);
    this.subtitle = scene.add.text(W / 2, 446, '', textStyle(22, TEXT.muted, '800')).setOrigin(0.5);
    this.root = scene.add.container(0, 0, [this.dim, this.title, this.subtitle]).setDepth(300).setVisible(false);
  }

  show(ids: SpecialId[], milestone: number, onPick: (id: SpecialId) => void): void {
    this.locked = false;
    this.root.setVisible(true).setAlpha(1);
    this.dim.setAlpha(0);
    this.scene.tweens.add({ targets: this.dim, alpha: 1, duration: 160 });
    this.subtitle.setText(`BEST ${milestone} 到達 — 1つ選択`);
    for (const c of this.cards) c.destroy();
    this.cards = ids.map((id, i) => this.makeCard(id, W / 2 + (i - (ids.length - 1) / 2) * (CARD_W + 12), 660, i, onPick));
    this.root.add(this.cards);
  }

  private makeCard(id: SpecialId, x: number, y: number, i: number, onPick: (id: SpecialId) => void): Phaser.GameObjects.Container {
    const def = specialById(id);
    const s = this.scene;
    const bg = s.add.graphics();
    drawPanel(bg, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 20, 1);
    bg.fillStyle(def.color, 0.9);
    bg.fillRoundedRect(-CARD_W / 2 + 8, -CARD_H / 2 + 8, CARD_W - 16, 118, 14);
    bg.fillStyle(0x000000, 0.25);
    bg.fillCircle(0, -CARD_H / 2 + 67, 44);
    const icon = s.add.graphics();
    icon.setPosition(0, -CARD_H / 2 + 67);
    drawSpecialIcon(icon, id, 56, 0xf6efe2);
    const name = s.add.text(0, 10, def.name, textStyle(def.name.length > 5 ? 23 : 28, TEXT.main, '900')).setOrigin(0.5);
    const effect = s.add
      .text(0, 76, def.effect, { ...textStyle(21, TEXT.amber, '800'), align: 'center', lineSpacing: 6 })
      .setOrigin(0.5);
    const card = s.add.container(x, y + 40, [bg, icon, name, effect]).setSize(CARD_W, CARD_H).setAlpha(0);
    card.setInteractive({ useHandCursor: true });
    s.tweens.add({ targets: card, y, alpha: 1, duration: 200, delay: 80 + i * 70, ease: 'Back.out' });
    card.on('pointerdown', () => !this.locked && card.setScale(0.97));
    card.on('pointerout', () => card.setScale(1));
    card.on('pointerup', () => {
      if (this.locked) return;
      this.locked = true;
      for (const other of this.cards) {
        if (other === card) continue;
        s.tweens.add({ targets: other, alpha: 0, scale: 0.85, duration: 110 });
      }
      s.tweens.add({ targets: [this.title, this.subtitle], alpha: 0, duration: 110 });
      bg.lineStyle(4, COLORS.amberLight, 1);
      bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 20);
      s.tweens.add({
        targets: card,
        scale: 1.08,
        duration: 120,
        ease: 'Quad.out',
        onComplete: () => {
          s.tweens.add({ targets: card, x: W / 2, y: 176, scale: 0.12, alpha: 0.2, duration: 260, ease: 'Quad.in' });
          s.tweens.add({ targets: this.dim, alpha: 0, duration: 260 });
          s.time.delayedCall(270, () => {
            this.root.setVisible(false);
            this.title.setAlpha(1);
            this.subtitle.setAlpha(1);
            onPick(id);
          });
        },
      });
    });
    return card;
  }
}
