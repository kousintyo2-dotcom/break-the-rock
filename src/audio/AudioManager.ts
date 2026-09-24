import type { SoundId } from './soundIds.ts';

interface PlayOptions {
  /** Pitch multiplier. */
  rate?: number;
  /** Gain multiplier. */
  volume?: number;
}

type Recipe = (a: AudioManager, t: number, o: Required<PlayOptions>) => void;

/**
 * Sound effects synthesized with WebAudio. Each SoundId maps to a recipe so it can
 * later be replaced by a recorded sample without touching callers.
 * The "drive" layer is a low engine hum that follows BREAK RUSH intensity and stands
 * in for BGM until real music exists.
 */
export class AudioManager {
  ctx: AudioContext | null = null;
  sfxBus: GainNode | null = null;
  private bgmBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private driveGain: GainNode | null = null;
  private driveOsc: OscillatorNode | null = null;
  private driveFilter: BiquadFilterNode | null = null;
  private sfxVolume = 0.8;
  private bgmVolume = 0.6;
  private voices = 0;

  /** Must be called from a user gesture (mobile autoplay rules). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      const master = this.ctx.createDynamicsCompressor();
      master.threshold.value = -14;
      master.ratio.value = 6;
      master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.bgmBus = this.ctx.createGain();
      this.sfxBus.connect(master);
      this.bgmBus.connect(master);
      this.noise = this.makeNoise();
      this.startDrive();
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  suspend(): void {
    if (this.ctx?.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  setVolumes(sfx: number, bgm: number): void {
    this.sfxVolume = sfx;
    this.bgmVolume = bgm;
    this.applyVolumes();
  }

  play(id: SoundId, options: PlayOptions = {}): void {
    if (!this.ctx || !this.sfxBus || this.sfxVolume <= 0) return;
    if (this.voices > 28) return;
    const recipe = RECIPES[id];
    recipe(this, this.ctx.currentTime + 0.005, { rate: options.rate ?? 1, volume: options.volume ?? 1 });
  }

  /** 0 = idle, 1 = running, 2 = combo, 3 = BREAK RUSH. */
  setDrive(level: number): void {
    if (!this.ctx || !this.driveGain || !this.driveOsc || !this.driveFilter) return;
    const t = this.ctx.currentTime;
    const gains = [0, 0.05, 0.085, 0.14];
    const freqs = [40, 46, 52, 62];
    const cut = [200, 320, 520, 900];
    const i = Math.max(0, Math.min(3, Math.round(level)));
    this.driveGain.gain.setTargetAtTime(gains[i]!, t, level === 0 ? 0.25 : 0.06);
    this.driveOsc.frequency.setTargetAtTime(freqs[i]!, t, 0.15);
    this.driveFilter.frequency.setTargetAtTime(cut[i]!, t, 0.1);
  }

  // ---- building blocks used by recipes ----

  tone(t: number, type: OscillatorType, from: number, to: number, dur: number, gain: number, attack = 0.002): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.sfxBus!);
    this.track(osc, t, dur);
  }

  noiseBurst(t: number, filter: BiquadFilterType, freq: number, q: number, dur: number, gain: number, sweepTo?: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxBus!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
    this.voices++;
    src.onended = () => this.voices--;
  }

  private track(osc: OscillatorNode, t: number, dur: number): void {
    osc.start(t);
    osc.stop(t + dur + 0.02);
    this.voices++;
    osc.onended = () => this.voices--;
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private startDrive(): void {
    const ctx = this.ctx!;
    this.driveOsc = ctx.createOscillator();
    this.driveOsc.type = 'sawtooth';
    this.driveOsc.frequency.value = 40;
    this.driveFilter = ctx.createBiquadFilter();
    this.driveFilter.type = 'lowpass';
    this.driveFilter.frequency.value = 200;
    this.driveGain = ctx.createGain();
    this.driveGain.gain.value = 0;
    this.driveOsc.connect(this.driveFilter).connect(this.driveGain).connect(this.bgmBus!);
    this.driveOsc.start();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfxBus?.gain.setTargetAtTime(this.sfxVolume * 0.9, t, 0.02);
    this.bgmBus?.gain.setTargetAtTime(this.bgmVolume, t, 0.02);
  }
}

