/* Number and time formatting for race datasets. */

const SI_MONEY = [
  [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'k'],
];
// scientific prefixes, used when the unit suffix is a physical one (FLOPS)
const SI_METRIC = [
  [1e24, 'Y'], [1e21, 'Z'],
  [1e18, 'E'], [1e15, 'P'], [1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'K'],
];

export function formatValue(v, unit) {
  if (v == null || !isFinite(v)) return '';
  const { format = 'plain', prefix = '', suffix = '', decimals = 0 } = unit || {};
  if (format === 'percent') {
    return `${v.toFixed(unit.decimals ?? 1)}%`;
  }
  if (format === 'si') {
    const metric = /FLOPS/i.test(suffix);
    const table = metric ? SI_METRIC : SI_MONEY;
    for (const [mag, sym] of table) {
      if (Math.abs(v) >= mag) {
        const scaled = v / mag;
        const d = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
        return `${prefix}${scaled.toFixed(d)}${metric ? ' ' : ''}${sym}${suffix}`;
      }
    }
    return `${prefix}${v.toLocaleString('en-US', { maximumFractionDigits: decimals })}${metric ? ' ' : ''}${suffix}`;
  }
  // plain
  return `${prefix}${v.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatTime(t, timeLabel = 'year') {
  const year = Math.floor(t);
  if (timeLabel === 'yearMonth') {
    const m = Math.min(11, Math.floor((t - year) * 12));
    return `${MONTHS[m]} ${year}`;
  }
  if (timeLabel === 'yearEra') {
    // negative years are BCE; there is no year 0 in the data
    if (year < 0) return `${-year} BCE`;
    return year < 1000 ? `${year} CE` : String(year);
  }
  return String(year);
}

/* "Nice" axis ceiling: 1/2/2.5/5 × 10^n just above v. */
export function niceCeil(v) {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const f = v / base;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * base;
}

export function axisTicks(max, count = 4) {
  const ticks = [];
  for (let i = 1; i <= count; i++) ticks.push((max / count) * i);
  return ticks;
}
