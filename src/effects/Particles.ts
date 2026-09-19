export type ParticleKind = 'chip' | 'dust' | 'spark';
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; kind: ParticleKind }

export function impactParticles(x: number, y: number, color: string, intensity = 1): Particle[] {
  const chips = Array.from({ length: Math.round(2 + intensity * 3) }, (): Particle => ({
    x, y, vx: (Math.random() - 0.5) * 170 * intensity, vy: -55 - Math.random() * 120,
    life: 0.3 + Math.random() * 0.22, maxLife: 0.52, size: 2 + Math.random() * 4, color, kind: 'chip',
  }));
  const dust = Array.from({ length: Math.round(2 + intensity * 2) }, (): Particle => ({
    x: x + (Math.random() - 0.5) * 24, y, vx: (Math.random() - 0.5) * 35, vy: -18 - Math.random() * 35,
    life: 0.42 + Math.random() * 0.25, maxLife: 0.67, size: 8 + Math.random() * 10, color: '#aa9373', kind: 'dust',
  }));
  return [...chips, ...dust];
}

export function updateParticles(list: Particle[], dt: number): Particle[] {
  return list.filter((particle) => {
    particle.life -= dt;
    particle.vy += (particle.kind === 'dust' ? 40 : 420) * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    return particle.life > 0;
  });
}