const RECIPES: Record<SoundId, Recipe> = {
  launch: (a, t, o) => {
    a.noiseBurst(t, 'bandpass', 300, 1.2, 0.32, 0.5 * o.volume, 2600);
    a.tone(t, 'sine', 90, 45, 0.25, 0.45 * o.volume);
  },
  breakWood: (a, t, o) => {
    a.tone(t, 'sine', 150 * o.rate, 55, 0.16, 0.7 * o.volume);
    a.noiseBurst(t, 'bandpass', 900 * o.rate, 1.4, 0.16, 0.7 * o.volume);
    a.noiseBurst(t + 0.012, 'highpass', 2400, 0.8, 0.06, 0.3 * o.volume);
  },
  breakBrick: (a, t, o) => {
    a.tone(t, 'sine', 120 * o.rate, 42, 0.2, 0.8 * o.volume);
    a.noiseBurst(t, 'lowpass', 1600 * o.rate, 0.9, 0.2, 0.75 * o.volume, 500);
    for (let i = 1; i <= 3; i++) a.noiseBurst(t + 0.03 * i + Math.random() * 0.02, 'bandpass', 2200 + i * 500, 3, 0.04, 0.18 * o.volume);
  },
  breakIron: (a, t, o) => {
    a.tone(t, 'sine', 110 * o.rate, 40, 0.22, 0.8 * o.volume);
    a.tone(t, 'triangle', 620 * o.rate, 560 * o.rate, 0.32, 0.22 * o.volume);
    a.tone(t, 'square', 1480 * o.rate, 1350 * o.rate, 0.12, 0.05 * o.volume);
    a.noiseBurst(t, 'highpass', 3200, 0.7, 0.14, 0.35 * o.volume);
  },
  breakGold: (a, t, o) => {
    a.tone(t, 'sine', 130 * o.rate, 50, 0.18, 0.6 * o.volume);
    [1318, 1760, 2637].forEach((f, i) => a.tone(t + i * 0.045, 'triangle', f, f, 0.28, 0.2 * o.volume));
    a.noiseBurst(t, 'highpass', 5000, 0.7, 0.2, 0.25 * o.volume);
  },
  breakBoost: (a, t, o) => {
    a.tone(t, 'sine', 120, 45, 0.2, 0.7 * o.volume);
    a.tone(t + 0.08, 'sawtooth', 180, 980, 0.36, 0.14 * o.volume, 0.05);
    a.noiseBurst(t + 0.06, 'bandpass', 400, 1.1, 0.4, 0.4 * o.volume, 3200);
  },
  critical: (a, t, o) => {
    a.tone(t, 'sine', 90, 30, 0.38, 0.95 * o.volume);
    a.noiseBurst(t, 'lowpass', 4200, 0.7, 0.3, 0.8 * o.volume, 400);
    a.tone(t, 'triangle', 1900, 1500, 0.2, 0.14 * o.volume);
  },
  stopWood: (a, t, o) => {
    a.tone(t, 'sine', 70, 32, 0.42, 1 * o.volume);
    a.noiseBurst(t, 'lowpass', 700, 1, 0.35, 0.8 * o.volume, 150);
    a.noiseBurst(t + 0.05, 'bandpass', 1200, 4, 0.18, 0.25 * o.volume);
  },
  stopBrick: (a, t, o) => {
    a.tone(t, 'sine', 64, 30, 0.45, 1 * o.volume);
    a.noiseBurst(t, 'lowpass', 900, 1, 0.4, 0.85 * o.volume, 140);
  },
  stopIron: (a, t, o) => {
    a.tone(t, 'sine', 62, 28, 0.45, 1 * o.volume);
    a.tone(t, 'triangle', 280, 250, 0.6, 0.18 * o.volume);
    a.tone(t, 'triangle', 437, 400, 0.5, 0.1 * o.volume);
    a.noiseBurst(t, 'lowpass', 800, 1, 0.3, 0.7 * o.volume, 150);
  },
  newBest: (a, t, o) => {
    [784, 988, 1175, 1568].forEach((f, i) => a.tone(t + i * 0.055, 'triangle', f, f, 0.32, 0.2 * o.volume));
    a.tone(t, 'sine', 80, 40, 0.3, 0.6 * o.volume);
  },
  rushStart: (a, t, o) => {
    a.noiseBurst(t, 'bandpass', 200, 1, 0.5, 0.55 * o.volume, 4000);
    a.tone(t, 'sawtooth', 70, 140, 0.45, 0.18 * o.volume, 0.08);
  },
  buy: (a, t, o) => {
    a.tone(t, 'square', 520, 520, 0.05, 0.08 * o.volume);
    a.tone(t + 0.04, 'triangle', 780, 1170, 0.16, 0.22 * o.volume);
    a.noiseBurst(t, 'highpass', 4000, 0.7, 0.05, 0.15 * o.volume);
  },
  denied: (a, t, o) => {
    a.tone(t, 'square', 180, 150, 0.12, 0.08 * o.volume);
  },
  tap: (a, t, o) => {
    a.tone(t, 'triangle', 900, 700, 0.05, 0.12 * o.volume);
  },
  pick: (a, t, o) => {
    [523, 784, 1047].forEach((f, i) => a.tone(t + i * 0.06, 'triangle', f, f * 1.01, 0.3, 0.18 * o.volume));
  },
};
