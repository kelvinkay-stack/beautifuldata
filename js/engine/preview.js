/* Hub-card mini race: a lightweight looping preview driven by the
 * downsampled series embedded in the manifest (no full dataset fetch).
 * One shared rAF drives every visible preview; IntersectionObserver
 * pauses the ones that scroll away. Honors prefers-reduced-motion by
 * rendering a representative freeze-frame instead of looping.
 */

const LOOP_S = 9;        // seconds per loop
const HOLD_S = 1.6;      // hold on the final frame before looping

const active = new Set();
let rafId = 0;

function pump(now) {
  for (const p of active) p.frame(now);
  rafId = active.size ? requestAnimationFrame(pump) : 0;
}

export function mountPreview(canvas, preview, reduced) {
  const p = new MiniRace(canvas, preview);
  if (reduced) {
    p.renderStatic(0.72); // a mid-race frame with real reordering visible
    return () => {};
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        p.t0 = 0;
        active.add(p);
        if (!rafId) rafId = requestAnimationFrame(pump);
      } else {
        active.delete(p);
      }
    }
  }, { rootMargin: '80px' });
  io.observe(canvas);
  return () => { io.disconnect(); active.delete(p); };
}

class MiniRace {
  constructor(canvas, preview) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.pv = preview;           // {entities:[{label,color}], frames:[[v,…],…]}
    this.t0 = 0;
    this.rankF = preview.entities.map((_, i) => i);
    const firstActive = preview.frames.findIndex((f) => f.some((v) => v > 0));
    this.firstP = firstActive > 0 ? firstActive / Math.max(1, preview.frames.length - 1) : 0;
  }

  _size() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return false;
    if (this.canvas.width !== Math.round(w * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h;
    return true;
  }

  frame(now) {
    if (!this.t0) this.t0 = now;
    const cycle = (now - this.t0) / 1000 % (LOOP_S + HOLD_S);
    const p = Math.min(1, cycle / LOOP_S);
    this.render(easeInOut(p), true);
  }

  renderStatic(p) {
    // retry until layout gives the canvas a size
    if (!this._size()) { requestAnimationFrame(() => this.renderStatic(p)); return; }
    this.render(p, false);
  }

  render(p, animate) {
    if (!this._size()) return;
    const { ctx, w, h, pv } = this;
    const F = pv.frames;
    const activeP = this.firstP + p * (1 - this.firstP);
    const fi = Math.min(F.length - 1.001, activeP * (F.length - 1));
    const i = Math.floor(fi), x = fi - i;
    const vals = pv.entities.map((_, e) =>
      F[i][e] * (1 - x) + F[i + 1][e] * x);

    const order = vals.map((v, e) => [v, e]).sort((a, b) => b[0] - a[0]);
    const rank = [];
    order.forEach(([, e], r) => (rank[e] = r));
    const max = Math.max(1e-9, order[0][0]);

    // ease displayed ranks toward targets for mini-overtake motion
    for (let e = 0; e < rank.length; e++) {
      this.rankF[e] = animate
        ? this.rankF[e] + (rank[e] - this.rankF[e]) * 0.18
        : rank[e];
    }

    ctx.clearRect(0, 0, w, h);

    // year watermark, bottom-right — the clock that makes it a race
    if (pv.t1 != null) {
      const t = pv.t0 + (pv.t1 - pv.t0) * (fi / (F.length - 1));
      ctx.font = `800 ${Math.round(h * 0.2)}px "Bricolage Grotesque", -apple-system, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(255,255,255,0.09)';
      ctx.fillText(yearLabel(t, pv.era), w - 10, h - 9);
    }

    const shown = Math.min(5, pv.entities.length);
    const rowH = h / (shown + 0.6);
    const barH = rowH * 0.62;
    const padX = 10;
    const plotW = w - padX * 2;
    const fontPx = Math.max(9, Math.min(12, barH * 0.62));
    ctx.font = `600 ${fontPx}px -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = 'middle';

    for (let e = 0; e < pv.entities.length; e++) {
      const rf = this.rankF[e];
      if (rf > shown - 0.3) continue;
      const v = vals[e];
      if (v <= 0) continue;
      const y = rowH * 0.45 + rf * rowH;
      const bw = Math.max(2, (v / max) * plotW * 0.78);
      ctx.globalAlpha = Math.min(1, shown - rf);
      ctx.fillStyle = pv.entities[e].color;
      rr(ctx, padX, y, bw, barH, 3);
      ctx.fill();

      // name inside the bar when it fits, otherwise just past its nose
      const label = pv.entities[e].label;
      const tw = ctx.measureText(label).width;
      const cy = y + barH / 2 + 0.5;
      if (bw > tw + 14) {
        ctx.textAlign = 'right';
        ctx.fillStyle = ink(pv.entities[e].color);
        ctx.fillText(label, padX + bw - 6, cy);
      } else {
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(242,244,248,0.82)';
        ctx.fillText(label, padX + bw + 6, cy);
      }
    }
    ctx.globalAlpha = 1;
  }
}

function yearLabel(t, era) {
  const y = Math.floor(t);
  if (era) return y < 0 ? `${-y} BCE` : y < 1000 ? `${y} CE` : String(y);
  return String(y);
}

function ink(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? 'rgba(11,14,20,0.88)' : 'rgba(255,255,255,0.95)';
}

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, rad) : ctx.rect(x, y, w, h);
}

function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
