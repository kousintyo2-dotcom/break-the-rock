import { ITEMS, ROCKS, UPGRADES, itemById, upgradeCost } from '../data/content.ts';
import type { ItemDefinition, UpgradeId } from '../data/types';
import type { SaveData } from '../save/schema';
import { SaveRepository } from '../save/SaveRepository.ts';

export type GameEvent = 'changed' | 'rock-hit' | 'rock-broken' | 'item-collected' | 'upgrade';
export interface HitResult { damage: number; broken: boolean; drops: ItemDefinition[] }

export class GameStore extends EventTarget {
  readonly repo = new SaveRepository();
  state: SaveData = this.repo.load();
  private readonly random: () => number;
  constructor(random: () => number = Math.random) { super(); this.random = random; }

  get rock() { return ROCKS[this.state.rockIndex % ROCKS.length] ?? ROCKS[0]!; }
  get damage() { return 2 + this.state.upgrades.hammer * 2; }

  hit(): HitResult {
    if (this.state.rockHp <= 0) return { damage: 0, broken: true, drops: [] };
    const damage = Math.min(this.damage, this.state.rockHp);
    this.state.rockHp -= damage;
    const drops: ItemDefinition[] = [];
    const damageBonus = Math.max(0, damage - 2) * 0.035;
    const chipChance = 0.22 + this.state.upgrades.chisel * 0.05 + damageBonus;
    if (this.state.rockHp > 0 && this.random() < chipChance) drops.push(this.rollDrop(true));
    const broken = this.state.rockHp <= 0;
    if (broken) {
      this.state.coins += this.rock.reward;
      this.state.rocksBroken += 1;
      drops.push(this.rollDrop(false), this.rollDrop(false));
      if (this.random() < 0.35 + this.state.upgrades.chisel * 0.06) drops.push(this.rollDrop(false));
    }
    this.persist();
    this.emit('rock-hit', { damage });
    if (broken) this.emit('rock-broken', {});
    return { damage, broken, drops };
  }

  advanceRock(): void {
    if (this.state.rockHp > 0) return;
    this.state.rockIndex = (this.state.rockIndex + 1) % ROCKS.length;
    this.state.rockHp = this.rock.maxHp;
    this.persist();
  }

  collect(id: string): { item: ItemDefinition; firstDiscovery: boolean } | undefined {
    const item = itemById(id);
    if (!item) return;
    const old = this.state.inventory[id];
    const firstDiscovery = !old;
    this.state.inventory[id] = { count: (old?.count ?? 0) + 1, firstFoundAt: old?.firstFoundAt ?? Date.now(), isNew: true, coreConverted: old?.coreConverted ?? 0 };
    this.persist();
    this.emit('item-collected', { item, firstDiscovery });
    return { item, firstDiscovery };
  }

  inspect(id: string): void { const entry = this.state.inventory[id]; if (entry) { entry.isNew = false; this.persist(); } }
  buy(id: UpgradeId): boolean {
    const upgrade = UPGRADES.find((candidate) => candidate.id === id);
    if (!upgrade) return false;
    const level = this.state.upgrades[id];
    const cost = upgradeCost(upgrade, level);
    if (level >= upgrade.maxLevel || this.state.coins < cost) return false;
    this.state.coins -= cost;
    this.state.upgrades[id] += 1;
    this.persist();
    this.emit('upgrade', { id });
    return true;
  }
  reset(): void { this.repo.clear(); this.state = this.repo.load(); this.emit('changed', {}); }

  private rollDrop(commonOnly: boolean): ItemDefinition {
    const all = ITEMS.filter((item) => this.rock.drops.includes(item.id));
    const pool = commonOnly ? all.filter((item) => item.rarity === 'COMMON') : all;
    const available = pool.length ? pool : all;
    let roll = this.random() * available.reduce((sum, item) => sum + item.weight, 0);
    for (const item of available) { roll -= item.weight; if (roll <= 0) return item; }
    return available[0]!;
  }
  private persist(): void { this.repo.save(this.state); this.emit('changed', {}); }
  private emit(name: GameEvent, detail: object): void { this.dispatchEvent(new CustomEvent(name, { detail })); }
}
