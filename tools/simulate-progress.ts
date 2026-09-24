/**
 * Balance check: simulates a player through the first minutes of PHASE 1.
 * Run: node --experimental-strip-types tools/simulate-progress.ts [seed]
 */
import { createDefaultSave } from '../src/save/saveData.ts';
import { applyRunResult, buyUpgrade, canAfford, claimSpecial, pendingMilestone, rollSpecialOffer, statsFromSave } from '../src/systems/progress.ts';
import { estimateWalls, simulateRun } from '../src/systems/runSimulator.ts';
import { STAT_IDS, deriveStats } from '../src/systems/stats.ts';
import { upgradeCost } from '../src/systems/upgrades.ts';
import { seededRng } from '../src/utils/random.ts';

const seed = Number(process.argv[2] ?? 1);
const rng = seededRng(seed);
const save = createDefaultSave();
let time = 0;
const marks = [60, 120, 180, 300, 420, 600, 900];
let run = 0;
while (time < 900) {
  run++;
  const result = simulateRun(statsFromSave(save), save.best, rng);
  applyRunResult(save, result);
  let buys = 0;
  const milestone = pendingMilestone(save);
  if (milestone !== null) {
    const offer = rollSpecialOffer(save, rng);
    claimSpecial(save, milestone, offer[0]!);
  }
  for (;;) {
    const affordable = STAT_IDS.filter((s) => canAfford(save, s));
    if (!affordable.length) break;
    const base = estimateWalls(statsFromSave(save));
    let best = affordable[0]!;
    let bestScore = -1;
    for (const s of affordable) {
      const lv = { ...save.levels, [s]: save.levels[s] + 1 };
      const e = estimateWalls(deriveStats(lv, save.specials));
      const score = (e.low + e.high - base.low - base.high) / upgradeCost(s, save.levels[s]);
      if (score > bestScore) { bestScore = score; best = s; }
    }
    buyUpgrade(save, best);
    buys++;
  }
  const cycle = 9 + 0.3 * result.wallsBroken + (buys ? 3 : 0) + (milestone ? 3 : 0);
  const before = time;
  time += cycle;
  const est = estimateWalls(statsFromSave(save));
  console.log(`${String(run).padStart(3)} t=${time.toFixed(0).padStart(4)}s walls=${String(result.wallsBroken).padStart(2)} stop@${result.stop.wall.index} ${Math.round(result.stop.damage*100)}% +${result.totalScrap} best=${save.best} P${save.levels.power}/M${save.levels.momentum}/L${save.levels.luck} pow=${statsFromSave(save).power} est=${est.low}-${est.high} buys=${buys} sp=${save.specials.join(',')}`);
  for (const m of marks) if (before < m && time >= m) console.log(`---- ${m / 60} min: best ${save.best}`);
}
