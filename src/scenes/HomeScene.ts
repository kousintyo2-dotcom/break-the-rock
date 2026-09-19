import { DroppedItem } from '../entities/DroppedItem';
import { RockRenderer } from '../entities/RockRenderer';
import { impactParticles, updateParticles, type Particle } from '../effects/Particles';
import { AudioEngine } from '../effects/AudioEngine';
import type { GameStore } from '../systems/GameStore';
import type { ItemDefinition } from '../data/types';

export class HomeScene {
  root = document.createElement('section');
  private readonly canvas = document.createElement('canvas');
  private readonly context = this.canvas.getContext('2d')!;
  private readonly rockRenderer = new RockRenderer();
  private readonly drops: DroppedItem[] = [];
  private particles: Particle[] = [];
  private readonly audio = new AudioEngine();
  private last = performance.now();
  private frame = 0;
  private shake = 0;
  private freezeUntil = 0;
  private impact = { x: 0, y: 0, life: 0 };
  private rockOffset = { x: 0, y: 0 };
  private breaking = 0;
  private entering = 0;
  private transitionLocked = false;
  private resizeObserver?: ResizeObserver;
  private displayedHp = 1;

  constructor(private readonly store: GameStore) {
    this.root.className = 'scene home-scene';
    this.root.innerHTML = `<header class="scene-header"><div><span class="eyebrow">FIELD SITE 01</span><h1>赤土の採掘場</h1></div><div class="currency"><span>調査資金</span><strong data-coins>0</strong></div></header><div class="progress-card"><div><span data-rock-subtitle></span><strong data-rock-name></strong></div><span data-rock-count></span></div><div class="mine-stage"><div class="hp-panel"><div class="hp-label"><b>岩の耐久度</b><span data-hp></span></div><div class="hp-track"><i data-hpbar></i><em data-hitbar></em></div></div><div class="drop-hint">発見物は直接タップして回収</div><button class="mine-button" type="button"><span class="tool-mark">⚒</span><span><b>岩を叩く</b><small data-power></small></span></button></div><div class="toast" role="status"></div><div class="discovery" aria-live="polite"><span>NEW DISCOVERY</span><div data-discovery-glyph></div><b data-discovery-name></b><small>コレクションに登録しました</small></div>`;
    this.root.querySelector('.mine-stage')!.prepend(this.canvas);
    this.root.querySelector('.mine-button')!.addEventListener('click', () => this.hitRock(this.canvas.clientWidth / 2, this.canvas.clientHeight * 0.4));
    this.canvas.addEventListener('pointerdown', (event) => this.pointer(event));
    this.resizeObserver = new ResizeObserver(() => this.size());
    this.resizeObserver.observe(this.canvas.parentElement!);
    this.store.addEventListener('changed', () => this.renderHud());
    this.audio.enabled = this.store.state.settings.sound;
    if (this.store.state.rockHp <= 0) this.store.advanceRock();
    this.displayedHp = this.store.state.rockHp;
    this.renderHud(); this.size(); this.frame = requestAnimationFrame((time) => this.loop(time));
  }

  destroy(): void { cancelAnimationFrame(this.frame); this.resizeObserver?.disconnect(); }

  private size(): void {
    const box = this.canvas.parentElement!.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 2);
    this.canvas.width = box.width * dpr; this.canvas.height = box.height * dpr;
    this.canvas.style.width = `${box.width}px`; this.canvas.style.height = `${box.height}px`;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private hitRock(pointerX: number, pointerY: number): void {
    if (this.transitionLocked || performance.now() < this.freezeUntil) return;
    const result = this.store.hit();
    if (!result.damage) return;
    const centerX = this.canvas.clientWidth / 2; const centerY = this.canvas.clientHeight * 0.41;
    const directionX = Math.max(-1, Math.min(1, (pointerX - centerX) / 100));
    const directionY = Math.max(-1, Math.min(1, (pointerY - centerY) / 100));
    this.rockOffset = { x: directionX * 4, y: 3 + directionY * 2 };
    this.impact = { x: centerX + directionX * 75, y: centerY + directionY * 55, life: 0.11 };
    this.shake = result.broken ? 9 : 3.5;
    this.freezeUntil = performance.now() + (result.broken ? 85 : 52);
    this.particles.push(...impactParticles(this.impact.x, this.impact.y, this.store.rock.color, result.broken ? 2 : 0.75));
    this.audio.hit(result.damage);
    if (this.store.state.settings.haptics) navigator.vibrate?.(result.broken ? [25, 30, 32] : 10);
    result.drops.slice(0, Math.max(0, 8 - this.drops.length)).forEach((item, index) => setTimeout(() => this.spawnDrop(item, index), 80 + index * 115));
    if (result.broken) this.breakRock();
  }

