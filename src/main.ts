import Phaser from 'phaser';
import { FEEL } from './config/feel.ts';
import { BootScene } from './scenes/BootScene.ts';
import { GameScene } from './scenes/GameScene.ts';
import './styles/global.css';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: FEEL.view.width,
  height: FEEL.view.height,
  backgroundColor: '#15120f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    powerPreference: 'high-performance',
  },
  input: { activePointers: 2 },
  scene: [BootScene, GameScene],
});

// Expose for debugging in the browser console / automated checks.
(window as unknown as { __breakThrough?: Phaser.Game }).__breakThrough = game;
