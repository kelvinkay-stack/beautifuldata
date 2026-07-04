/* RaceRenderer — canvas 2D scoreboard.
 *
 * Dumb by design: it receives one frame description per paint (rows in
 * rank-space with precomputed fractions and formatted strings) and turns it
 * into pixels. All timing, easing and physics live in the controller.
 */

const BG_TOP = '#131a29';
const BG_BOTTOM = '#0b0e14';

export class RaceRenderer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts;
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
  }

  /* Size canvas to its CSS box; height driven by topN rows. */
  resize(topN) {
    const cssW = this.canvas.clientWidth || this.canvas.parentElement.clientWidth;
    const compact = cssW < 560;
    this.compact = compact;
    const rowH = compact ? 40 : 52;
    const padTop = compact ? 46 : 56;   // axis strip
    const padBottom = compact ? 18 : 24;
    const cssH = this.opts.fixedHeight ||
      Math.round(padTop + rowH * topN + padBottom);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.canvas.style.height = cssH + 'px';
    this.w = cssW;
    this.h = cssH;
    this.pad = {
      top: padTop,
      bottom: padBottom,
      left: compact ? 10 : 16,
      right: compact ? 12 : 20,
      gutter: compact ? 24 : 34,   // rank numbers
    };
    this.plot = {
      x: this.pad.left + this.pad.gutter,
      y: this.pad.top,
      w: Math.max(40, cssW - this.pad.left - this.pad.gutter - this.pad.right - (compact ? 64 : 96)),
      h: cssH - this.pad.top - this.pad.bottom,
    };
  }

  clear() {
    const { ctx, w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, BG_TOP);
    g.addColorStop(1, BG_BOTTOM);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  /* frame: {rows, rowsVisible, ticks, clock, clockSub, unitLabel, leaderColor, intro}
   * row:  {label, valueText, color, frac, rankF, pulse, alpha, flagText}     */
  render(frame) {
    this.clear();
    const { ctx, plot, compact } = this;
    const rowH = plot.h / Math.max(1, frame.rowsVisible);
    const barH = Math.min(rowH * 0.72, compact ? 30 : 38);

    this._drawLeaderGlow(frame, rowH, barH);
    this._drawTicks(frame);
    this._drawClock(frame);

    const nameSize = Math.max(11, Math.min(15, barH * 0.42));
    const valueSize = Math.max(11, Math.min(14, barH * 0.4));

    for (const row of frame.rows) {
      if (row.alpha <= 0.01) continue;
      const yCenter = plot.y + (row.rankF + 0.5) * rowH;
      if (yCenter > this.h + barH) continue;
      const scale = 1 + 0.05 * row.pulse;
      const bh = barH * scale;
      const bw = Math.max(2, row.frac * plot.w * frame.intro);
      const y = yCenter - bh / 2;

      ctx.save();
      ctx.globalAlpha = row.alpha;

      // track lane
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      roundRect(ctx, plot.x, yCenter - barH / 2, plot.w, barH, 4);
      ctx.fill();

      // overtake glow
      if (row.pulse > 0.02) {
        ctx.shadowColor = row.color;
        ctx.shadowBlur = 26 * row.pulse;
      }

      // bar
      const grad = ctx.createLinearGradient(plot.x, 0, plot.x + bw, 0);
      grad.addColorStop(0, shade(row.color, -0.18));
      grad.addColorStop(1, row.color);
      ctx.fillStyle = grad;
      roundRect(ctx, plot.x, y, bw, bh, 4);
      ctx.fill();
      ctx.shadowBlur = 0;

      // pulse flash overlay
      if (row.pulse > 0.02) {
        ctx.fillStyle = `rgba(255,255,255,${0.22 * row.pulse})`;
        roundRect(ctx, plot.x, y, bw, bh, 4);
        ctx.fill();
      }

      // rank number
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = `600 ${Math.max(10, barH * 0.36)}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(Math.round(row.rankF) + 1), plot.x - 8, yCenter);

      // name: inside the bar when it fits, otherwise just past the nose
      ctx.font = `650 ${nameSize}px -apple-system, "Segoe UI", Roboto, sans-serif`;
      const nameW = ctx.measureText(row.label).width;
      const inside = bw > nameW + 24;
      ctx.textBaseline = 'middle';
      let valueX;
      if (inside) {
        ctx.textAlign = 'right';
        ctx.fillStyle = contrastText(row.color);
        ctx.fillText(row.label, plot.x + bw - 10, yCenter);
        valueX = plot.x + bw + 8;
      } else {
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(242,244,248,0.92)';
        ctx.fillText(row.label, plot.x + bw + 8, yCenter);
        valueX = plot.x + bw + 8 + nameW + 8;
      }

      // value — tabular numerals
      ctx.font = `500 ${valueSize}px ui-monospace, "SF Mono", Menlo, monospace`;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(154,163,181,0.95)';
      ctx.fillText(row.valueText, valueX, yCenter);

      ctx.restore();
    }
  }

  _drawLeaderGlow(frame, rowH, barH) {
    const leader = frame.rows.find((r) => r.rankF < 0.5 && r.alpha > 0.5);
    if (!leader) return;
    const { ctx, plot } = this;
    if (plot.w <= 0) return; // layout not settled yet
    const y = plot.y + (leader.rankF + 0.5) * rowH;
    const g = ctx.createRadialGradient(plot.x, y, 0, plot.x, y, plot.w * 0.7);
    g.addColorStop(0, hexToRgba(leader.color, 0.07));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  _drawTicks(frame) {
    const { ctx, plot, compact } = this;
    ctx.save();
    ctx.font = `500 ${compact ? 10 : 11}px ui-monospace, Menlo, monospace`;
    ctx.textBaseline = 'top';
    for (const tick of frame.ticks) {
      const x = plot.x + tick.frac * plot.w;
      if (x > plot.x + plot.w + 1) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, plot.y - 6);
      ctx.lineTo(x, plot.y + plot.h);
      ctx.stroke();
      ctx.fillStyle = 'rgba(92,101,119,0.9)';
      ctx.textAlign = 'center';
      ctx.fillText(tick.label, x, compact ? 22 : 26);
    }
    // unit label, top-left
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(92,101,119,1)';
    ctx.font = `600 ${compact ? 9 : 10}px -apple-system, "Segoe UI", sans-serif`;
    const unit = (frame.unitLabel || '').toUpperCase();
    ctx.fillText(unit, this.pad.left, compact ? 8 : 10);
    ctx.restore();
  }

  _drawClock(frame) {
    const { ctx, compact } = this;
    ctx.save();
    const size = compact ? 44 : 76;
    ctx.font = `800 ${size}px -apple-system, "SF Pro Display", "Segoe UI", sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    const x = this.w - this.pad.right;
    const y = this.h - this.pad.bottom - (compact ? 4 : 8);
    ctx.fillText(frame.clock, x, y);
    if (frame.clockSub) {
      ctx.font = `600 ${compact ? 10 : 12}px ui-monospace, Menlo, monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.30)';
      ctx.fillText(frame.clockSub, x, y - size - (compact ? 4 : 8));
    }
    ctx.restore();
  }
}

/* ---------- helpers ---------- */

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, h / 2, Math.max(0.5, w / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

export function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + 255 * amt)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function contrastText(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? 'rgba(11,14,20,0.9)' : 'rgba(255,255,255,0.94)';
}
