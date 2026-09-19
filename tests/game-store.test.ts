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
  const hit=store.hit(); assert.equal(hit.broken,false); assert.equal(hit.drops.length,1); assert.equal(hit.drops[0]?.itemId,'iron-flake');
});

test('collection and progression survive a reload',()=>{
  localStorage.clear(); const first=new GameStore(()=>0); first.collect('iron-flake'); first.hit();
  const second=new GameStore(()=>0); assert.equal(second.state.inventory['iron-flake']?.count,1);assert.equal(second.state.rockHp,10);
});

test('queued drops survive navigation-style reloads and collect exactly once',()=>{
  localStorage.clear(); const store=new GameStore(()=>0);
  while(store.state.pendingDrops.length<12){while(store.state.rockHp>0)store.hit();store.advanceRock()}
  assert.ok(store.state.pendingDrops.length>=12);
  const generated=store.state.pendingDrops.length;const ids=store.state.pendingDrops.slice(0,4).map(drop=>drop.dropId);
  ids.forEach(id=>assert.ok(store.collectDrop(id)));
  assert.equal(store.collectDrop(ids[0]!),undefined);
  const reloaded=new GameStore(()=>0);
  assert.equal(reloaded.state.pendingDrops.length,generated-4);
  reloaded.state.pendingDrops.map(drop=>drop.dropId).forEach(id=>reloaded.collectDrop(id));
  assert.equal(Object.values(reloaded.state.inventory).reduce((sum,entry)=>sum+entry.count,0),generated);
});

test('new-player guarantees replace rolls and first two rocks compare 6 then 3 hits',()=>{
  localStorage.clear();const store=new GameStore(()=>0.99);
  store.hit();const second=store.hit();assert.equal(second.drops[0]?.itemId,'iron-flake');
  for(let i=0;i<4;i++)store.hit();assert.equal(store.state.pendingDrops.some(drop=>drop.itemId==='quartz'),true);
  assert.equal(store.buy('hammer'),true);store.advanceRock();assert.equal(store.rock.id,'claystone');
  let hits=0;while(store.state.rockHp>0){store.hit();hits++}assert.equal(hits,3);
});

test('v2 saves migrate without receiving new-player guarantees',()=>{
  localStorage.clear();localStorage.setItem('break-the-rock.save',JSON.stringify({version:2,coins:4,rockIndex:0,rockHp:8,rocksBroken:0,inventory:{},upgrades:{hammer:0,chisel:0,bag:0},settings:{sound:true,haptics:true}}));
  const store=new GameStore(()=>0.99);assert.equal(store.state.onboarding.eligible,false);assert.deepEqual(store.state.pendingDrops,[]);store.hit();store.hit();assert.equal(store.state.pendingDrops.length,0);
});
