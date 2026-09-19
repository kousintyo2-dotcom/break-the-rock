import type { ItemDefinition, RockDefinition, UpgradeDefinition } from './types';
export const ITEMS: ItemDefinition[] = [
 {id:'iron-flake',name:'赤鉄鉱の欠片',category:'鉱石',rarity:'COMMON',area:'赤土の採掘場',description:'赤錆色の小さな鉱石。道具づくりの基礎素材。',glyph:'◆',color:'#9d5943',weight:34},
 {id:'quartz',name:'曇り水晶',category:'宝石',rarity:'UNCOMMON',area:'赤土の採掘場',description:'土の中で眠っていた、淡く透ける結晶。',glyph:'◇',color:'#d8c8a6',weight:22},
 {id:'shell',name:'巻貝の化石',category:'化石',rarity:'UNCOMMON',area:'赤土の採掘場',description:'この土地が海だった記憶を残す標本。',glyph:'◉',color:'#c9aa78',weight:17},
 {id:'old-coin',name:'摩耗した硬貨',category:'遺物',rarity:'RARE',area:'赤土の採掘場',description:'紋章はほぼ消えている。誰が落としたのだろう。',glyph:'●',color:'#a88950',weight:10},
 {id:'amber',name:'琥珀片',category:'宝石',rarity:'RARE',area:'赤土の採掘場',description:'樹脂の時を閉じ込めた、温かな色のかけら。',glyph:'⬟',color:'#c8832e',weight:7},
 {id:'tooth',name:'古獣の歯',category:'骨',rarity:'EPIC',area:'赤土の採掘場',description:'大きな咬み跡を残す、正体不明の古い歯。',glyph:'▲',color:'#ddd0ad',weight:4},
 {id:'seal',name:'石の封印片',category:'遺物',rarity:'LEGENDARY',area:'赤土の採掘場',description:'刻印がかすかに脈打つように見える謎の石片。',glyph:'✦',color:'#6c765c',weight:1}
];
export const ROCKS: RockDefinition[] = [
 {id:'claystone',name:'赤土の岩塊',subtitle:'第1層・地表近く',maxHp:24,reward:8,color:'#796053',shadow:'#433730',drops:ITEMS.slice(0,5).map(i=>i.id)},
 {id:'fossil-rock',name:'化石を抱く岩',subtitle:'第1層・古い堆積層',maxHp:38,reward:13,color:'#696257',shadow:'#3d3933',drops:ITEMS.map(i=>i.id)}
];
export const UPGRADES: UpgradeDefinition[] = [
 {id:'hammer',name:'地質ハンマー',icon:'⚒',description:'一打の重みを増し、岩へ与えるダメージを上げる。',effectLabel:l=>`採掘力 ${1+l} → ${2+l}`,baseCost:18,costScale:1.65,maxLevel:12},
 {id:'chisel',name:'鋼のチゼル',icon:'╱',description:'岩の割れ目を見抜き、破壊時の発見数を増やす。',effectLabel:l=>`追加発見率 ${l*8}% → ${(l+1)*8}%`,baseCost:28,costScale:1.72,maxLevel:10},
 {id:'bag',name:'革のフィールドバッグ',icon:'▣',description:'発見物を安全に持ち帰る。将来の容量機能にも対応。',effectLabel:l=>`収蔵容量 ${20+l*10} → ${30+l*10}`,baseCost:36,costScale:1.8,maxLevel:8}
];
export const itemById=(id:string)=>ITEMS.find(i=>i.id===id);
export const upgradeCost=(upgrade:UpgradeDefinition,level:number)=>Math.round(upgrade.baseCost*upgrade.costScale**level);
