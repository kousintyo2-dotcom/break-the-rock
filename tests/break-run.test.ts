import assert from 'node:assert/strict';
import test from 'node:test';
import { getWall, PHASE1_WALL_COUNT } from '../src/data/walls.ts';
import { createDefaultSave } from '../src/save/saveData.ts';
import { applyRunResult, buyUpgrade, statsFromSave } from '../src/systems/progress.ts';
import { estimateWalls, simulateRun } from '../src/systems/runSimulator.ts';
import { deriveStats, rushLevel } from '../src/systems/stats.ts';
import { seededRng } from '../src/utils/random.ts';

const noLuck = () => 0.999999;

test('PHASE 1 course has 20 walls and places GOLD, CRACK and BOOST early', () => {
  assert.equal(PHASE1_WALL_COUNT, 20);
  const first9 = Array.from({ length: 9 }, (_, i) => getWall(i + 1).special);
  for (const special of ['gold', 'crack', 'boost'] as const) assert.ok(first9.includes(special), special);
  assert.equal(getWall(20).special, 'gate');
  assert.ok(getWall(25).hp > getWall(20).hp, 'walls past the course keep getting harder');
});

test('a fresh core breaks 1-2 walls and stops with visible partial damage', () => {
  const result = simulateRun(statsFromSave(createDefaultSave()), 0, noLuck);
  assert.ok(result.wallsBroken >= 1 && result.wallsBroken <= 2, `broke ${result.wallsBroken}`);
  assert.ok(result.stop.damage > 0.3 && result.stop.damage < 1, `damage ${result.stop.damage}`);
  assert.equal(result.stop.wall.index, result.wallsBroken + 1);
  assert.ok(result.newBest);
});

test('one or two POWER upgrades break the wall that stopped the previous run', () => {
  const save = createDefaultSave();
  const first = simulateRun(statsFromSave(save), 0, noLuck);
  applyRunResult(save, first);
  let bought = 0;
  while (bought < 2 && buyUpgrade(save, 'power')) bought++;
  assert.ok(bought >= 1, 'first run funds at least one POWER upgrade');
  const second = simulateRun(statsFromSave(save), save.best, noLuck);
  assert.ok(second.wallsBroken > first.wallsBroken);
  assert.ok(second.breaks.some((b) => b.wall.index === first.stop.wall.index));
});

test('momentum lowers the cost of every wall', () => {
  const base = deriveStats({ power: 5, momentum: 0, luck: 0 }, []);
  const fast = deriveStats({ power: 5, momentum: 4, luck: 0 }, []);
  const a = simulateRun(base, 0, noLuck);
  const b = simulateRun(fast, 0, noLuck);
  assert.ok(b.breaks[0]!.cost < a.breaks[0]!.cost);
  assert.ok(b.wallsBroken >= a.wallsBroken);
});

test('critical hits cost less than normal hits', () => {
  const stats = deriveStats({ power: 3, momentum: 0, luck: 0 }, []);
  const crit = simulateRun(stats, 0, () => 0);
  const normal = simulateRun(stats, 0, noLuck);
  assert.ok(crit.breaks[0]!.crit);
  assert.ok(crit.breaks[0]!.cost < normal.breaks[0]!.cost);
});

test('BOOST walls restore POWER', () => {
  const stats = deriveStats({ power: 12, momentum: 4, luck: 0 }, []);
  const run = simulateRun(stats, 0, noLuck);
  const boost = run.breaks.find((b) => b.wall.special === 'boost');
  assert.ok(boost, 'reaches the first BOOST wall');
  assert.equal(boost.restoreSource, 'boost');
  assert.ok(boost.powerAfter > boost.powerBefore - boost.cost);
});

test('new best is flagged on the first wall past the record and earns a bonus', () => {
  const stats = deriveStats({ power: 6, momentum: 2, luck: 0 }, []);
  const run = simulateRun(stats, 2, noLuck);
  assert.ok(run.wallsBroken > 2);
  assert.deepEqual(run.breaks.filter((b) => b.newBest).map((b) => b.wall.index), [3]);
  assert.ok(run.recordBonus > 0);
  const repeat = simulateRun(stats, run.wallsBroken, noLuck);
  assert.equal(repeat.recordBonus, 0);
});

test('BREAK RUSH starts at 10 walls, earlier with turbo', () => {
  const plain = deriveStats({ power: 0, momentum: 0, luck: 0 }, []);
  const turbo = deriveStats({ power: 0, momentum: 0, luck: 0 }, ['turbo']);
  assert.equal(rushLevel(9, plain), 0);
  assert.equal(rushLevel(10, plain), 1);
  assert.equal(rushLevel(7, turbo), 1);
  assert.equal(rushLevel(40, plain), 1, 'PHASE 1 caps at Lv1');
});

test('special upgrades change the run', () => {
  const levels = { power: 4, momentum: 1, luck: 0 };
  const plain = simulateRun(deriveStats(levels, []), 0, noLuck).wallsBroken;
  for (const id of ['heavyWarhead', 'initialThrust', 'lightweight'] as const) {
    assert.ok(simulateRun(deriveStats(levels, [id]), 0, noLuck).wallsBroken >= plain, id);
  }
  assert.ok(deriveStats(levels, ['weakPoint']).critChance > deriveStats(levels, []).critChance);
});

test('estimates are ordered and grow with POWER', () => {
  const a = estimateWalls(deriveStats({ power: 2, momentum: 0, luck: 0 }, []));
  const b = estimateWalls(deriveStats({ power: 12, momentum: 0, luck: 0 }, []));
  assert.ok(a.low <= a.high);
  assert.ok(b.low > a.high);
});

test('runs are deterministic for a given rng seed', () => {
  const stats = deriveStats({ power: 8, momentum: 3, luck: 5 }, ['doubleBreak', 'energyRecovery']);
  assert.deepEqual(simulateRun(stats, 3, seededRng(9)), simulateRun(stats, 3, seededRng(9)));
});

test('the very first run does not celebrate a NEW BEST on wall 1', () => {
  const run = simulateRun(statsFromSave(createDefaultSave()), 0, noLuck);
  assert.equal(run.breaks.some((b) => b.newBest), false);
  assert.ok(run.newBest, 'the run still counts as a record');
});
