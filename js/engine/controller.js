/* RaceController — the choreography layer.
 *
 * Owns the playback clock and per-bar physics:
 *  - rank positions move on critically-damped springs, so close overtakes
 *    have weight instead of linear-tween slide
 *  - the overtaking bar gets a pulse (glow + flash + slight scale) at the
 *    exact frame it passes a rival
 *  - the value axis re-scales smoothly toward a "nice" ceiling
 *  - a cinematic intro grows bars in from zero before the clock starts
 *  - prefers-reduced-motion switches to discrete keyframe stepping
 */

import { RaceModel } from './model.js';
import { RaceRenderer } from './renderer.js';
import { formatValue, formatTime, niceCeil, axisTicks } from './format.js';

const INTRO_S = 1.3;
const PULSE_S = 0.65;
const SPRING = 130;        // rank spring stiffness (critically damped)
const AXIS_TAU = 0.45;     // axis max smoothing time-constant, seconds

export class RaceController {
  constructor(canvas, dataset, hooks = {}) {
    this.model = new RaceModel(dataset);
    this.renderer = new RaceRenderer(canvas, hooks.rendererOpts);
    this.hooks = hooks;               // onProgress, onMilestone, onPlayState, onEnd
    this.duration = hooks.duration || autoDuration(this.model);
    this.speed = 1;
    this.playing = false;
    this.progress = 0;                // 0..1 through tMin..tMax
    this.introT = 0;
    this.axisMax = 0;
    this.rowsVisible = Math.min(this.model.topN, 6);
    this._raf = 0;
    this._last = 0;
    this._milestoneIdx = 0;

    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // per-entity display state
    this.state = this.model.entities.map(() => ({
      rankF: this.model.topN + 3, rankV: 0, pulse: 0, prevRank: Infinity,
    }));

    this.resize();
    this._renderAt(0, 0, true);
  }

  resize() {
    this.renderer.resize(this.model.topN);
    this._renderCurrent();
  }

  /* ---------- transport ---------- */

  play() {
    if (this.playing) return;
    if (this.progress >= 1) this.restart(false);
    this.playing = true;
    this.hooks.onPlayState?.(true);
    if (this.reduced) { this._stepLoop(); return; }
    this._last = performance.now();
    this._raf = requestAnimationFrame((n) => this._tick(n));
  }

