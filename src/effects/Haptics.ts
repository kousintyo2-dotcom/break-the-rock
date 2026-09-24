export type HapticStrength = 'light' | 'medium' | 'heavy';

const PATTERNS: Record<HapticStrength, number | number[]> = {
  light: 8,
  medium: 22,
  heavy: [40, 20, 30],
};

/** Vibration where supported; silently does nothing elsewhere (e.g. iOS Safari). */
export class Haptics {
  enabled = true;
  private last = 0;

  pulse(strength: HapticStrength): void {
    if (!this.enabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    const now = performance.now();
    if (strength === 'light' && now - this.last < 60) return; // avoid buzzing during RUSH
    this.last = now;
    try {
      navigator.vibrate(PATTERNS[strength]);
    } catch {
      /* ignore */
    }
  }
}
