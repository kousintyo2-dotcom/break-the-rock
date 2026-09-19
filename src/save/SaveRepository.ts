import { createDefaultSave, type SaveData, SAVE_VERSION } from './schema';
const KEY='break-the-rock.save';
export class SaveRepository {
 load():SaveData { try { const raw=localStorage.getItem(KEY); if(!raw)return createDefaultSave(); return this.migrate(JSON.parse(raw) as Partial<SaveData>); } catch{return createDefaultSave()} }
 save(data:SaveData){localStorage.setItem(KEY,JSON.stringify(data))}
 clear(){localStorage.removeItem(KEY)}
 private migrate(raw:Partial<SaveData>):SaveData { const base=createDefaultSave(); return {...base,...raw,version:SAVE_VERSION,inventory:raw.inventory??{},upgrades:{...base.upgrades,...raw.upgrades},settings:{...base.settings,...raw.settings}} }
}