  pause() {
    this.playing = false;
    this.hooks.onPlayState?.(false);
    cancelAnimationFrame(this._raf);
    clearTimeout(this._stepTimer);
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  restart(andPlay = true) {
    this.pause();
    this.progress = 0;
    this.introT = 0;
    this._milestoneIdx = 0;
    this.axisMax = 0;
    for (const s of this.state) {
      s.rankF = this.model.topN + 3; s.rankV = 0; s.pulse = 0; s.prevRank = Infinity;
    }
    if (andPlay) this.play();
    else this._renderAt(0, 0, true);
  }

  setSpeed(mult) { this.speed = mult; }

  seek(p, { snap = true } = {}) {
    if (!Number.isFinite(p)) return; // guard against bad geometry / NaN
    this.progress = Math.min(1, Math.max(0, p));
    this.introT = INTRO_S; // no intro when scrubbing
    // milestone pointer follows the playhead so callouts fire correctly
    const t = this.model.progressToTime(this.progress);
    this._milestoneIdx = this.model.milestones.filter((m) => m.t <= t).length;
    this._renderAt(this.progress, 0, snap);
    this.hooks.onProgress?.(this.progress);
  }

  seekTime(t) { this.seek(this.model.timeToProgress(t)); }

  destroy() { this.pause(); }

  /* ---------- continuous playback ---------- */

  _tick(now) {
    if (!this.playing) return;
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;

    if (this.introT < INTRO_S) {
      this.introT += dt;
    } else {
      this.progress += (dt * this.speed) / this.duration;
    }

    if (this.progress >= 1) {
      this.progress = 1;
      this._renderAt(1, dt, false);
      this.pause();
      this.hooks.onProgress?.(1);
      this.hooks.onEnd?.();
      return;
    }

    this._renderAt(this.progress, dt, false);
    this.hooks.onProgress?.(this.progress);
    this._raf = requestAnimationFrame((n) => this._tick(n));
  }

  /* ---------- reduced-motion stepping ---------- */

  _stepLoop() {
    if (!this.playing) return;
    const times = this.model.times;
    const t = this.model.progressToTime(this.progress);
    const next = times.find((kt) => kt > t + 1e-9);
    if (next == null) {
      this.pause();
      this.hooks.onEnd?.();
      return;
    }
    this.seek(this.model.timeToProgress(next));
    this.playing = true; // seek() leaves play state alone; keep looping
    this._stepTimer = setTimeout(() => this._stepLoop(), 1400);
  }

  stepBy(dir) {
    const times = this.model.times;
    const t = this.model.progressToTime(this.progress);
    const next = dir > 0
      ? times.find((kt) => kt > t + 1e-9)
      : [...times].reverse().find((kt) => kt < t - 1e-9);
    if (next != null) this.seek(this.model.timeToProgress(next));
  }

  /* ---------- frame assembly ---------- */

  _renderCurrent() { this._renderAt(this.progress, 0, true); }

  _renderAt(p, dt, snap) {
    const model = this.model;
    const t = model.progressToTime(p);
    const ranked = model.rankedAt(t);
    const topN = model.topN;

    // axis target from the visible leader
    const maxVal = ranked.length ? ranked[0].value : 1;
    const axisTarget = model.log ? maxVal * 1.15 : niceCeil(maxVal * 1.02);
    if (snap || this.axisMax <= 0) this.axisMax = axisTarget;
    else {
      const k = 1 - Math.exp(-dt / AXIS_TAU);
      this.axisMax += (axisTarget - this.axisMax) * k;
      if (this.axisMax < maxVal) this.axisMax = maxVal; // never clip the leader
    }

    // camera framing: fewer entities on the board -> taller bars
    const targetRows = Math.max(3, Math.min(topN, ranked.length));
    if (snap) this.rowsVisible = targetRows;
    else this.rowsVisible += (targetRows - this.rowsVisible) * Math.min(1, dt * 3);

    // springs + overtake pulses
    const rankOf = new Map(ranked.map((r) => [r.entity.index, r.rank]));
    for (let e = 0; e < this.state.length; e++) {
      const s = this.state[e];
      const target = rankOf.has(e) ? rankOf.get(e) : topN + 3;
      if (snap) {
        s.rankF = target; s.rankV = 0; s.pulse = 0; s.prevRank = target;
        continue;
      }
      // critically damped spring toward target rank
      const om = Math.sqrt(SPRING);
      const accel = SPRING * (target - s.rankF) - 2 * om * s.rankV;
      s.rankV += accel * dt;
      s.rankF += s.rankV * dt;

      // pulse the riser at the exact crossing frame
      if (target < s.prevRank && s.prevRank <= topN + 1 && target < topN) {
        s.pulse = 1;
      }
      s.prevRank = target;
      s.pulse = Math.max(0, s.pulse - dt / PULSE_S);
    }

    // milestones crossed this frame
    const ms = model.milestones;
    while (this._milestoneIdx < ms.length && ms[this._milestoneIdx].t <= t) {
      const m = ms[this._milestoneIdx++];
      if (!snap || this.reduced) this.hooks.onMilestone?.(m);
    }

    // intro envelope
    const intro = snap || this.reduced
      ? 1
      : easeOutCubic(Math.min(1, this.introT / INTRO_S));

    const unit = model.ds.unit;
    const rows = [];
    const vals = model.valuesAt(t); // shared buffer; read before next sample
    for (let e = 0; e < this.state.length; e++) {
      const s = this.state[e];
      if (s.rankF > topN + 1.5 && !rankOf.has(e)) continue;
      const v = vals[e];
      if (v <= 0 && s.rankF > topN) continue;
      rows.push({
        label: model.entities[e].label,
        color: model.entities[e].color,
        valueText: formatValue(v, unit),
        frac: model.barFrac(v, this.axisMax),
        rankF: s.rankF,
        pulse: easeOutCubic(s.pulse),
        alpha: clamp01(topN + 0.9 - s.rankF),
      });
    }

    const ticks = model.log
      ? logTicks(model.logFloor, this.axisMax).map((v) => ({
          frac: model.barFrac(v, this.axisMax), label: formatValue(v, unit) }))
      : axisTicks(niceCeil(this.axisMax), this.renderer.compact ? 3 : 4)
          .map((v) => ({ frac: v / this.axisMax, label: formatValue(v, unit) }));

    this.renderer.render({
      rows,
      rowsVisible: this.rowsVisible,
      ticks,
      clock: formatTime(t, model.ds.timeLabel),
      clockSub: unit.label,
      unitLabel: model.ds.title,
      intro,
    });
  }
}

/* ---------- helpers ---------- */

function autoDuration(model) {
  // ~0.55s per keyframe, clamped: short series still breathe,
  // century-long series don't drag
  return Math.max(22, Math.min(70, model.times.length * 0.55));
}

function logTicks(floor, max) {
  const out = [];
  const lo = Math.ceil(Math.log10(floor * 3));
  const hi = Math.floor(Math.log10(max));
  const step = Math.max(1, Math.ceil((hi - lo) / 4));
  for (let e = lo; e <= hi; e += step) out.push(Math.pow(10, e));
  return out;
}

function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
function clamp01(x) { return Math.min(1, Math.max(0, x)); }
