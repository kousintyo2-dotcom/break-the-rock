import Phaser from 'phaser';
import { FEEL } from '../config/feel.ts';
import type { WallDef } from '../data/walls.ts';
import { MATERIALS } from '../data/wallTypes.ts';
import { COLORS, TEXT, textStyle } from '../ui/theme.ts';

const L = FEEL.layout;

export type WallTag = { record: boolean; lastDamage: number | null };

/** One wall on the course: sprite, floor shadow, labels and damage cracks. Pooled by WallField. */
export class WallView {
  index = 0;
  def: WallDef | null = null;
  readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly crackOverlay: Phaser.GameObjects.Image;
  private readonly damage: Phaser.GameObjects.Graphics;
  private readonly number: Phaser.GameObjects.Text;
  private readonly kind: Phaser.GameObjects.Text;
  private readonly tag: Phaser.GameObjects.Container;
  private readonly tagBg: Phaser.GameObjects.Graphics;
  private readonly tagText: Phaser.GameObjects.Text;
  private readonly tagSub: Phaser.GameObjects.Text;
  private readonly recordLine: Phaser.GameObjects.Rectangle;
  private glowTween: Phaser.Tweens.Tween | null = null;
  private flashTimer: Phaser.Time.TimerEvent | null = null;
  x = 0;
  width = 0;
  height = 0;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.scene = scene;
    this.shadow = scene.add.image(0, L.floorY, 'puff').setTint(0x000000).setAlpha(0.55).setDepth(8);
    this.recordLine = scene.add.rectangle(0, L.floorY + 6, 10, 4, COLORS.amber, 0.8).setDepth(8);
    this.glow = scene.add.image(0, 0, 'puff').setBlendMode(Phaser.BlendModes.ADD).setDepth(9).setVisible(false);
    this.sprite = scene.add.image(0, L.floorY, 'wall-wood').setOrigin(0.5, 1).setDepth(10);
    this.crackOverlay = scene.add.image(0, 0, 'crack').setOrigin(0.5, 1).setDepth(11).setAlpha(0.9);
    this.damage = scene.add.graphics().setDepth(12);
    this.number = scene.add.text(0, 0, '', textStyle(22, TEXT.muted, '800')).setOrigin(0.5, 1).setDepth(13);
    this.kind = scene.add.text(0, 0, '', textStyle(18, TEXT.gold, '900')).setOrigin(0.5, 1).setDepth(13);
    this.kind.setLetterSpacing(2);
    this.tagBg = scene.add.graphics();
    this.tagText = scene.add.text(0, 0, 'RECORD', textStyle(18, TEXT.dark, '900')).setOrigin(0.5);
    this.tagText.setLetterSpacing(2);
    this.tagSub = scene.add.text(0, 26, '', textStyle(17, TEXT.amber, '800')).setOrigin(0.5);
    this.tag = scene.add.container(0, 0, [this.tagBg, this.tagText, this.tagSub]).setDepth(14);
    layer.add([this.shadow, this.recordLine, this.glow, this.sprite, this.crackOverlay, this.damage, this.number, this.kind, this.tag]);
  }

  configure(def: WallDef, x: number, broken: boolean, tag: WallTag): void {
    this.index = def.index;
    this.def = def;
    this.x = x;
    const mat = MATERIALS[def.material];
    this.sprite.setTexture(mat.texture, '__BASE');
    const h = L.wallHeight * def.scale;
    const scale = h / this.sprite.frame.height;
    this.sprite.setScale(scale).setPosition(x, L.floorY).setAngle(0).setAlpha(1);
    this.sprite.setTintMode(Phaser.TintModes.MULTIPLY).clearTint();
    this.width = this.sprite.displayWidth;
    this.height = h;
    this.shadow.setPosition(x + 6, L.floorY + 4).setDisplaySize(this.width * 1.9, 34);
    this.crackOverlay.setVisible(def.special === 'crack');
    this.crackOverlay.setPosition(x - 2, L.floorY - h * 0.04).setDisplaySize(this.width * 0.78, h * 0.9);
    this.damage.clear();
    this.damage.setPosition(x, L.floorY - h);

    const top = L.floorY - h - 10;
    this.number.setText(`${def.index}`).setPosition(x, top).setColor(TEXT.muted);
    const kindLabel: Record<string, [string, string]> = {
      gold: ['GOLD', TEXT.gold],
      boost: ['BOOST', TEXT.boost],
      crack: ['CRACK', TEXT.muted],
      gate: ['GATE', TEXT.main],
    };
    const k = kindLabel[def.special];
    this.kind.setVisible(!!k).setPosition(x, top - 26);
    if (k) this.kind.setText(k[0]).setColor(k[1]);

    this.glowTween?.stop();
    this.glowTween = null;
    const glowColor = def.special === 'gold' ? COLORS.gold : def.special === 'boost' ? COLORS.boost : null;
    this.glow.setVisible(glowColor !== null);
    if (glowColor !== null) {
      this.glow.setTint(glowColor).setPosition(x, L.floorY - h / 2).setDisplaySize(this.width * 2.4, h * 1.25).setAlpha(0.18);
      this.glowTween = this.scene.tweens.add({ targets: this.glow, alpha: 0.38, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    this.setTag(tag, top - (k ? 58 : 34));
    this.setBroken(broken);
  }

  private setTag(tag: WallTag, y: number): void {
    const show = tag.record || tag.lastDamage !== null;
    this.tag.setVisible(show).setPosition(this.x, y - 18);
    this.recordLine.setVisible(tag.record).setPosition(this.x, L.floorY + 8).setSize(this.width * 1.5, 4);
    if (!show) return;
    this.tagBg.clear();
    if (tag.record) {
      this.tagBg.fillStyle(COLORS.amber, 1);
      this.tagBg.fillRoundedRect(-58, -16, 116, 32, 16);
      this.tagText.setVisible(true);
    } else {
      this.tagText.setVisible(false);
    }
    this.tagSub.setVisible(tag.lastDamage !== null).setY(tag.record ? 30 : 0);
    if (tag.lastDamage !== null) this.tagSub.setText(`前回 ${Math.round(tag.lastDamage * 100)}%`);
  }

  setBroken(broken: boolean): void {
    const visible = !broken;
    for (const o of [this.sprite, this.shadow, this.number, this.kind, this.damage]) o.setVisible(visible);
    this.crackOverlay.setVisible(visible && this.def?.special === 'crack');
    this.glow.setVisible(visible && (this.def?.special === 'gold' || this.def?.special === 'boost'));
    this.recordLine.setVisible(visible && this.recordLine.visible);
    this.tag.setVisible(visible && this.tag.visible);
  }

  get frontX(): number {
    return this.x - this.width * 0.42;
  }

  get centerY(): number {
    return L.floorY - this.height / 2;
  }

  /** Brief white flash + squash on impact. */
  flash(ms = 45): void {
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.flashTimer?.remove();
    this.flashTimer = this.scene.time.delayedCall(ms, () => this.sprite.setTintMode(Phaser.TintModes.MULTIPLY).clearTint());
  }

  /** Stop: the core is stuck inside — draw cracks spreading from the impact point. */
  showDamage(damage: number, impactY: number): void {
    const g = this.damage;
    g.clear();
    const rng = new Phaser.Math.RandomDataGenerator([`${this.index}`]);
    const ox = -this.width * 0.3;
    const oy = impactY - (L.floorY - this.height);
    const branches = 4 + Math.round(damage * 6);
    const reach = this.height * (0.2 + damage * 0.55);
    for (let b = 0; b < branches; b++) {
      let angle = (b / branches) * Math.PI * 2 + rng.realInRange(-0.3, 0.3);
      let x = ox;
      let y = oy;
      const len = reach * rng.realInRange(0.5, 1);
      const steps = 6;
      for (let i = 0; i < steps; i++) {
        angle += rng.realInRange(-0.45, 0.45);
        const nx = Phaser.Math.Clamp(x + Math.cos(angle) * (len / steps), -this.width * 0.45, this.width * 0.45);
        const ny = Phaser.Math.Clamp(y + Math.sin(angle) * (len / steps), 4, this.height - 4);
        const w = Math.max(1, 4 - i * 0.6);
        g.lineStyle(w + 2, 0xe8d9b8, 0.25);
        g.lineBetween(x + 1, y + 1, nx + 1, ny + 1);
        g.lineStyle(w, 0x080706, 0.95);
        g.lineBetween(x, y, nx, ny);
        x = nx;
        y = ny;
      }
    }
    // Dent where the core is lodged.
    g.fillStyle(0x080706, 0.55);
    g.fillEllipse(ox, oy, 26 + damage * 20, 60 + damage * 40);
    this.damage.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.damage, alpha: 1, duration: 90 });
    // Wall rocks back from the blow.
    this.scene.tweens.add({ targets: this.sprite, angle: 1.6 + damage * 2, duration: 70, yoyo: true, ease: 'Quad.out' });
  }

  destroy(): void {
    this.glowTween?.stop();
  }
}
