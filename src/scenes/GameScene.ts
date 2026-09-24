import Phaser from 'phaser';
import { AudioManager } from '../audio/AudioManager.ts';
import { FEEL } from '../config/feel.ts';
import { TUNING } from '../config/tuning.ts';
import { AREAS, areaForWall } from '../data/assets.ts';
import { MATERIALS } from '../data/wallTypes.ts';
import { BreakEffects } from '../effects/BreakEffects.ts';
import { Haptics } from '../effects/Haptics.ts';
import { ParticlePool } from '../effects/ParticlePool.ts';
import { CoreView } from '../entities/CoreView.ts';
import { WallField } from '../entities/WallField.ts';
import type { SaveData, Settings } from '../save/saveData.ts';
import { SaveStore } from '../save/SaveStore.ts';
import {
  applyRunResult,
  buyUpgrade,
  claimSpecial,
  pendingMilestone,
  rollSpecialOffer,
  statsFromSave,
} from '../systems/progress.ts';
import { estimateWalls, simulateRun, type BreakEvent, type RunResult } from '../systems/runSimulator.ts';
import type { RunStats, StatId } from '../systems/stats.ts';
import { statPreview } from '../systems/upgrades.ts';
import { Banners } from '../ui/Banners.ts';
import { BottomBar } from '../ui/BottomBar.ts';
import { FloatingTexts } from '../ui/FloatingTexts.ts';
import { Hud } from '../ui/Hud.ts';
import { ResultPanel } from '../ui/ResultPanel.ts';
import { SettingsOverlay } from '../ui/SettingsOverlay.ts';
import { SpecialPicker } from '../ui/SpecialPicker.ts';
import { StopReadout } from '../ui/StopReadout.ts';
import { COLORS, TEXT } from '../ui/theme.ts';
import { formatNumber } from '../utils/format.ts';

type Phase = 'idle' | 'windup' | 'running' | 'stopped' | 'results' | 'picker' | 'resetting';

const { width: W, height: H } = FEEL.view;
const L = FEEL.layout;

/**
 * The only gameplay scene. Launch → break walls → stop → results/upgrade → again,
 * all without scene switches. Rules come from pure systems; this class plays them back.
 */
export class GameScene extends Phaser.Scene {
  private store!: SaveStore;
  private save!: SaveData;
  private stats!: RunStats;
  private readonly audio = new AudioManager();
  private readonly haptics = new Haptics();

  private worldLayer!: Phaser.GameObjects.Layer;
  private uiLayer!: Phaser.GameObjects.Layer;
  private backgrounds: Phaser.GameObjects.TileSprite[] = [];
  private areaIndex = 0;
  private field!: WallField;
  private core!: CoreView;
  private debris!: ParticlePool;
  private fxPool!: ParticlePool;
  private trail!: ParticlePool;
  private effects!: BreakEffects;
  private floaters!: FloatingTexts;
  private speedLines: { img: Phaser.GameObjects.Image; v: number }[] = [];
  private flashRect!: Phaser.GameObjects.Rectangle;
  private upcoming!: Phaser.GameObjects.Text;

  private hud!: Hud;
  private bottom!: BottomBar;
  private readout!: StopReadout;
  private banners!: Banners;
  private results!: ResultPanel;
  private picker!: SpecialPicker;
  private settingsOverlay!: SettingsOverlay;

  private phase: Phase = 'idle';
  private run: RunResult | null = null;
  private eventIndex = 0;
  private speed = 0;
  private hitStop = 0;
  private slowMo = 0;
  private surge = 0;
  private rushLevel = 0;
  private runScrap = 0;
  private lastStopBefore: { wall: number; damage: number } | null = null;

  constructor() {
    super('game');
  }

