const DESIGN_HEIGHT = 1280;

/**
 * Taller phones get a taller canvas (width stays 720) so nothing is letterboxed:
 * the HUD stays pinned to the top, the field and BREAK button to the bottom.
 */
function viewHeight(): number {
  if (typeof window === 'undefined' || !window.innerWidth) return DESIGN_HEIGHT;
  const h = Math.round((720 * window.innerHeight) / window.innerWidth);
  return Math.min(1560, Math.max(DESIGN_HEIGHT, h));
}

const HEIGHT = viewHeight();

/** Presentation timing and motion values (演出速度). Pure numbers, no rules. */
export const FEEL = {
  /** `extra` = height beyond the 9:16 design, inserted between the HUD and the field. */
  view: { width: 720, height: HEIGHT, extra: HEIGHT - DESIGN_HEIGHT },
  layout: {
    hudHeight: 150,
    fieldBottom: 900,
    floorY: 770,
    coreScreenX: 0.27,
    wallSpacing: 150,
    firstWallGap: 190,
    wallHeight: 310,
    coreSize: 92,
  },
  launch: {
    windupMs: 260,
    pullBack: 34,
    speed: 560, // px/s right after launch
  },
  speed: {
    perBreak: 0.07, // speed multiplier gained per broken wall
    comboMultiplier: 1.2,
    rushMultiplier: 1.75,
    max: 2600,
    boostSurge: 1.6,
    boostSurgeMs: 700,
  },
  hitStop: {
    normalMs: 42,
    rushMs: 18,
    critMs: 85,
    stopMs: 190,
  },
  record: {
    slowMoScale: 0.22,
    slowMoMs: 120, // real-time duration of the slow motion
    bannerMs: 900,
  },
  stop: {
    panelDelayMs: 780,
    embedDepth: 26,
  },
  debris: {
    maxPieces: 170,
    lifeMin: 0.3,
    lifeMax: 0.75,
    gravity: 1900,
  },
  shake: {
    normal: 0.004,
    heavy: 0.008,
    crit: 0.011,
    stop: 0.014,
    rush: 0.0025,
  },
} as const;
