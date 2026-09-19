import test from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  private values = new Map<string,string>();
  getItem(key:string){return this.values.get(key)??null} setItem(key:string,value:string){this.values.set(key,value)} removeItem(key:string){this.values.delete(key)} clear(){this.values.clear()}
}
Object.defineProperty(globalThis,'localStorage',{value:new MemoryStorage(),configurable:true});
if (!globalThis.CustomEvent) Object.defineProperty(globalThis,'CustomEvent',{value:class<T> extends Event { detail:T;constructor(name:string,options:{detail:T}){super(name);this.detail=options.detail}}});
const { GameStore } = await import('../src/systems/GameStore.ts');

test('first rock funds a visible hammer upgrade and the next hit is stronger',()=>{
  localStorage.clear(); const store=new GameStore(()=>0.99); const before=store.damage;
  let last; while(store.state.rockHp>0) last=store.hit();
  assert.equal(last?.broken,true); assert.ok(store.state.coins>=16); assert.equal(last?.drops.length,2);
  assert.equal(store.buy('hammer'),true); assert.equal(store.damage,before+2);
  store.advanceRock(); assert.equal(store.hit().damage,before+2);
});

test('a normal hit can produce an intermediate common drop',()=>{
  localStorage.clear(); const store=new GameStore(()=>0);
  const hit=store.hit(); assert.equal(hit.broken,false); assert.equal(hit.drops.length,1); assert.equal(hit.drops[0]?.rarity,'COMMON');
});

test('collection and progression survive a reload',()=>{
  localStorage.clear(); const first=new GameStore(()=>0); first.collect('iron-flake'); first.hit();
  const second=new GameStore(()=>0); assert.equal(second.state.inventory['iron-flake']?.count,1);assert.equal(second.state.rockHp,10);
});
