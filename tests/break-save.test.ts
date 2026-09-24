import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultSave, normalizeSave, SAVE_VERSION } from '../src/save/saveData.ts';
import { SaveStore, type KeyValueStorage } from '../src/save/SaveStore.ts';
import { buyUpgrade, claimSpecial, pendingMilestone, rollSpecialOffer } from '../src/systems/progress.ts';
import { upgradeCost } from '../src/systems/upgrades.ts';
import { formatNumber } from '../src/utils/format.ts';
import { seededRng } from '../src/utils/random.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

test('progress survives a reload', () => {
  const storage = new MemoryStorage();
  const store = new SaveStore(storage);
  const save = store.load();
  save.best = 12;
  save.scrap = 4200;
  save.levels.power = 7;
  save.specials.push('turbo');
  save.settings.vibration = false;
  store.save(save);
  const loaded = new SaveStore(storage).load();
  assert.deepEqual(loaded, save);
  assert.equal(loaded.version, SAVE_VERSION);
});

test('corrupt or hostile data falls back to safe defaults', () => {
  const storage = new MemoryStorage();
  storage.setItem('break-through-save', '{not json');
  assert.deepEqual(new SaveStore(storage).load(), createDefaultSave());
  const weird = normalizeSave({
    best: -5,
    scrap: 'lots',
    levels: { power: 3.7, momentum: Infinity, luck: null },
    specials: ['turbo', 'turbo', 'godMode'],
    claimedMilestones: [5, 5, -1, 'x'],
    lastStop: { wall: 3, damage: 7 },
    settings: { shake: 5, sfx: -1, vibration: 'yes' },
  });
  assert.equal(weird.best, 0);
  assert.equal(weird.scrap, 0);
  assert.deepEqual(weird.levels, { power: 3, momentum: 0, luck: 0 });
  assert.deepEqual(weird.specials, ['turbo']);
  assert.deepEqual(weird.claimedMilestones, [5]);
  assert.deepEqual(weird.lastStop, { wall: 3, damage: 1 });
  assert.equal(weird.settings.shake, 1);
  assert.equal(weird.settings.sfx, 0);
  assert.equal(weird.settings.vibration, true);
});

test('reset clears stored progress', () => {
  const storage = new MemoryStorage();
  const store = new SaveStore(storage);
  const save = store.load();
  save.best = 9;
  store.save(save);
  assert.equal(store.reset().best, 0);
  assert.equal(store.load().best, 0);
});

test('upgrades cost scrap and get pricier', () => {
  const save = createDefaultSave();
  save.scrap = upgradeCost('power', 0);
  assert.equal(buyUpgrade(save, 'power'), true);
  assert.equal(save.scrap, 0);
  assert.equal(buyUpgrade(save, 'power'), false);
  assert.ok(upgradeCost('power', 1) > upgradeCost('power', 0));
});

test('special milestones offer three distinct unowned cards once', () => {
  const save = createDefaultSave();
  assert.equal(pendingMilestone(save), null);
  save.best = 11;
  const milestone = pendingMilestone(save);
  assert.equal(milestone, 5);
  const offer = rollSpecialOffer(save, seededRng(3));
  assert.equal(offer.length, 3);
  assert.equal(new Set(offer).size, 3);
  claimSpecial(save, milestone!, offer[0]!);
  assert.equal(pendingMilestone(save), 10);
  assert.ok(!rollSpecialOffer(save, seededRng(4)).includes(offer[0]!));
});

test('numbers are abbreviated for readability', () => {
  assert.equal(formatNumber(1200), '1,200');
  assert.equal(formatNumber(12400), '12.4K');
  assert.equal(formatNumber(3_500_000), '3.5M');
  assert.equal(formatNumber(4200, true), '4.2K');
  assert.equal(formatNumber(999, true), '999');
});
