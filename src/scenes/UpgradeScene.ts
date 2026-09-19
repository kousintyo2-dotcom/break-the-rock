import { UPGRADES, upgradeCost } from '../data/content';
import type { UpgradeId } from '../data/types';
import { AudioEngine } from '../effects/AudioEngine';
import type { GameStore } from '../systems/GameStore';

export class UpgradeScene {
  root = document.createElement('section');
  private readonly audio = new AudioEngine();
  private readonly changed=()=>this.render();
  constructor(private readonly store: GameStore, audio?:AudioEngine) { this.audio=audio??new AudioEngine();this.root.className = 'scene scroll-scene'; this.audio.enabled=store.state.settings.sound; this.store.addEventListener('changed',this.changed);this.render(); }
  destroy():void{this.store.removeEventListener('changed',this.changed)}
  render(): void {
    this.root.innerHTML = `<header class="page-title"><span class="eyebrow">WORKBENCH</span><h1>調査道具</h1><p>集めた調査資金で、次の一打を確かなものに。</p></header><div class="funds"><span>使用できる調査資金</span><b>${this.store.state.coins} c</b></div><div class="upgrade-list">${UPGRADES.filter((upgrade)=>upgrade.id!=='bag').map((upgrade)=>{const level=this.store.state.upgrades[upgrade.id],cost=upgradeCost(upgrade,level),max=level>=upgrade.maxLevel;return `<article class="upgrade-card" data-card="${upgrade.id}"><div class="upgrade-icon">${upgrade.icon}</div><div class="upgrade-copy"><div class="upgrade-heading"><h2>${upgrade.name}</h2><span>LV. ${level}</span></div><p>${upgrade.description}</p><div class="effect">${max?'最大レベル':upgrade.effectLabel(level)}</div><button data-buy="${upgrade.id}" ${max||this.store.state.coins<cost?'disabled':''}>${max?'強化完了':`強化する　${cost} c`}</button></div></article>`}).join('')}</div>`;
    this.root.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach((button)=>button.addEventListener('click',()=>{const id=button.dataset.buy as UpgradeId;if(this.store.buy(id)){this.audio.upgrade();requestAnimationFrame(()=>this.root.querySelector(`[data-card="${id}"]`)?.classList.add('upgraded'));}}));
  }
}
