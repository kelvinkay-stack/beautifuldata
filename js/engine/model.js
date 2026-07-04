/* RaceModel — normalizes a dataset JSON into fast per-frame sampling.
 *
 * Values are interpolated with monotone cubic (PCHIP) segments so bars
 * accelerate and settle with weight instead of moving at constant speed,
 * while never overshooting the data (cumulative series stay monotone).
 * Slopes are precomputed once; sampling per frame is O(entities).
 */

export class RaceModel {
  constructor(dataset) {
    this.ds = dataset;
    this.entities = dataset.entities.map((e, i) => ({ ...e, index: i }));
    this.byId = new Map(this.entities.map((e) => [e.id, e]));
    this.topN = dataset.topN || 10;
    this.log = dataset.scale === 'log';

    const kf = dataset.keyframes;
    this.times = kf.map((k) => k.t);
    this.tMin = this.times[0];
    this.tMax = this.times[this.times.length - 1];

    const n = this.entities.length;
    const m = kf.length;
    // datasets may store values in a convenient magnitude (e.g. $B);
    // the multiplier restores real units so SI formatting is correct
    const mult = (dataset.unit && dataset.unit.multiplier) || 1;
    // grid[e][k] = value of entity e at keyframe k (0 when absent)
    this.grid = Array.from({ length: n }, () => new Float64Array(m));
    kf.forEach((k, ki) => {
      for (const [id, v] of Object.entries(k.values)) {
        const ent = this.byId.get(id);
        if (ent) this.grid[ent.index][ki] = +v * mult;
      }
    });
    this.slopes = this.grid.map((row) => pchipSlopes(this.times, row));

    this.milestones = (dataset.milestones || [])
      .filter((ms) => ms.t >= this.tMin && ms.t <= this.tMax)
      .sort((a, b) => a.t - b.t);

    this._seg = 0; // memoized segment for monotone playhead access
    this._values = new Float64Array(n);

    // global max (for previews / log floor)
    let gmax = 0;
    let posMin = Infinity;
    for (const row of this.grid) {
      for (const v of row) {
        if (v > gmax) gmax = v;
        if (v > 0 && v < posMin) posMin = v;
      }
    }
    this.globalMax = gmax;
    this.logFloor = this.log ? posMin / 3 : 0;
  }

  /* clamp + locate keyframe segment for t (memoized, O(1) when advancing) */
  _segment(t) {
    const T = this.times;
    let s = this._seg;
    if (s > T.length - 2) s = T.length - 2;
    while (s > 0 && t < T[s]) s--;
    while (s < T.length - 2 && t >= T[s + 1]) s++;
    this._seg = s;
    return s;
  }

  /* Sample all entity values at time t into a shared Float64Array. */
  valuesAt(t) {
    const T = this.times;
    const tc = Math.min(this.tMax, Math.max(this.tMin, t));
    const s = this._segment(tc);
    const h = T[s + 1] - T[s];
    const x = h > 0 ? (tc - T[s]) / h : 0;
    const x2 = x * x;
    const x3 = x2 * x;
    const h00 = 2 * x3 - 3 * x2 + 1;
    const h10 = x3 - 2 * x2 + x;
    const h01 = -2 * x3 + 3 * x2;
    const h11 = x3 - x2;
    const out = this._values;
    for (let e = 0; e < this.grid.length; e++) {
      const row = this.grid[e];
      const d = this.slopes[e];
      const v = h00 * row[s] + h10 * h * d[s] + h01 * row[s + 1] + h11 * h * d[s + 1];
      out[e] = v > 0 ? v : 0;
    }
    return out;
  }

  /* Ranked snapshot at t: array of {entity, value, rank} for value > 0,
   * sorted descending. */
  rankedAt(t) {
    const vals = this.valuesAt(t);
    const rows = [];
    for (let e = 0; e < vals.length; e++) {
      if (vals[e] > 0) rows.push({ entity: this.entities[e], value: vals[e] });
    }
    rows.sort((a, b) => b.value - a.value || a.entity.index - b.entity.index);
    rows.forEach((r, i) => (r.rank = i));
    return rows;
  }

  /* Bar length fraction for a value given the current axis max (0..1). */
  barFrac(value, axisMax) {
    if (value <= 0) return 0;
    if (!this.log) return Math.min(1, value / axisMax);
    const lo = Math.log(this.logFloor);
    const hi = Math.log(axisMax);
    return Math.min(1, Math.max(0, (Math.log(value) - lo) / (hi - lo)));
  }

  progressToTime(p) { return this.tMin + (this.tMax - this.tMin) * p; }
  timeToProgress(t) { return (t - this.tMin) / (this.tMax - this.tMin); }
}

/* PCHIP (Fritsch–Carlson) slopes: shape-preserving, no overshoot. */
function pchipSlopes(x, y) {
  const n = x.length;
  const d = new Float64Array(n);
  if (n < 2) return d;
  const delta = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i++) delta[i] = (y[i + 1] - y[i]) / (x[i + 1] - x[i]);
  d[0] = delta[0];
  d[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] * delta[i] <= 0) { d[i] = 0; continue; }
    const w1 = 2 * (x[i + 1] - x[i]) + (x[i] - x[i - 1]);
    const w2 = (x[i + 1] - x[i]) + 2 * (x[i] - x[i - 1]);
    d[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
  }
  return d;
}