  create(): void {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.store = new SaveStore(undefined, reducedMotion);
    if (new URLSearchParams(location.search).has('reset')) this.store.reset();
    this.save = this.store.load();
    this.stats = statsFromSave(this.save);

    this.worldLayer = this.add.layer().setDepth(0);
    this.uiLayer = this.add.layer().setDepth(1);
    const uiCam = this.cameras.add(0, 0, W, H);
    this.cameras.main.ignore(this.uiLayer);
    uiCam.ignore(this.worldLayer);
    this.cameras.main.setBackgroundColor(COLORS.ground);
    this.cameras.main.scrollY = -FEEL.view.extra;

    this.createWorld();
    this.createUi();
    this.applySettings(this.save.settings);

    this.resetWorld();
    this.hud.setScrap(this.save.scrap, true);
    this.enterIdle();

    // First interaction unlocks WebAudio on mobile.
    this.input.once('pointerdown', () => this.audio.unlock());
    const onVisibility = () => (document.hidden ? this.audio.suspend() : this.audio.resume());
    document.addEventListener('visibilitychange', onVisibility);
    this.events.once('shutdown', () => document.removeEventListener('visibilitychange', onVisibility));

    // A milestone reached before a reload still gets its pick.
    const pending = pendingMilestone(this.save);
    if (pending !== null) this.time.delayedCall(300, () => this.openPicker(pending, () => this.enterIdle()));
  }

  // ---------------------------------------------------------------- setup

  private createWorld(): void {
    const bgHeight = L.fieldBottom - 10;
    for (const area of AREAS) {
      const tex = this.textures.get(area.texture).get('__BASE');
      const scale = bgHeight / tex.height;
      const bg = this.add.tileSprite(0, 10, W, bgHeight, area.texture).setOrigin(0).setScrollFactor(0, 1);
      bg.setTileScale(scale, scale).setAlpha(area === AREAS[0] ? 1 : 0);
      this.worldLayer.add(bg);
      this.backgrounds.push(bg);
    }
    // Darken the backdrop so walls and core read clearly.
    const shade = this.add.rectangle(0, 0, W, L.fieldBottom, 0x0b0907, 0.28).setOrigin(0).setScrollFactor(0, 1);
    // Blend the top of the backdrop into the dark band behind the HUD.
    const fade = this.add.graphics().setScrollFactor(0, 1);
    fade.fillGradientStyle(COLORS.ground, COLORS.ground, COLORS.ground, COLORS.ground, 1, 1, 0, 0);
    fade.fillRect(0, 0, W, 170);
    fade.fillStyle(COLORS.ground, 1);
    fade.fillRect(0, -FEEL.view.extra - 10, W, FEEL.view.extra + 10);
    this.worldLayer.add([shade, fade]);

    this.field = new WallField(this, this.worldLayer);
    this.trail = new ParticlePool(this, this.worldLayer, 40, 30);
    this.core = new CoreView(this, this.worldLayer);
    this.debris = new ParticlePool(this, this.worldLayer, FEEL.debris.maxPieces, 50);
    this.fxPool = new ParticlePool(this, this.worldLayer, 40, 45);
    this.effects = new BreakEffects(this.debris, this.fxPool);
    this.floaters = new FloatingTexts(this, this.worldLayer);

    for (let i = 0; i < 14; i++) {
      const img = this.add.image(0, 0, 'line').setScrollFactor(0, 1).setBlendMode(Phaser.BlendModes.ADD).setVisible(false).setDepth(70);
      this.worldLayer.add(img);
      this.speedLines.push({ img, v: 0 });
    }
  }

