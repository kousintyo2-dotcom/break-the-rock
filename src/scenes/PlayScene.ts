import { RESULT_DELAY, ROUND_MULTIPLIERS, STOP_DELAY, TAP_SCORE, TOTAL_ROUNDS } from '../config/balance';
import { PlaySession } from '../systems/PlaySession';

const faceForRisk = (risk: number) =>
  risk >= 80 ? 'danger' : risk >= 60 ? 'excited' : risk >= 30 ? 'happy' : 'normal';

export class PlayScene {
  readonly root = document.createElement('main');
  private readonly game = new PlaySession();
  private stopTimer?: number;
  private nextTimer?: number;
  private pressTimer?: number;
  private floatIndex = 0;

  constructor() {
    this.root.className = 'play-screen';
    this.root.innerHTML = `
      <section class="play-hud" aria-label="プレイ情報">
        <div><span>ROUND</span><strong data-round>1 / ${TOTAL_ROUNDS}</strong></div>
        <div><span>SCORE</span><strong data-score>0</strong></div>
        <div><span>COMBO</span><strong data-combo>0</strong></div>
      </section>
      <section class="character-stage" aria-label="サクラ">
        <div class="round-callout" data-round-callout></div>
        <div class="sakura-frame">
          <img data-sakura alt="サクラ" draggable="false">
          <div class="sakura-placeholder" data-placeholder><b>SAKURA</b><span data-mood>READY</span></div>
        </div>
        <div class="judgement" data-judgement role="status" aria-live="assertive"></div>
      </section>
      <section class="tap-zone">
        <p class="risk-label">BURST RISK <strong data-risk>0%</strong></p>
        <div class="tap-wrap" data-tap-wrap>
          <div class="risk-ring" data-ring></div>
          <button class="tap-button" data-tap type="button" aria-label="タップしてスコアと危険度を上げる">
            <span>TAP!</span><small data-button-risk>0%</small>
          </button>
          <div class="score-floats" data-floats aria-hidden="true"></div>
        </div>
        <p class="stop-hint">止めて判定 <b>0.5 SEC</b></p>
      </section>
      <section class="temp-result" data-result hidden>
        <span>RUN COMPLETE</span><h1>TOTAL SCORE</h1><strong data-total>0</strong>
        <button data-retry type="button">RETRY</button>
      </section>`;

    const button = this.query<HTMLButtonElement>('[data-tap]');
    button.addEventListener('pointerdown', (event) => this.onTap(event));
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    this.query<HTMLButtonElement>('[data-retry]').addEventListener('click', () => this.retry());
    this.game.addEventListener('changed', () => this.render());
    this.loadSakura('normal');
    this.render();
  }

  destroy(): void {
    window.clearTimeout(this.stopTimer);
    window.clearTimeout(this.nextTimer);
    window.clearTimeout(this.pressTimer);
  }

  private onTap(event: PointerEvent): void {
    event.preventDefault();
    const outcome = this.game.tap();
    if (outcome === 'ignored') return;
    this.pressFeedback();
    this.addScoreFloat();
    window.clearTimeout(this.stopTimer);
    if (outcome === 'burst') {
      this.root.classList.add('bursting');
      this.loadSakura('burst');
      this.scheduleNextRound();
    } else {
      this.stopTimer = window.setTimeout(() => {
        this.game.stop();
        this.scheduleNextRound();
      }, STOP_DELAY);
    }
  }

  private scheduleNextRound(): void {
    window.clearTimeout(this.stopTimer);
    this.nextTimer = window.setTimeout(() => {
      this.root.classList.remove('bursting');
      this.game.nextRound();
      if (this.game.state.phase === 'playing' && this.game.state.round === TOTAL_ROUNDS) {
        const callout = this.query<HTMLElement>('[data-round-callout]');
        callout.textContent = 'FINAL ROUND';
        callout.classList.add('show');
        window.setTimeout(() => callout.classList.remove('show'), 800);
      }
    }, RESULT_DELAY);
  }

  private pressFeedback(): void {
    const button = this.query<HTMLElement>('[data-tap]');
    button.classList.remove('pressed');
    void button.offsetWidth;
    button.classList.add('pressed');
    window.clearTimeout(this.pressTimer);
    this.pressTimer = window.setTimeout(() => button.classList.remove('pressed'), 105);
    navigator.vibrate?.(8);
  }

  private addScoreFloat(): void {
    const slots = this.query<HTMLElement>('[data-floats]');
    const slot = (slots.children[this.floatIndex] as HTMLElement | undefined) ?? document.createElement('i');
    if (!slot.parentElement) slots.append(slot);
    slot.textContent = `+${Math.round(TAP_SCORE * ROUND_MULTIPLIERS[this.game.state.round - 1]!.score)}`;
    slot.style.setProperty('--drift', `${(this.floatIndex % 5 - 2) * 18}px`);
    slot.className = '';
    void slot.offsetWidth;
    slot.className = 'fly';
    this.floatIndex = (this.floatIndex + 1) % 8;
  }

  private render(): void {
    const { state } = this.game;
    this.query('[data-round]').textContent = `${state.round} / ${TOTAL_ROUNDS}`;
    this.query('[data-score]').textContent = Math.round(state.score).toLocaleString();
    this.query('[data-combo]').textContent = state.combo.toString();
    const risk = Math.min(100, state.risk);
    const riskText = `${Math.round(risk)}%`;
    this.query('[data-risk]').textContent = riskText;
    this.query('[data-button-risk]').textContent = riskText;
    const ring = this.query<HTMLElement>('[data-ring]');
    ring.style.setProperty('--risk', `${risk * 3.6}deg`);
    ring.dataset.level = risk >= 90 ? 'critical' : risk >= 75 ? 'high' : risk >= 50 ? 'warm' : 'calm';
    const mood = state.lastResult?.judgement === 'BURST' ? 'burst' : faceForRisk(risk);
    this.query('[data-mood]').textContent = mood.toUpperCase();
    if (!state.lastResult) this.loadSakura(mood);
    const judgement = this.query<HTMLElement>('[data-judgement]');
    judgement.className = `judgement${state.phase === 'judging' ? ' show' : ''}`;
    if (state.lastResult) {
      judgement.innerHTML = state.lastResult.judgement === 'BURST'
        ? '<strong>BURST!!</strong><small>ROUND FAILED</small>'
        : `<strong>${state.lastResult.judgement}</strong><small>ROUND SCORE ${state.lastResult.score.toLocaleString()} · ×${state.lastResult.multiplier.toFixed(2)}</small>`;
    } else judgement.replaceChildren();
    this.query<HTMLButtonElement>('[data-tap]').disabled = state.phase !== 'playing';
    const result = this.query<HTMLElement>('[data-result]');
    result.hidden = state.phase !== 'finished';
    this.query('[data-total]').textContent = state.totalScore.toLocaleString();
  }

  private loadSakura(mood: string): void {
    const image = this.query<HTMLImageElement>('[data-sakura]');
    const placeholder = this.query<HTMLElement>('[data-placeholder]');
    image.onload = () => { image.hidden = false; placeholder.hidden = true; };
    image.onerror = () => { image.hidden = true; placeholder.hidden = false; };
    image.src = `${import.meta.env.BASE_URL}images/sakura_${mood}.webp`;
  }

  private retry(): void {
    window.clearTimeout(this.nextTimer);
    this.root.classList.remove('bursting');
    this.game.retry();
  }

  private query<T extends Element = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing PlayScene element: ${selector}`);
    return element;
  }
}
