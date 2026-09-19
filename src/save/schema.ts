import type { UpgradeId } from '../data/types';
export const SAVE_VERSION=1;
export interface InventoryEntry { count:number; firstFoundAt:number; isNew:boolean; coreConverted:number }
export interface SaveData { version:number; coins:number; corePoints:number; rockIndex:number; rockHp:number; rocksBroken:number; inventory:Record<string,InventoryEntry>; upgrades:Record<UpgradeId,number>; settings:{sound:boolean;haptics:boolean} }
export const createDefaultSave=():SaveData=>({version:SAVE_VERSION,coins:0,corePoints:0,rockIndex:0,rockHp:24,rocksBroken:0,inventory:{},upgrades:{hammer:0,chisel:0,bag:0},settings:{sound:true,haptics:true}});