  private breakRock(): void {
    this.transitionLocked = true; this.audio.breakRock();
    setTimeout(() => { this.breaking = 0.01; this.particles.push(...impactParticles(this.canvas.clientWidth / 2, this.canvas.clientHeight * 0.55, '#786451', 2.6)); }, 90);
    setTimeout(() => {
      this.store.advanceRock(); this.breaking = 0; this.entering = 0.01; this.transitionLocked = false;
      this.displayedHp = this.store.state.rockHp; this.renderHud();
    }, 850);
  }

  private spawnDrop(item: ItemDefinition, index: number): void {
    const direction = index % 2 === 0 ? -1 : 1;
    this.drops.push(new DroppedItem(item, this.canvas.clientWidth / 2 + direction * 8, this.canvas.clientHeight * 0.38, direction));
  }

  private pointer(event: PointerEvent): void {
    const bounds = this.canvas.getBoundingClientRect(); const x = event.clientX - bounds.left; const y = event.clientY - bounds.top;
    for (let index = this.drops.length - 1; index >= 0; index--) {
      const drop = this.drops[index]!;
      if (drop.hit(x, y)) { this.drops.splice(index, 1); this.collect(drop); return; }
    }
    const centerX = this.canvas.clientWidth / 2; const centerY = this.canvas.clientHeight * 0.41;
    if (Math.hypot(x - centerX, y - centerY) < 125) this.hitRock(x, y);
  }

  private collect(drop: DroppedItem): void {
    const result = this.store.collect(drop.item.id); if (!result) return;
    this.audio.collect(); this.showToast(`${drop.item.glyph} ${drop.item.name}　+1`);
    const fly = document.createElement('span'); fly.className = 'collect-fly'; fly.textContent = drop.item.glyph;
    fly.style.left = `${drop.x}px`; fly.style.top = `${drop.y + 88}px`; fly.style.setProperty('--item', drop.item.color); this.root.append(fly);
    setTimeout(() => fly.remove(), 460);
    if (result.firstDiscovery) { this.freezeUntil = performance.now() + 260; this.audio.discover(); this.showDiscovery(drop.item.glyph, drop.item.name); }
  }

  private showDiscovery(glyph: string, name: string): void {
    const panel = this.root.querySelector('.discovery')!; this.set('[data-discovery-glyph]', glyph); this.set('[data-discovery-name]', name);
    panel.classList.add('show'); setTimeout(() => panel.classList.remove('show'), 1150);
  }
  private showToast(text: string): void { const element = this.root.querySelector('.toast')!; element.textContent = text; element.classList.remove('show'); void (element as HTMLElement).offsetWidth; element.classList.add('show'); }
  private renderHud(): void {
    const state = this.store.state; const rock = this.store.rock;
    this.set('[data-coins]', `${state.coins} c`); this.set('[data-rock-name]', rock.name); this.set('[data-rock-subtitle]', rock.subtitle);
    this.set('[data-rock-count]', `${state.rocksBroken} 岩石を調査済み`); this.set('[data-hp]', `${state.rockHp} / ${rock.maxHp}`); this.set('[data-power]', `採掘力 ${this.store.damage}`);
  }
  private set(selector: string, text: string): void { const element = this.root.querySelector(selector); if (element) element.textContent = text; }
  private loop(now: number): void { const dt = Math.min((now - this.last) / 1000, 0.034); this.last = now; if (now >= this.freezeUntil) this.draw(dt); this.frame = requestAnimationFrame((time) => this.loop(time)); }

