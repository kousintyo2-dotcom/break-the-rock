import test from 'node:test';import assert from 'node:assert/strict';import {ITEMS,ROCKS,UPGRADES,upgradeCost} from '../src/data/content.ts';
test('content identifiers are unique and all rock drops resolve',()=>{assert.equal(new Set(ITEMS.map(i=>i.id)).size,ITEMS.length);for(const rock of ROCKS)for(const id of rock.drops)assert.ok(ITEMS.some(i=>i.id===id))});
test('upgrade costs rise monotonically',()=>{for(const upgrade of UPGRADES)assert.ok(upgradeCost(upgrade,1)>upgradeCost(upgrade,0))});
test('vertical slice provides expected content breadth',()=>{assert.ok(ITEMS.length>=5&&ITEMS.length<=8);assert.equal(ROCKS.length,2);assert.ok(UPGRADES.length>=2&&UPGRADES.length<=4)});