  private createUi(): void {
    this.hud = new Hud(this);
    this.bottom = new BottomBar(
      this,
      () => this.onBreakPressed(),
      () => this.openSettings(),
    );
    this.readout = new StopReadout(this);
    this.banners = new Banners(this);
    this.results = new ResultPanel(
      this,
      (stat) => this.onBuy(stat),
      () => this.onBreakAgain(),
    );
    this.picker = new SpecialPicker(this);
    this.settingsOverlay = new SettingsOverlay(
      this,
      this.save.settings,
      (s) => {
        this.applySettings(s);
        this.persist();
        this.audio.play('tap');
      },
      () => this.resetSave(),
    );
    this.flashRect = this.add.rectangle(0, 0, W, H, 0xffffff, 0).setOrigin(0).setDepth(140);
    this.upcoming = this.add.text(W - 18, 300, '', { fontFamily: 'system-ui', fontSize: '20px', fontStyle: '900', color: TEXT.gold, resolution: 2 }).setOrigin(1, 0.5).setDepth(110);
    this.uiLayer.add([
      this.hud.root,
      this.upcoming,
      this.readout.root,
      this.banners.root,
      this.flashRect,
      this.bottom.root,
      this.results.root,
      this.picker.root,
      this.settingsOverlay.root,
    ]);
  }

  private applySettings(s: Settings): void {
    this.save.settings = s;
    this.haptics.enabled = s.vibration;
    this.audio.setVolumes(s.sfx, s.bgm);
  }

  private persist(): void {
    this.store.save(this.save);
  }

  private resetSave(): void {
    const settings = this.save.settings;
    this.save = this.store.reset();
    this.save.settings = settings;
    this.persist();
    this.stats = statsFromSave(this.save);
    this.results.hide();
    this.resetWorld();
    this.hud.setScrap(0, true);
    this.enterIdle();
  }

  // ---------------------------------------------------------------- flow

  private enterIdle(): void {
    this.phase = 'idle';
    this.stats = statsFromSave(this.save);
    this.hud.setBest(this.save.best);
    this.hud.setPower(this.stats.power);
    this.hud.setSpecials(this.save.specials);
    this.hud.setGauge(1, true);
    const est = estimateWalls(this.stats);
    this.bottom.setEstimate(est.low, est.high);
    this.bottom.setHint(this.save.runs === 0 ? 'TAP BREAK' : '');
    this.bottom.setReady(true);
  }

  private resetWorld(): void {
    this.eventIndex = 0;
    this.speed = 0;
    this.hitStop = 0;
    this.slowMo = 0;
    this.surge = 0;
    this.rushLevel = 0;
    this.runScrap = 0;
    this.core.x = 0;
    this.core.offsetX = 0;
    this.core.intensity = 0;
    this.core.setForm(this.save.levels.power >= TUNING.coreForm2PowerLevel ? 1 : 0);
    this.field.reset(this.save.best, this.save.lastStop);
    this.cameras.main.scrollX = this.core.x - W * L.coreScreenX;
    this.field.update(this.cameras.main.scrollX, true);
    this.setArea(0, true);
    this.debris.clear();
    this.fxPool.clear();
    this.trail.clear();
    this.floaters.clear();
    this.banners.clear();
    this.readout.hide();
    this.hud.setWall(0);
    this.hud.setBestHot(false);
    this.audio.setDrive(0);
  }

  private onBreakPressed(): void {
    if (this.phase !== 'idle') return;
    this.audio.unlock();
    this.startRun();
  }

