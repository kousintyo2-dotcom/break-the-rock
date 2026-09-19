import type { UpgradeId } from '../data/types';

export const SAVE_VERSION = 3;
export interface InventoryEntry { count: number; firstFoundAt: number; isNew: boolean; coreConverted: number }
export interface PendingDrop { dropId: string; itemId: string; createdAt: number }
export interface OnboardingState { eligible: boolean; guaranteedIron: boolean; guaranteedQuartz: boolean }
export interface SaveData {
  version: number; coins: number; corePoints: number; rockIndex: number; rockHp: number; rocksBroken: number;
  inventory: Record<string, InventoryEntry>; upgrades: Record<UpgradeId, number>;
  pendingDrops: PendingDrop[]; rockHits: number; onboarding: OnboardingState;
  settings: { sound: boolean; haptics: boolean; reducedMotion: boolean };
}
export const createDefaultSave = (): SaveData => ({
  version: SAVE_VERSION, coins: 0, corePoints: 0, rockIndex: 0, rockHp: 12, rocksBroken: 0,
  inventory: {}, upgrades: { hammer: 0, chisel: 0, bag: 0 }, pendingDrops: [], rockHits: 0,
  onboarding: { eligible: true, guaranteedIron: false, guaranteedQuartz: false },
  settings: { sound: true, haptics: true, reducedMotion: false },
});