  private draw(dt: number): void {
    const context = this.context; const width = this.canvas.clientWidth; const height = this.canvas.clientHeight; const ground = height * 0.74;
    context.clearRect(0, 0, width, height); context.save();
    if (this.shake > 0) { context.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake); this.shake = Math.max(0, this.shake - 38 * dt); }
    context.fillStyle = '#312920'; context.fillRect(0, ground, width, height - ground);
    context.strokeStyle = '#4b3b2c'; context.lineWidth = 2; for (let index=0; index<9; index++) { context.beginPath(); context.moveTo((index*73)%width,ground+11+(index%3)*9);context.lineTo(((index*73)+28)%width,ground+9+(index%3)*9);context.stroke(); }
    this.displayedHp += (this.store.state.rockHp - this.displayedHp) * Math.min(1, dt * 10);
    const ratio = Math.max(0, this.displayedHp / this.store.rock.maxHp);
    if (this.breaking > 0) this.breaking = Math.min(1, this.breaking + dt * 2.8);
    if (this.entering > 0) { this.entering = Math.min(1, this.entering + dt * 2.2); if (this.entering === 1) this.entering = 0; }
    this.rockRenderer.draw(context, this.store.rock, { x: width/2 + this.rockOffset.x, y: height*.41 + this.rockOffset.y, impactX:this.impact.x, impactY:this.impact.y, damageRatio:ratio, breaking:this.breaking, entering:this.entering });
    this.rockOffset.x *= Math.max(0, 1-dt*22); this.rockOffset.y *= Math.max(0, 1-dt*22);
    this.drawImpact(context, dt);
    this.drops.forEach((drop) => { drop.update(dt, ground, width); context.save(); context.translate(drop.x,drop.y);context.rotate(drop.rotation);context.shadowColor='rgba(0,0,0,.45)';context.shadowBlur=7;context.shadowOffsetY=4;context.fillStyle=drop.item.color;context.beginPath();context.roundRect(-23,-23,46,46,drop.item.rarity==='COMMON'?9:14);context.fill();context.shadowColor='transparent';context.strokeStyle='#dbc9a6';context.lineWidth=2;context.stroke();context.fillStyle='#251f1a';context.font='bold 22px serif';context.textAlign='center';context.textBaseline='middle';context.fillText(drop.item.glyph,0,1);context.restore(); });
    this.particles = updateParticles(this.particles, dt); this.particles.forEach((particle) => { context.globalAlpha=Math.min(1,particle.life/particle.maxLife);context.fillStyle=particle.color;if(particle.kind==='dust'){context.beginPath();context.arc(particle.x,particle.y,particle.size*(1-particle.life/particle.maxLife*.4),0,Math.PI*2);context.fill();}else context.fillRect(particle.x,particle.y,particle.size,particle.size); }); context.globalAlpha=1; context.restore();
    const hp = this.root.querySelector<HTMLElement>('[data-hpbar]'); const hit = this.root.querySelector<HTMLElement>('[data-hitbar]'); if (hp) hp.style.width=`${ratio*100}%`; if(hit) hit.style.width=`${Math.max(ratio, this.store.state.rockHp/this.store.rock.maxHp)*100}%`;
  }

  private drawImpact(context: CanvasRenderingContext2D, dt: number): void { if(this.impact.life<=0)return;this.impact.life-=dt;context.save();context.translate(this.impact.x,this.impact.y);context.strokeStyle=`rgba(244,225,185,${Math.max(0,this.impact.life*7)})`;context.lineWidth=3;for(let i=0;i<4;i++){context.rotate(Math.PI/2);context.beginPath();context.moveTo(8,0);context.lineTo(18,0);context.stroke();}context.restore(); }
}
