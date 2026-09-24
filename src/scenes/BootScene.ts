import Phaser from 'phaser';
import { IMAGE_ASSETS, WALL_TEXTURES } from '../data/assets.ts';
import { COLORS, TEXT, textStyle } from '../ui/theme.ts';

export const CHUNK_FRAMES = 3;
export const CHIP_FRAMES = 10;

/** Loads the cut sprites and builds the small procedural textures used for effects. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLORS.ground);
    const title = this.add.text(width / 2, height * 0.42, 'BREAK THROUGH', textStyle(54, TEXT.main, '900')).setOrigin(0.5);
    title.setLetterSpacing(4);
    const barBg = this.add.rectangle(width / 2, height * 0.5, 360, 10, COLORS.stoneDark).setOrigin(0.5);
    const bar = this.add.rectangle(width / 2 - 180, height * 0.5, 0, 10, COLORS.amber).setOrigin(0, 0.5);
    this.load.on('progress', (v: number) => (bar.width = 360 * v));
    this.load.once('complete', () => {
      barBg.destroy();
      bar.destroy();
    });
    for (const [key, url] of Object.entries(IMAGE_ASSETS)) this.load.image(key, url);
  }

  create(): void {
    this.makeGeneratedTextures();
    for (const key of WALL_TEXTURES) this.addDebrisFrames(key);
    this.scene.start('game');
  }

  /** Slices each wall sprite into chunks and chips so debris is made of the real wall art. */
  private addDebrisFrames(key: string): void {
    const texture = this.textures.get(key);
    const base = texture.get('__BASE');
    const w = base.width;
    const h = base.height;
    const rng = new Phaser.Math.RandomDataGenerator([key]);
    let y = 0;
    for (let i = 0; i < CHUNK_FRAMES; i++) {
      const bandH = i === CHUNK_FRAMES - 1 ? h - y : Math.round((h / CHUNK_FRAMES) * rng.realInRange(0.8, 1.2));
      texture.add(`chunk${i}`, 0, 0, y, w, bandH);
      y += bandH;
    }
    for (let i = 0; i < CHIP_FRAMES; i++) {
      const cw = Math.round(w * rng.realInRange(0.18, 0.34));
      const ch = Math.round(cw * rng.realInRange(0.6, 1.4));
      const cx = rng.between(Math.round(w * 0.1), Math.round(w * 0.9 - cw));
      const cy = rng.between(Math.round(h * 0.05), Math.round(h * 0.95 - ch));
      texture.add(`chip${i}`, 0, cx, cy, cw, ch);
    }
  }

  private makeGeneratedTextures(): void {
    // Soft round puff (dust, glow).
    const puff = this.textures.createCanvas('puff', 64, 64);
    if (puff) {
      const ctx = puff.getContext();
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.45, 'rgba(255,255,255,0.55)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      puff.refresh();
    }
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // Spark streak.
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 0, 24, 4, 2);
    g.generateTexture('spark', 24, 4);
    g.clear();
    // Square chip/glitter.
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 8, 8);
    g.generateTexture('dot', 8, 8);
    g.clear();
    // Speed line.
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 160, 3);
    g.generateTexture('line', 160, 3);
    g.clear();
    // Crack overlay for CRACK walls.
    this.drawCrack(g, 100, 300, 'crack');
    g.destroy();
  }

  private drawCrack(g: Phaser.GameObjects.Graphics, w: number, h: number, key: string): void {
    const rng = new Phaser.Math.RandomDataGenerator(['crack']);
    const branch = (x: number, y: number, angle: number, length: number, width: number, depth: number) => {
      let cx = x;
      let cy = y;
      const steps = Math.max(3, Math.round(length / 14));
      for (let i = 0; i < steps; i++) {
        const a = angle + rng.realInRange(-0.5, 0.5);
        const nx = cx + Math.cos(a) * (length / steps);
        const ny = cy + Math.sin(a) * (length / steps);
        g.lineStyle(width + 2, 0xd9c6a0, 0.25);
        g.lineBetween(cx + 1, cy + 1, nx + 1, ny + 1);
        g.lineStyle(width, 0x0c0a08, 0.95);
        g.lineBetween(cx, cy, nx, ny);
        cx = nx;
        cy = ny;
        if (depth > 0 && rng.frac() < 0.35) branch(cx, cy, a + rng.pick([-1, 1]) * rng.realInRange(0.6, 1.1), length * 0.45, Math.max(1, width - 1), depth - 1);
      }
    };
    branch(w * 0.5, 0, Math.PI / 2, h * 0.55, 4, 2);
    branch(w * 0.45, h * 0.5, Math.PI / 2 + 0.2, h * 0.5, 3, 2);
    branch(w * 0.5, h * 0.35, 0.3, w * 0.5, 2, 1);
    branch(w * 0.5, h * 0.6, Math.PI - 0.4, w * 0.5, 2, 1);
    g.generateTexture(key, w, h);
    g.clear();
  }
}
