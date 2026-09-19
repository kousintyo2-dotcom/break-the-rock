import { ITEMS, ROCKS, UPGRADES, itemById, upgradeCost } from '../data/content';
import type { ItemDefinition, UpgradeId } from '../data/types';
import type { SaveData } from '../save/schema';
import { SaveRepository } from '../save/SaveRepository';
export type GameEvent='changed'|'rock-hit'|'rock-broken'|'item-collected'|'upgrade';
export class GameStore extends EventTarget {
 readonly repo=new SaveRepository(); state:SaveData=this.repo.load();
 get rock(){return ROCKS[this.state.rockIndex%ROCKS.length]??ROCKS[0]!}
 get damage(){return 1+this.state.upgrades.hammer}
 hit():{damage:number;broken:boolean;drops:ItemDefinition[]} { const damage=Math.min(this.damage,this.state.rockHp); this.state.rockHp-=damage; let drops:ItemDefinition[]=[]; const chipChance=.2+this.state.upgrades.chisel*.015; if(Math.random()<chipChance)drops=[this.rollDrop()]; let broken=false; if(this.state.rockHp<=0){broken=true;this.state.coins+=this.rock.reward;this.state.rocksBroken++;drops.push(this.rollDrop());if(Math.random()<.26+this.state.upgrades.chisel*.08)drops.push(this.rollDrop()); this.state.rockIndex=(this.state.rockIndex+1)%ROCKS.length;this.state.rockHp=this.rock.maxHp} this.persist();this.emit('rock-hit',{damage});if(broken)this.emit('rock-broken',{});return{damage,broken,drops} }
 collect(id:string){const item=itemById(id);if(!item)return;const old=this.state.inventory[id];this.state.inventory[id]={count:(old?.count??0)+1,firstFoundAt:old?.firstFoundAt??Date.now(),isNew:true,coreConverted:old?.coreConverted??0};this.persist();this.emit('item-collected',{item})}
 inspect(id:string){const entry=this.state.inventory[id];if(entry){entry.isNew=false;this.persist()}}
 buy(id:UpgradeId){const u=UPGRADES.find(x=>x.id===id);if(!u)return false;const level=this.state.upgrades[id];const cost=upgradeCost(u,level);if(level>=u.maxLevel||this.state.coins<cost)return false;this.state.coins-=cost;this.state.upgrades[id]++;this.persist();this.emit('upgrade',{id});return true}
 reset(){this.repo.clear();this.state=this.repo.load();this.emit('changed',{})}
 private rollDrop(){const pool=ITEMS.filter(i=>this.rock.drops.includes(i.id));let roll=Math.random()*pool.reduce((a,b)=>a+b.weight,0);for(const item of pool){roll-=item.weight;if(roll<=0)return item}return pool[0]!}
 private persist(){this.repo.save(this.state);this.emit('changed',{})}
 private emit(name:GameEvent,detail:object){this.dispatchEvent(new CustomEvent(name,{detail}))}
}
