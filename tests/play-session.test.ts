import assert from 'node:assert/strict';
import test from 'node:test';
import { getBurstRate, getStopResult, PlaySession } from '../src/systems/PlaySession.ts';

test('stop judgement ranges include every requested boundary', () => {
  assert.equal(getStopResult(49.99), 'SAFE');
  assert.equal(getStopResult(50), 'GOOD');
  assert.equal(getStopResult(75), 'GREAT');
  assert.equal(getStopResult(90), 'PERFECT');
  assert.equal(getStopResult(97), 'CRAZY');
});

test('burst rates select the highest matching threshold', () => {
  assert.equal(getBurstRate(89.99), 0);
  assert.equal(getBurstRate(92.99), 0.03);
  assert.equal(getBurstRate(96), 0.1);
  assert.equal(getBurstRate(99), 0.35);
  assert.equal(getBurstRate(100), 1);
});

test('rapid taps accumulate score, combo, and capped risk', () => {
  const game = new PlaySession(() => 1);
  for (let index = 0; index < 40; index += 1) game.tap();
  assert.equal(game.state.combo, 40);
  assert.equal(game.state.score, 400);
  assert.equal(game.state.risk, 100);
});

test('stop applies multiplier and next round preserves total', () => {
  const game = new PlaySession(() => 1);
  for (let index = 0; index < 28; index += 1) game.tap();
  const result = game.stop();
  assert.equal(result?.judgement, 'GREAT');
  assert.equal(result?.multiplier, 1.6);
  assert.equal(game.state.totalScore, 448);
  game.nextRound();
  assert.equal(game.state.round, 2);
  assert.equal(game.state.risk, 0);
  assert.equal(game.state.combo, 0);
  assert.equal(game.state.totalScore, 448);
});

test('burst immediately ends a round and retry resets the run', () => {
  const game = new PlaySession(() => 0);
  while (game.state.risk < 90) game.tap();
  assert.equal(game.state.phase, 'judging');
  assert.equal(game.state.lastResult?.judgement, 'BURST');
  game.retry();
  assert.deepEqual(game.state, { round: 1, score: 0, combo: 0, risk: 0, totalScore: 0, phase: 'playing' });
});
