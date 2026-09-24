/** 1,200 / 12.4K / 3.5M. `compact` switches to K from 1,000 (for tight HUD space). */
export function formatNumber(value: number, compact = false): string {
  const n = Math.max(0, Math.floor(value));
  const limit = compact ? 1000 : 10000;
  if (n < limit) return n.toLocaleString('en-US');
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (n >= size) {
      const v = n / size;
      const text = v >= 100 ? Math.floor(v).toString() : (Math.floor(v * 10) / 10).toFixed(1);
      return `${text.replace(/\.0$/, '')}${suffix}`;
    }
  }
  return n.toString();
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
