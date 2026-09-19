import type { GameStore } from '../systems/GameStore';
export class SettingsPanel {
  root=document.createElement('dialog');
  constructor(private store:GameStore){this.root.className='settings-panel';this.render()}
  open(){this.render();this.root.showModal()}
  private render(){const s=this.store.state.settings;this.root.innerHTML=`<button class="dialog-close" aria-label="閉じる">×</button><span class="eyebrow">SETTINGS</span><h2>環境設定</h2><label><span>効果音</span><input type="checkbox" data-setting="sound" ${s.sound?'checked':''}></label><label><span>振動</span><input type="checkbox" data-setting="haptics" ${s.haptics?'checked':''}></label><label><span>演出を軽減</span><input type="checkbox" data-setting="reducedMotion" ${s.reducedMotion?'checked':''}></label>`;this.root.querySelector('.dialog-close')!.addEventListener('click',()=>this.root.close());this.root.querySelectorAll<HTMLInputElement>('[data-setting]').forEach(input=>input.addEventListener('change',()=>{const key=input.dataset.setting as keyof typeof s;this.store.state.settings[key]=input.checked;this.store.repo.save(this.store.state);this.store.dispatchEvent(new CustomEvent('changed',{detail:{}}))}))}
}
