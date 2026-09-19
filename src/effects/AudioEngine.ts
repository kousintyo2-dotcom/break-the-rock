export class AudioEngine {
  private context?: AudioContext;
  enabled = true;

  private tone(frequency: number, duration: number, volume: number, type: OscillatorType = 'sine'): void {
    if (!this.enabled) return;
    this.context ??= new AudioContext();
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + duration);
  }

  hit(power = 1): void { this.tone(78 + Math.random() * 22 - power * 2, 0.075, 0.065, 'triangle'); }
  collect(): void { this.tone(480 + Math.random() * 45, 0.11, 0.04); }
  discover(): void { this.tone(350, 0.18, 0.045); setTimeout(() => this.tone(525, 0.2, 0.035), 80); }
  upgrade(): void { this.tone(260, 0.1, 0.045, 'triangle'); setTimeout(() => this.tone(390, 0.14, 0.04), 70); }
  breakRock(): void { this.tone(58 + Math.random() * 8, 0.22, 0.09, 'sawtooth'); }
}
