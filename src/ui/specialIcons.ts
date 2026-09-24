import type Phaser from 'phaser';
import type { SpecialId } from '../data/specials.ts';

/** Simple glyphs for special upgrades, drawn centred at (0,0) within `size`. */
export function drawSpecialIcon(g: Phaser.GameObjects.Graphics, id: SpecialId, size: number, color: number): void {
  const s = size / 2;
  g.lineStyle(Math.max(2, size * 0.07), color, 1);
  g.fillStyle(color, 1);
  switch (id) {
    case 'heavyWarhead':
      g.fillRoundedRect(-s * 0.7, -s * 0.38, s * 0.9, s * 0.76, s * 0.12);
      g.fillTriangle(s * 0.2, -s * 0.38, s * 0.85, 0, s * 0.2, s * 0.38);
      g.fillRect(-s * 0.9, -s * 0.5, s * 0.14, s);
      break;
    case 'initialThrust':
      for (let i = 0; i < 3; i++) {
        const x = -s * 0.7 + i * s * 0.5;
        g.lineBetween(x, -s * 0.5, x + s * 0.4, 0);
        g.lineBetween(x + s * 0.4, 0, x, s * 0.5);
      }
      break;
    case 'destructionUrge':
      g.fillTriangle(-s * 0.2, -s * 0.8, s * 0.35, -s * 0.05, -s * 0.05, -s * 0.05);
      g.fillTriangle(-s * 0.05, -s * 0.1, s * 0.3, -s * 0.1, -s * 0.35, s * 0.8);
      g.strokeCircle(0, 0, s * 0.85);
      break;
    case 'lightweight':
      g.strokeCircle(0, -s * 0.1, s * 0.5);
      g.lineBetween(-s * 0.6, s * 0.7, s * 0.6, s * 0.7);
      g.lineBetween(0, s * 0.4, 0, s * 0.7);
      g.fillTriangle(-s * 0.2, -s * 0.2, s * 0.2, -s * 0.2, 0, s * 0.1);
      break;
    case 'energyRecovery':
      g.fillTriangle(s * 0.15, -s * 0.85, -s * 0.45, s * 0.1, s * 0.05, s * 0.1);
      g.fillTriangle(-s * 0.1, -s * 0.05, s * 0.45, -s * 0.05, -s * 0.15, s * 0.85);
      break;
    case 'weakPoint':
      g.strokeCircle(0, 0, s * 0.6);
      g.lineBetween(-s * 0.9, 0, -s * 0.3, 0);
      g.lineBetween(s * 0.3, 0, s * 0.9, 0);
      g.lineBetween(0, -s * 0.9, 0, -s * 0.3);
      g.lineBetween(0, s * 0.3, 0, s * 0.9);
      g.fillCircle(0, 0, s * 0.12);
      break;
    case 'doubleBreak':
      g.strokeRect(-s * 0.75, -s * 0.6, s * 0.7, s * 1.2);
      g.strokeRect(s * 0.05, -s * 0.6, s * 0.7, s * 1.2);
      g.lineBetween(-s * 0.55, -s * 0.2, -s * 0.25, s * 0.25);
      g.lineBetween(s * 0.25, -s * 0.2, s * 0.55, s * 0.25);
      break;
    case 'turbo':
      g.strokeCircle(s * 0.25, 0, s * 0.5);
      g.lineBetween(s * 0.25, 0, s * 0.55, -s * 0.28);
      for (let i = 0; i < 3; i++) g.lineBetween(-s * 0.95, -s * 0.35 + i * s * 0.35, -s * 0.4, -s * 0.35 + i * s * 0.35);
      break;
  }
}
