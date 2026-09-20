import {
  BURST_RATES,
  RISK_PER_TAP,
  ROUND_MULTIPLIERS,
  STOP_MULTIPLIERS,
  STOP_RANGES,
  TAP_SCORE,
  TOTAL_ROUNDS,
  type StopResult,
} from '../config/balance.ts';

export type RoundResult = {
  round: number;
  baseScore: number;
  score: number;
  judgement: StopResult | 'BURST';
  multiplier: number;
};

export type PlayState = {
  round: number;
  score: number;
  combo: number;
  risk: number;
  totalScore: number;
  phase: 'playing' | 'judging' | 'finished';
  lastResult?: RoundResult;
};

export const getStopResult = (risk: number): StopResult =>
  STOP_RANGES.find(({ min }) => risk >= min)?.result ?? 'SAFE';

export const getBurstRate = (risk: number): number =>
  BURST_RATES.find(({ min }) => risk >= min)?.rate ?? 0;

export class PlaySession extends EventTarget {
  state: PlayState = this.initialState();
  private readonly random: () => number;

  constructor(random: () => number = Math.random) {
    super();
    this.random = random;
  }

  tap(): 'tap' | 'burst' | 'ignored' {
    if (this.state.phase !== 'playing') return 'ignored';
    const roundBalance = ROUND_MULTIPLIERS[this.state.round - 1]!;
    this.state.score += TAP_SCORE * roundBalance.score;
    this.state.combo += 1;
    this.state.risk = Math.min(100, this.state.risk + RISK_PER_TAP * roundBalance.risk);

    if (this.state.risk >= 90 && this.random() < getBurstRate(this.state.risk)) {
      this.finishRound('BURST');
      return 'burst';
    }
    this.changed();
    return 'tap';
  }

  stop(): RoundResult | undefined {
    if (this.state.phase !== 'playing' || this.state.combo === 0) return;
    return this.finishRound(getStopResult(this.state.risk));
  }

  nextRound(): boolean {
    if (this.state.phase !== 'judging') return false;
    if (this.state.round >= TOTAL_ROUNDS) {
      this.state.phase = 'finished';
    } else {
      this.state.round += 1;
      this.state.score = 0;
      this.state.combo = 0;
      this.state.risk = 0;
      this.state.phase = 'playing';
      this.state.lastResult = undefined;
    }
    this.changed();
    return true;
  }

  retry(): void {
    this.state = this.initialState();
    this.changed();
  }

  private finishRound(judgement: StopResult | 'BURST'): RoundResult {
    const multiplier = judgement === 'BURST' ? 0 : STOP_MULTIPLIERS[judgement];
    const result: RoundResult = {
      round: this.state.round,
      baseScore: Math.round(this.state.score),
      score: Math.round(this.state.score * multiplier),
      judgement,
      multiplier,
    };
    this.state.totalScore += result.score;
    this.state.phase = 'judging';
    this.state.lastResult = result;
    this.changed();
    return result;
  }

  private initialState(): PlayState {
    return { round: 1, score: 0, combo: 0, risk: 0, totalScore: 0, phase: 'playing' };
  }

  private changed(): void {
    this.dispatchEvent(new Event('changed'));
  }
}