  private onBreakAgain(): void {
    if (this.phase !== 'results') return;
    this.audio.unlock();
    this.audio.play('tap');
    this.phase = 'resetting';
    this.results.hide();
    const cam = this.cameras.main;
    cam.fadeOut(110, 13, 11, 9);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.resetWorld();
      cam.fadeIn(160, 13, 11, 9);
      this.startRun();
    });
  }

  private startRun(): void {
    this.phase = 'windup';
    this.stats = statsFromSave(this.save);
    this.lastStopBefore = this.save.lastStop;
    this.run = simulateRun(this.stats, this.save.best, Math.random);
    this.bottom.setReady(false);
    this.bottom.setHint('');
    this.hud.setPower(this.stats.power);
    this.hud.setGauge(1, true);
    this.core.intensity = 1;
    this.effects.charge(this.core.x, this.core.y);
    this.tweens.add({
      targets: this.core,
      offsetX: -FEEL.launch.pullBack,
      duration: FEEL.launch.windupMs,
      ease: 'Quad.out',
      onComplete: () => this.launch(),
    });
  }

  private launch(): void {
    this.phase = 'running';
    this.core.x += this.core.offsetX;
    this.core.offsetX = 0;
    this.speed = FEEL.launch.speed;
    this.audio.play('launch');
    this.audio.setDrive(1);
    this.haptics.pulse('light');
    this.shake(FEEL.shake.normal * 0.6, 90);
    for (let i = 0; i < 8; i++) {
      this.trail.spawn({
        texture: 'puff',
        x: this.core.x - this.core.radius,
        y: this.core.y + Phaser.Math.Between(-20, 20),
        vx: Phaser.Math.Between(-420, -160),
        vy: Phaser.Math.Between(-80, 80),
        drag: 4,
        life: 0.3,
        scale: 0.8,
        endScale: 0.2,
        tint: COLORS.energy,
        additive: true,
      });
    }
  }

  // ---------------------------------------------------------------- update

  update(_time: number, deltaMs: number): void {
    const realDt = Math.min(deltaMs, 50) / 1000;
    let scale = 1;
    if (this.slowMo > 0) {
      this.slowMo -= realDt;
      scale = FEEL.record.slowMoScale;
    }
    this.tweens.timeScale = scale;
    const dt = realDt * scale;

    if (this.phase === 'running') this.step(dt, realDt);

    this.core.update(dt, this.phase === 'running', this.phase === 'running' ? this.speed : 0, this.trail);
    this.debris.update(dt);
    this.fxPool.update(dt);
    this.trail.update(dt);
    this.floaters.update(dt);
    this.hud.update(realDt);

    const cam = this.cameras.main;
    cam.scrollX = this.core.x - W * L.coreScreenX;
    this.backgrounds.forEach((bg) => (bg.tilePositionX = cam.scrollX * 0.35));
    this.field.update(cam.scrollX);
    this.updateSpeedLines(dt);
    this.updateUpcoming(cam.scrollX);
  }

  private currentSpeed(): number {
    const run = this.run!;
    const S = FEEL.speed;
    const combo = this.eventIndex;
    let v = FEEL.launch.speed * (1 + combo * S.perBreak);
    if (combo >= this.stats.comboStart) v *= S.comboMultiplier;
    if (this.rushLevel > 0) v *= S.rushMultiplier;
    if (this.surge > 0) v *= 1 + (S.boostSurge - 1) * Math.min(1, this.surge / (S.boostSurgeMs / 1000));
    // Running out of power: visibly lose momentum before the last wall.
    const prev = this.eventIndex > 0 ? run.breaks[this.eventIndex - 1]!.powerAfter : run.startPower;
    const share = prev / run.startPower;
    if (share < 0.3) v *= 0.55 + share * 1.5;
    return Math.min(S.max, v);
  }

  private step(dt: number, realDt: number): void {
    if (this.hitStop > 0) {
      this.hitStop -= realDt;
      return;
    }
    this.surge = Math.max(0, this.surge - dt);
    const target = this.speedTarget();
    this.speed += (target - this.speed) * Math.min(1, dt * 10);
    this.core.x += this.speed * dt;
    const index = this.eventIndex + 1;
    const contactX = this.field.frontX(index) - this.core.radius * 0.55;
    if (this.core.x >= contactX) {
      this.core.x = contactX;
      const e = this.run!.breaks[this.eventIndex];
      if (e) this.onBreak(e);
      else this.onStop();
    }
  }

  private speedTarget(): number {
    return this.currentSpeed();
  }

  // ---------------------------------------------------------------- events

  private onBreak(e: BreakEvent): void {
    const run = this.run!;
    const index = e.wall.index;
    const view = this.field.view(index);
    const impactY = this.core.y;
    const wasRush = this.rushLevel;
    this.eventIndex++;
    this.rushLevel = e.rushLevel;
    const isRecord = e.newBest;
    const isBreakthrough = !isRecord && this.lastStopBefore?.wall === index;
    const power = 1 + Math.min(1, e.combo / 20) + (isRecord || isBreakthrough ? 0.6 : 0);

    if (view) {
      view.flash(30);
      this.effects.shatter(view, { crit: e.crit, power, speed: this.speed, impactY });
    }
    this.field.markBroken(index);
    this.core.squash = 1;

    // Sound: denser and slightly higher as the combo climbs.
    const mat = MATERIALS[e.wall.material];
    const rate = 1 + Math.min(0.25, e.combo * 0.012) + Phaser.Math.FloatBetween(-0.04, 0.04);
    this.audio.play(mat.breakSound, { rate, volume: this.rushLevel > 0 ? 0.85 : 1 });
    if (e.crit) this.audio.play('critical');

    // Timing.
    const HS = FEEL.hitStop;
    this.hitStop = (e.crit ? HS.critMs : this.rushLevel > 0 ? HS.rushMs : HS.normalMs) / 1000;
    if (e.combo === 1) this.hitStop = (HS.normalMs + 30) / 1000; // make the very first impact land hard

    // Camera + haptics.
    const shake = e.crit ? FEEL.shake.crit : this.rushLevel > 0 ? FEEL.shake.rush : FEEL.shake.normal;
    this.shake(shake * (e.combo === 1 ? 1.5 : 1), e.crit ? 140 : 80);
    this.haptics.pulse(e.crit ? 'medium' : 'light');
    if (e.crit) {
      this.flash(0.22, 60);
      this.floaters.spawn('CRITICAL', view?.x ?? this.core.x + 80, impactY - 150, TEXT.gold, 30, 0.55);
    }

    // Scrap.
    this.runScrap += e.scrap;
    this.hud.setScrap(this.save.scrap + this.runScrap);
    const special = e.wall.special;
    const scrapColor = special === 'gold' ? TEXT.gold : TEXT.main;
    this.floaters.spawn(
      `+${formatNumber(e.scrap)}${e.luckyScrap ? ' ×2' : ''}`,
      (view?.x ?? this.core.x) + 10,
      L.floorY - L.wallHeight - 20,
      scrapColor,
      special === 'gold' ? 40 : 26,
      special === 'gold' ? 0.9 : 0.55,
    );
    if (special === 'gold') {
      this.hud.bumpScrap();
      this.flash(0.12, 80, 0xffd67a);
    }

    // POWER gauge.
    this.hud.setGauge(e.powerAfter / run.startPower);

    // Energy restored: BOOST sucks energy into the core and re-accelerates.
    if (e.restored > 0 && view) {
      const boost = e.restoreSource === 'boost';
      this.effects.absorb(view.x, view.centerY, () => ({ x: this.core.x, y: this.core.y }), boost ? COLORS.boost : COLORS.positive);
      this.time.delayedCall(boost ? 150 : 90, () => {
        this.core.pulse(boost ? COLORS.boost : COLORS.positive);
        this.surge = boost ? FEEL.speed.boostSurgeMs / 1000 : 0.25;
        this.core.surge = boost ? 0.8 : 0.3;
        if (boost) {
          this.audio.play('breakBoost', { volume: 0.6, rate: 1.2 });
          this.shake(FEEL.shake.heavy, 120);
          this.haptics.pulse('medium');
        }
        this.floaters.spawn(boost ? 'BOOST!' : '+POWER', this.core.x + 150, this.core.y - 110, boost ? TEXT.boost : TEXT.positive, boost ? 36 : 24, 0.6);
      });
    }

    // HUD wall/best.
    this.hud.setWall(index);
    if (index > this.save.best) this.hud.setBest(index, !isRecord);
    this.hud.setBestHot(this.save.best >= 3 && index >= this.save.best - 2 && index <= this.save.best);

    // Record / breakthrough moment: tiny slow-mo, big hit, keep going.
    if (isRecord) {
      this.slowMo = FEEL.record.slowMoMs / 1000;
      this.shake(FEEL.shake.heavy * 1.3, 220);
      this.flash(0.3, 110);
      this.audio.play('newBest');
      this.haptics.pulse('medium');
      this.banners.showNewBest(index);
      this.hud.setBest(index, true);
    } else if (isBreakthrough) {
      this.shake(FEEL.shake.heavy, 160);
      this.flash(0.18, 80);
      this.floaters.spawn('BREAK THROUGH', this.core.x + 90, this.core.y - 170, TEXT.amber, 30, 0.7);
    }

    // Combo / RUSH.
    this.banners.setCombo(e.combo, this.rushLevel, this.stats.comboStart);
    if (e.combo === this.stats.comboStart) {
      this.audio.setDrive(2);
      this.core.intensity = 2;
    }
    if (this.rushLevel > wasRush) {
      this.banners.showRush();
      this.audio.play('rushStart');
      this.audio.setDrive(3);
      this.core.intensity = 3;
      this.shake(FEEL.shake.heavy, 200);
      this.flash(0.15, 90, 0xffc27a);
      this.haptics.pulse('medium');
    }

    // Area change.
    const area = AREAS.indexOf(areaForWall(index + 1));
    if (area !== this.areaIndex) this.setArea(area, false);
  }

  private onStop(): void {
    const run = this.run!;
    const stop = run.stop;
    this.phase = 'stopped';
    const view = this.field.view(stop.wall.index);
    const impactY = this.core.y;
    this.core.x += FEEL.stop.embedDepth * (0.4 + stop.damage * 0.6);
    this.core.squash = 1.4;
    this.core.intensity = 0;
    this.hitStop = 0;
    this.speed = 0;
    this.rushLevel = 0;
    this.audio.setDrive(0);

    if (view) {
      view.flash(60);
      view.showDamage(stop.damage, impactY);
      this.effects.stopHit(view, impactY);
    }
    this.audio.play(MATERIALS[stop.wall.material].hitSound);
    this.haptics.pulse('heavy');
    this.shake(FEEL.shake.stop, 240);
    this.flash(0.12, 70);
    this.hud.setGauge(0);
    this.banners.setCombo(0, 0, 1);

    // Recoil and settle — the core stays lodged in the wall.
    this.tweens.add({ targets: this.core, offsetX: -10, duration: 90, yoyo: true, ease: 'Quad.out', delay: FEEL.hitStop.stopMs });

    this.time.delayedCall(FEEL.hitStop.stopMs + 60, () => {
      this.banners.clear();
      this.readout.show(stop.wall.index, stop.damage);
    });

    // Bank immediately so a reload never loses the run.
    const oldBest = this.save.best;
    applyRunResult(this.save, run);
    this.runScrap = 0;
    this.persist();
    this.hud.setScrap(this.save.scrap);
    this.hud.setBest(this.save.best, this.save.best > oldBest);
    this.hud.setBestHot(false);

    this.time.delayedCall(FEEL.stop.panelDelayMs, () => {
      const milestone = pendingMilestone(this.save);
      if (milestone !== null) this.openPicker(milestone, () => this.showResults());
      else this.showResults();
    });
  }

  private showResults(): void {
    this.phase = 'results';
    this.stats = statsFromSave(this.save);
    this.readout.settle();
    this.results.lastSave = this.save;
    this.results.show(this.run!, this.save, estimateWalls(this.stats));
  }

  private openPicker(milestone: number, then: () => void): void {
    const offer = rollSpecialOffer(this.save, Math.random);
    if (offer.length === 0) {
      then();
      return;
    }
    const prev = this.phase;
    this.phase = 'picker';
    this.audio.play('pick', { volume: 0.7 });
    this.picker.show(offer, milestone, (id) => {
      claimSpecial(this.save, milestone, id);
      this.persist();
      this.stats = statsFromSave(this.save);
      this.hud.setSpecials(this.save.specials);
      this.hud.setPower(this.stats.power);
      this.audio.play('buy');
      this.haptics.pulse('medium');
      this.phase = prev;
      then();
    });
  }

  private onBuy(stat: StatId): void {
    if (this.phase !== 'results') return;
    const before = statPreview(stat, this.save.levels);
    const estBefore = estimateWalls(this.stats);
    if (!buyUpgrade(this.save, stat)) {
      this.audio.play('denied');
      this.results.shake(stat);
      return;
    }
    this.persist();
    this.stats = statsFromSave(this.save);
    const estAfter = estimateWalls(this.stats);
    this.audio.play('buy');
    this.haptics.pulse('light');
    this.hud.setScrap(this.save.scrap);
    this.hud.setPower(this.stats.power);
    this.results.celebrate(stat, before.current, before.next, estBefore, estAfter);
    this.results.refresh(this.save);
    const form = this.save.levels.power >= TUNING.coreForm2PowerLevel ? 1 : 0;
    this.core.setForm(form);
  }

  private openSettings(): void {
    if (this.phase !== 'idle' && this.phase !== 'results') return;
    this.audio.unlock();
    this.audio.play('tap');
    this.settingsOverlay.show(this.save.settings);
  }

  // ---------------------------------------------------------------- presentation helpers

  private setArea(index: number, instant: boolean): void {
    this.areaIndex = index;
    this.backgrounds.forEach((bg, i) => {
      this.tweens.killTweensOf(bg);
      const alpha = i === index ? 1 : 0;
      if (instant) bg.setAlpha(alpha);
      else this.tweens.add({ targets: bg, alpha, duration: 420 });
    });
  }

  private shake(intensity: number, duration: number): void {
    const amount = intensity * this.save.settings.shake;
    if (amount <= 0) return;
    this.cameras.main.shake(duration, amount, true);
  }

  private flash(alpha: number, duration: number, color = 0xffffff): void {
    const a = alpha * this.save.settings.flash;
    if (a <= 0) return;
    this.tweens.killTweensOf(this.flashRect);
    this.flashRect.setFillStyle(color, 1).setAlpha(a);
    this.tweens.add({ targets: this.flashRect, alpha: 0, duration });
  }

  private updateSpeedLines(dt: number): void {
    const active = this.phase === 'running' && this.rushLevel > 0;
    for (const line of this.speedLines) {
      const img = line.img;
      if (!img.visible) {
        if (active && Math.random() < dt * 12) {
          img.setVisible(true).setPosition(W + 80, Phaser.Math.Between(230, L.floorY + 40));
          img.setAlpha(Phaser.Math.FloatBetween(0.12, 0.3)).setScale(Phaser.Math.FloatBetween(0.8, 2.2), 1);
          line.v = Phaser.Math.Between(2200, 3400);
        }
        continue;
      }
      img.x -= line.v * dt;
      if (img.x < -400) img.setVisible(false);
    }
  }

  /** Off-screen GOLD/BOOST walls ahead get a small edge marker: "worth reaching". */
  private updateUpcoming(scrollX: number): void {
    const from = this.eventIndex + 1;
    const next = this.phase === 'idle' || this.phase === 'running' ? this.field.nextOffscreen(scrollX, W, from) : null;
    if (!next) {
      this.upcoming.setVisible(false);
      return;
    }
    const label = next.special === 'gold' ? 'GOLD' : 'BOOST';
    this.upcoming.setVisible(true).setText(`${label} · ${next.index} ▸`).setColor(next.special === 'gold' ? TEXT.gold : TEXT.boost);
    this.upcoming.setY(L.floorY - L.wallHeight - 118 + FEEL.view.extra);
  }
}
