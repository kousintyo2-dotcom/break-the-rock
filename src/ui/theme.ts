import type Phaser from 'phaser';

export const COLORS = {
  ground: 0x15120f,
  groundEdge: 0x2b241c,
  panel: 0x1c1915,
  panelLight: 0x2a251f,
  panelBorder: 0x4b4034,
  amber: 0xd98a2b,
  amberDark: 0x9c5a17,
  amberLight: 0xf0b25a,
  stone: 0x5d554b,
  stoneDark: 0x3a342d,
  gold: 0xf2c14e,
  energy: 0x8fd6ff,
  boost: 0xff7a45,
  positive: 0xb5cf6d,
  shadow: 0x000000,
} as const;

export const TEXT = {
  main: '#f1e9dc',
  muted: '#a99c89',
  dim: '#766b5d',
  amber: '#f0b25a',
  gold: '#f5cd62',
  energy: '#9edcff',
  boost: '#ff8a55',
  positive: '#c3da7c',
  dark: '#23170b',
} as const;

export const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Hiragino Sans', 'Noto Sans JP', sans-serif";

export function textStyle(size: number, color: string = TEXT.main, weight = '800'): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT, fontSize: `${size}px`, fontStyle: weight, color, resolution: 2 };
}
