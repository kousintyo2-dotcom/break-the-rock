export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type ItemCategory = '鉱石' | '宝石' | '化石' | '骨' | '遺物';
export interface ItemDefinition { id:string; name:string; category:ItemCategory; rarity:Rarity; area:string; description:string; glyph:string; color:string; weight:number }
export interface RockDefinition { id:string; name:string; subtitle:string; maxHp:number; reward:number; color:string; shadow:string; drops:string[] }
export type UpgradeId = 'hammer'|'chisel'|'bag';
export interface UpgradeDefinition { id:UpgradeId; name:string; icon:string; description:string; effectLabel:(level:number)=>string; baseCost:number; costScale:number; maxLevel:number }
