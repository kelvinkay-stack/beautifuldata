/* Overtake site generator.
 *
 * Reads site.config.json + data/*.json and emits:
 *   index.html            — hub with static card grid + embedded preview data
 *   races/<id>/index.html — one page per race, unique meta/OG/JSON-LD
 *   sitemap.xml, robots.txt
 *   assets/og/<id>.png    — OG card rendered from the race's final standings
 *
 * Generated pages are committed, so deploys are a plain static publish.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatValue } from '../js/engine/format.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const TODAY = new Date().toISOString().slice(0, 10);

/* ---------------- cache-busting version ----------------
 * Hash the engine + entry scripts so returning visitors never run a stale
 * module against a freshly deployed page. Every engine module URL is remapped
 * through an import map; entry scripts carry ?v=<hash> directly. */
const engineFiles = [
  'css/site.css',
  'js/race-page.js', 'js/hub.js',
  'js/engine/model.js', 'js/engine/renderer.js', 'js/engine/format.js',
  'js/engine/controller.js', 'js/engine/controls.js', 'js/engine/preview.js',
];
const VERSION = (() => {
  const h = createHash('sha256');
  for (const f of engineFiles) {
    try { h.update(readFileSync(join(root, f))); } catch { /* optional */ }
  }
  return h.digest('hex').slice(0, 10);
})();

const ENGINE_MODULES = [
  '/js/engine/model.js', '/js/engine/renderer.js', '/js/engine/format.js',
  '/js/engine/controller.js', '/js/engine/controls.js', '/js/engine/preview.js',
];
const importMap = () => {
  const imports = {};
  for (const m of ENGINE_MODULES) imports[m] = `${m}?v=${VERSION}`;
  return `<script type="importmap">${JSON.stringify({ imports })}</script>`;
};
const v = (path) => `${path}?v=${VERSION}`;

/* ---------------- load datasets ---------------- */

const datasets = new Map();
for (const f of readdirSync(join(root, 'data'))) {
  if (!f.endsWith('.json') || f === 'manifest.json') continue;
  const ds = JSON.parse(readFileSync(join(root, 'data', f), 'utf8'));
  datasets.set(ds.id, ds);
}

const races = site.races.filter((r) => {
  if (!datasets.has(r.id)) {
    console.warn(`skipping ${r.id} — no dataset yet`);
    return false;
  }
  return true;
});
const catById = new Map(site.categories.map((c) => [c.id, c]));

/* ---------------- derived race stats ----------------
 * Everything here is computed from keyframes at build time: who led when,
 * how often the lead flipped, and the final top-5 board. Values are stored
 * in a convenient magnitude; unit.multiplier restores real units before
 * SI formatting (same convention as the engine's model.js). */

function statsFor(ds) {
  const mult = (ds.unit && ds.unit.multiplier) || 1;
  const entById = new Map(ds.entities.map((e) => [e.id, e]));
  const kf = ds.keyframes;

  let leader = null;
  let leadChanges = 0;
  const reigns = [];
  kf.forEach((k, i) => {
    let top = null, topV = -Infinity;
    for (const [id, v] of Object.entries(k.values)) {
      if (v > topV) { topV = v; top = id; }
    }
    // a tie isn't an overtake: the reigning leader keeps #1 until passed
    if (leader !== null && k.values[leader] === topV) top = leader;
    if (top !== null && top !== leader) {
      // date the overtake where the bars cross, as the animation shows it
      let at = k.t;
      const prev = kf[i - 1];
      if (leader !== null && prev) {
        const gap0 = (prev.values[leader] || 0) - (prev.values[top] || 0);
        const gap1 = (k.values[leader] || 0) - topV;
        if (gap0 > 0 && gap1 < 0) at = prev.t + (k.t - prev.t) * gap0 / (gap0 - gap1);
      }
      if (leader !== null) {
        leadChanges++;
        reigns[reigns.length - 1].to = at;
      }
      reigns.push({ id: top, from: at, to: kf[kf.length - 1].t });
      leader = top;
    }
  });

  let longest = null;
  for (const r of reigns) {
    const len = r.to - r.from;
    if (!longest || len > longest.len) longest = { id: r.id, len };
  }

  const finals = kf[kf.length - 1].values;
  const fmt = (v) => formatValue(v * mult, ds.unit);
  const standings = Object.entries(finals)
    .map(([id, v]) => ({ e: entById.get(id), v }))
    .filter((s) => s.e && s.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 5)
    .map((s) => ({ label: s.e.label, color: s.e.color, value: fmt(s.v) }));

  // total time at #1 per entity, across every reign it held
  const t0 = kf[0].t, t1 = kf[kf.length - 1].t;
  const heldMap = new Map();
  for (const r of reigns) heldMap.set(r.id, (heldMap.get(r.id) || 0) + (r.to - r.from));
  const held = [...heldMap.entries()]
    .map(([id, yrs]) => ({ label: (entById.get(id) || {}).label || id, color: (entById.get(id) || {}).color || '#888', yrs }))
    .sort((a, b) => b.yrs - a.yrs);

  // where the eventual winner first appeared on the board
  let rise = null;
  for (const k of kf) {
    const v = k.values[leader];
    if (!(v > 0)) continue;
    const rank = 1 + Object.values(k.values).filter((x) => x > v).length;
    if (rank > 1) rise = { rank, t: k.t };
    break;
  }

  const win = entById.get(leader) || {};
  // everyone level with the leader at the finish shares the top spot
  const coLeaders = Object.entries(finals)
    .filter(([id, v]) => id !== leader && v === finals[leader] && v > 0)
    .map(([id]) => (entById.get(id) || {}).label)
    .filter(Boolean);
  if (coLeaders.length) rise = null;
  return {
    reigns: reigns.map((r) => ({
      label: (entById.get(r.id) || {}).label || r.id,
      color: (entById.get(r.id) || {}).color || '#888',
      from: r.from, to: r.to,
      left: ((r.from - t0) / (t1 - t0)) * 100,
      width: ((r.to - r.from) / (t1 - t0)) * 100,
    })),
    held,
    rise,
    distinctLeaders: heldMap.size,
    leadChanges,
    longestReign: longest
      ? { label: (entById.get(longest.id) || {}).label || '', years: Math.max(1, Math.round(longest.len)) }
      : null,
    finalLeader: {
      label: [win.label || '', ...coLeaders].join(' & '),
      color: win.color || '#888',
      value: fmt(finals[leader] || 0),
      tied: coLeaders.length > 0,
    },
    spanYears: Math.round(kf[kf.length - 1].t - kf[0].t),
    standings,
  };
}

const statsById = new Map(races.map((r) => [r.id, statsFor(datasets.get(r.id))]));

/* ---------------- helpers ---------------- */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const yearOf = (t, timeLabel) => {
  const y = Math.floor(t);
  if (timeLabel === 'yearEra') {
    if (y < 0) return `${-y} BCE`;
    return y < 1000 ? `${y} CE` : String(y);
  }
  return String(y);
};
const spanOf = (ds) => {
  const kf = ds.keyframes;
  return `${yearOf(kf[0].t, ds.timeLabel)}–${yearOf(kf[kf.length - 1].t, ds.timeLabel)}`;
};

/* linear sample of entity values at time t (preview + OG only) */
function sampleAt(ds, t) {
  const kf = ds.keyframes;
  let i = 0;
  while (i < kf.length - 2 && kf[i + 1].t <= t) i++;
  const a = kf[i], b = kf[Math.min(i + 1, kf.length - 1)];
  const x = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
  const out = {};
  for (const e of ds.entities) {
    const va = a.values[e.id] ?? 0;
    const vb = b.values[e.id] ?? 0;
    out[e.id] = va + (vb - va) * x;
  }
  return out;
}

/* compact preview series for hub cards: 30 frames of every entity that is
 * ever in the top 5 at any of those frames (so early years aren't empty) */
function previewFor(ds) {
  const kf = ds.keyframes;
  const t0 = kf[0].t, t1 = kf[kf.length - 1].t;
  const N = 30;
  const best = new Map();
  for (let i = 0; i < N; i++) {
    const vals = sampleAt(ds, t0 + ((t1 - t0) * i) / (N - 1));
    ds.entities
      .filter((e) => vals[e.id] > 0)
      .sort((a, b) => vals[b.id] - vals[a.id])
      .slice(0, 5)
      .forEach((e, r) => best.set(e.id, Math.min(best.get(e.id) ?? 9, r)));
  }
  const finals = sampleAt(ds, t1);
  const top = ds.entities
    .filter((e) => best.has(e.id))
    .sort((a, b) => best.get(a.id) - best.get(b.id) || (finals[b.id] || 0) - (finals[a.id] || 0))
    .slice(0, 14);
  const frames = [];
  const log = ds.scale === 'log';
  for (let i = 0; i < N; i++) {
    const vals = sampleAt(ds, t0 + ((t1 - t0) * i) / (N - 1));
    frames.push(top.map((e) => {
      const v = vals[e.id] || 0;
      const shaped = log ? (v > 0 ? Math.log10(v) : 0) : v;
      return Math.round(shaped * 1000) / 1000;
    }));
  }
  return {
    entities: top.map((e) => ({ label: e.label, color: e.color })),
    frames,
    t0, t1,
    era: ds.timeLabel === 'yearEra' ? 1 : 0,
  };
}

/* readable text colour on top of an entity colour */
function inkFor(hex) {
  const n = parseInt(String(hex).slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? 'rgba(11,14,20,0.88)' : 'rgba(255,255,255,0.95)';
}

/* ---------------- shared chrome ---------------- */

const ICONS = {
  chip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M12 2v3M7.5 2v3M16.5 2v3M12 19v3M7.5 19v3M16.5 19v3M2 12h3M2 7.5h3M2 16.5h3M19 12h3M19 7.5h3M19 16.5h3"/></svg>',
  stopwatch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.8 1.8M9.5 2.5h5M12 2.5V6"/></svg>',
  marquee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3.5l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6-5.1-2.8-5.1 2.8 1.1-5.6-4.2-3.9 5.7-.7z" stroke-linejoin="round"/></svg>',
  blueprint: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V8m0 12h16M4 20l5-5"/><rect x="9" y="4" width="4" height="4" rx="1"/><rect x="16" y="9" width="4" height="4" rx="1"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2.5v6M12 15.5v6M2.5 12h6M15.5 12h6M5.5 5.5l4 4M14.5 14.5l4 4M18.5 5.5l-4 4M9.5 14.5l-4 4" stroke-linecap="round"/></svg>',
  coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="6.5" rx="7.5" ry="3.5"/><path d="M4.5 6.5v11c0 1.9 3.4 3.5 7.5 3.5s7.5-1.6 7.5-3.5v-11M4.5 12c0 1.9 3.4 3.5 7.5 3.5s7.5-1.6 7.5-3.5"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.4 4 5.6 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.6-4-9s1.4-6.6 4-9z"/></svg>',
  controller: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 8.5h10a4.5 4.5 0 0 1 4.5 4.5l-.7 3.5a2.5 2.5 0 0 1-4.5.8L15 15H9l-1.3 2.3a2.5 2.5 0 0 1-4.5-.8L2.5 13A4.5 4.5 0 0 1 7 8.5z"/><path d="M6 11.5v2M5 12.5h2M15.5 11.5h.01M18 13h.01" stroke-linecap="round"/></svg>',
  ship: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 15.5h18l-2.2 4.2a1.5 1.5 0 0 1-1.3.8H6.5a1.5 1.5 0 0 1-1.3-.8z" stroke-linejoin="round"/><rect x="5.5" y="10" width="4" height="5.5" rx=".6"/><rect x="10" y="10" width="4" height="5.5" rx=".6"/><rect x="14.5" y="7" width="4" height="8.5" rx=".6"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 19c0-8 5-13.5 15-14-0.5 10-6 15-14 15" stroke-linejoin="round"/><path d="M4 20c3-4 6.5-7.5 11-10.5" stroke-linecap="round"/></svg>',
  column: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 6h18M4.5 6l1-2.5h13l1 2.5M6.5 6v12M11 6v12M13 6v12M17.5 6v12M3.5 18h17l1 2.5H2.5z" stroke-linejoin="round"/></svg>',
};

const wordmark = (href = '/') => `
<a class="wordmark" href="${href}">
  <span class="wm-tick" aria-hidden="true"></span>
  <span>Overtake</span>
  <span class="wm-sub">rankings over time</span>
</a>`;

const header = (activeCat) => `
<header class="site-header">
  <div class="inner">
    ${wordmark('/')}
    <nav class="header-nav" aria-label="Categories">
      ${site.categories.map((c) =>
        `<a href="/#${c.id}"${c.id === activeCat ? ' aria-current="true"' : ''}>${esc(c.short)}</a>`
      ).join('\n      ')}
    </nav>
  </div>
</header>`;

const footer = () => `
<footer class="site-footer">
  <div class="foot-grid">
    <div class="foot-about">
      ${wordmark('/')}
      <p>${races.length} rankings, animated. Every race is built from a single dataset with its source cited on the page; sets marked <span class="quality-flag">illustrative</span> are careful reconstructions where no clean public series exists.</p>
    </div>
    <nav class="foot-cats" aria-label="Browse categories">
      ${site.categories.map((c) => {
        const n = races.filter((r) => r.category === c.id).length;
        return `<a href="/#${c.id}" style="--c:${c.accent}"><span class="fc-dot" aria-hidden="true"></span>${esc(c.short)}<span class="fc-n num">${n}</span></a>`;
      }).join('\n      ')}
    </nav>
  </div>
  <div class="inner">
    <span>Overtake · rankings over time</span>
    <span class="byline">Made by <a href="${site.authorUrl}" rel="author">Kelvin Kay</a></span>
  </div>
</footer>`;

const meta = ({ title, description, path, ogImage }) => `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="author" content="${esc(site.author)}">
  <link rel="canonical" href="${site.url}${path}">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(site.name)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${site.url}${path}">
  <meta property="og:image" content="${site.url}${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${site.url}${ogImage}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&display=swap">
  <link rel="stylesheet" href="${v('/css/site.css')}">
  ${importMap()}`;

/* ---------------- hub ---------------- */

function raceCard(r, { blurb = false } = {}) {
  const ds = datasets.get(r.id);
  const st = statsById.get(r.id);
  const cat = catById.get(r.category);
  return `
    <a class="race-card" href="/races/${r.id}/" style="--accent:${cat.accent};--accent-soft:${cat.accentSoft}">
      <div class="card-preview"><canvas data-race="${r.id}" aria-hidden="true"></canvas></div>
      <div class="card-body">
        <h3>${esc(ds.title)}</h3>
        <p class="card-meta"><span>${spanOf(ds)}</span><span>·</span><span>${ds.entities.length} contenders</span><span>·</span><span>${st.leadChanges} lead change${st.leadChanges === 1 ? '' : 's'}</span>${
          ds.dataQuality === 'illustrative'
            ? '<span class="quality illustrative">illustrative</span>' : ''
        }</p>${blurb ? `
        <p class="card-blurb">${esc(ds.blurb.split('. ')[0])}.</p>` : ''}
        <p class="card-leader num"><span class="dot" style="background:${st.finalLeader.color}" aria-hidden="true"></span><span class="cl-name">${esc(st.finalLeader.label)}</span><span class="cl-val">${esc(st.finalLeader.value)}</span></p>
      </div>
    </a>`;
}

function buildHub() {
  const previews = {};
  for (const r of races) previews[r.id] = previewFor(datasets.get(r.id));

  const t0 = Math.min(...races.map((r) => datasets.get(r.id).keyframes[0].t));
  const t1 = Math.max(...races.map((r) => {
    const kf = datasets.get(r.id).keyframes;
    return kf[kf.length - 1].t;
  }));

  const featuredRaces = (site.featured || [])
    .map((id) => races.find((r) => r.id === id))
    .filter(Boolean);
  const featured = featuredRaces.length ? `
<section class="zone zone-featured" id="featured" aria-labelledby="zh-featured">
  <div class="zone-head">
    <span class="zone-icon" aria-hidden="true">${ICONS.marquee}</span>
    <h2 id="zh-featured">Start here</h2>
    <p class="zone-blurb">An AI-powered trillion-dollar sprint, a 4,000-year imperial relay, YouTube's most famous feud and the streaming subscriber land-grab.</p>
  </div>
  <div class="card-grid">${featuredRaces.map((r) => raceCard(r, { blurb: true })).join('')}
  </div>
</section>` : '';

  /* hero stage: plays the featured races live, one after another */
  const heroRaces = featuredRaces.length ? featuredRaces : races.slice(0, 4);
  const hero0 = datasets.get(heroRaces[0].id);
  const heroTabs = heroRaces.map((r, k) => {
    const ds = datasets.get(r.id);
    const cat = catById.get(r.category);
    return `<button type="button" role="tab" class="hs-tab" data-race="${r.id}" data-title="${esc(ds.title)}" style="--accent:${cat.accent}" aria-selected="${k === 0}"><span class="hs-tab-bar" aria-hidden="true"></span>${esc(ds.shortTitle)}</button>`;
  }).join('');

  /* record book: superlatives computed across every race */
  const withStats = races.map((r) => ({ r, ds: datasets.get(r.id), st: statsById.get(r.id) }));
  const recordCol = (title, icon, note, rows) => `
    <div class="record-col">
      <div class="rc-head"><span class="rc-icon" aria-hidden="true">${icon}</span><div><h3>${title}</h3><p>${note}</p></div></div>
      <ol>${rows.map(({ r, ds, text, sub }) => `
        <li><a href="/races/${r.id}/"><span class="rc-title">${esc(ds.shortTitle)}</span><span class="rc-val num">${esc(text)}</span>${sub ? `<span class="rc-sub">${esc(sub)}</span>` : ''}</a></li>`).join('')}
      </ol>
    </div>`;
  const wildest = [...withStats].sort((a, b) => b.st.leadChanges - a.st.leadChanges).slice(0, 5)
    .map(({ r, ds, st }) => ({ r, ds, text: `${st.leadChanges} swaps`, sub: `${st.distinctLeaders} different leaders` }));
  const longest = [...withStats].sort((a, b) => b.st.spanYears - a.st.spanYears).slice(0, 5)
    .map(({ r, ds, st }) => ({ r, ds, text: `${st.spanYears.toLocaleString('en-US')} yrs`, sub: spanOf(ds) }));
  const dynasties = [...withStats].filter((x) => x.st.longestReign)
    .sort((a, b) => b.st.longestReign.years - a.st.longestReign.years).slice(0, 5)
    .map(({ r, ds, st }) => ({ r, ds, text: `${st.longestReign.years.toLocaleString('en-US')} yrs`, sub: st.longestReign.label }));
  const records = `
<section class="records-band" aria-labelledby="rb-head">
  <div class="rb-intro">
    <p class="eyebrow">The record book</p>
    <h2 id="rb-head">Superlatives across all ${races.length} races</h2>
  </div>
  <div class="records-inner">
    ${recordCol('Wildest races', ICONS.spark, 'Most changes at the top', wildest)}
    ${recordCol('Longest races', ICONS.column, 'Widest span of history', longest)}
    ${recordCol('Great dynasties', ICONS.marquee, 'Longest unbroken run at #1', dynasties)}
  </div>
</section>`;

  const zones = site.categories.map((cat) => {
    const catRaces = races.filter((r) => r.category === cat.id);
    if (!catRaces.length) return '';
    return `
<section class="zone" id="${cat.id}" data-cat="${cat.id}" aria-labelledby="zh-${cat.id}">
  <div class="zone-head">
    <span class="zone-icon" aria-hidden="true">${ICONS[cat.motif] || ''}</span>
    <h2 id="zh-${cat.id}">${esc(cat.label)}</h2>
    <span class="zone-count num">${catRaces.length}</span>
    <p class="zone-blurb">${esc(cat.blurb)}</p>
  </div>
  <div class="card-grid">${catRaces.map((r) => raceCard(r)).join('')}
  </div>
</section>`;
  }).join('\n');

  const chips = [
    `<button type="button" class="chip" data-filter="all" aria-pressed="true">All<span class="num">${races.length}</span></button>`,
    ...site.categories.map((c) => {
      const n = races.filter((r) => r.category === c.id).length;
      return `<button type="button" class="chip" data-filter="${c.id}" aria-pressed="false" style="--c:${c.accent}"><span class="chip-dot" aria-hidden="true"></span>${esc(c.short)}<span class="num">${n}</span></button>`;
    }),
  ].join('\n      ');

  const explainer = `
<section class="explainer" id="about" aria-labelledby="ex-head">
  <div class="ex-intro">
    <p class="eyebrow">How to watch</p>
    <h2 id="ex-head">Reading a bar chart race</h2>
    <p>A ranking table only tells you who's on top today. A race shows you how they got there — the slow climbs, the sudden collapses and the exact moment one contender passes another.</p>
  </div>
  <div class="ex-grid">
    <div class="ex-item">
      <div class="ex-demo ex-demo-bars" aria-hidden="true"><span style="--w:88%;--c:#4C8DFF"></span><span style="--w:64%;--c:#FFB020"></span><span style="--w:41%;--c:#F45CA4"></span></div>
      <h3>Bars re-rank in real time</h3>
      <p>Each bar is one contender. When one overtakes another it flashes, so the passes are impossible to miss.</p>
    </div>
    <div class="ex-item">
      <div class="ex-demo ex-demo-scrub" aria-hidden="true"><span class="exs-track"></span><span class="exs-fill"></span><i style="left:22%"></i><i style="left:58%"></i><i style="left:84%"></i></div>
      <h3>Diamonds mark the big moments</h3>
      <p>Milestones on the timeline pop up a short story as the playhead crosses them. Click one to jump straight there.</p>
    </div>
    <div class="ex-item">
      <div class="ex-demo ex-demo-keys" aria-hidden="true"><kbd>Space</kbd><kbd>←</kbd><kbd>→</kbd><kbd>[</kbd><kbd>]</kbd></div>
      <h3>Drive it from the keyboard</h3>
      <p>Space plays and pauses, arrows step a year at a time, brackets change speed and <kbd>R</kbd> restarts.</p>
    </div>
    <div class="ex-item">
      <div class="ex-demo ex-demo-badges" aria-hidden="true"><span class="b-src">sourced</span><span class="b-ill">illustrative</span></div>
      <h3>Honest about the data</h3>
      <p>Sourced races track published figures. Illustrative ones are labelled reconstructions where no clean series exists.</p>
    </div>
  </div>
</section>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: site.url + '/',
    description: site.description,
    author: { '@type': 'Person', name: site.author, url: site.authorUrl },
  };

  const html = `<!doctype html>
<html lang="en">
<head>${meta({
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    path: '/',
    ogImage: '/assets/og/site.png',
  })}
  <link rel="preload" href="/data/${hero0.id}.json" as="fetch" crossorigin>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body class="hub">
${header()}
<main>
  <section class="hub-hero">
    <div class="hero-copy">
      <p class="eyebrow num">${races.length} races · ${yearOf(t0, 'yearEra')} → ${yearOf(t1, 'yearEra')}</p>
      <h1>Every ranking is a race.<br><em>Watch them run.</em></h1>
      <p class="lede">${esc(site.description)}</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="#browse">Browse all ${races.length} races</a>
        <a class="btn btn-ghost" id="surprise" href="/races/${races[0].id}/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 17h3.5c2 0 3.1-1 4.3-3l2.4-4c1.2-2 2.3-3 4.3-3H21m0 0-3-3m3 3-3 3M3 7h3.5c1.6 0 2.6.6 3.5 1.8M21 17h-3.5c-1.6 0-2.6-.6-3.5-1.8M21 17l-3-3m3 3-3 3" stroke-linecap="round" stroke-linejoin="round"/></svg>Surprise me</a>
      </div>
      <dl class="hero-stats">
        <div><dt>races</dt><dd class="num">${races.length}</dd></div>
        <div><dt>categories</dt><dd class="num">${site.categories.length}</dd></div>
        <div><dt>lead changes</dt><dd class="num">${withStats.reduce((n, x) => n + x.st.leadChanges, 0)}</dd></div>
        <div><dt>contenders</dt><dd class="num">${withStats.reduce((n, x) => n + x.ds.entities.length, 0).toLocaleString('en-US')}</dd></div>
      </dl>
    </div>
    <figure class="hero-stage" aria-label="Live preview of featured races">
      <div class="hs-top">
        <span class="hs-live"><span class="live-dot" aria-hidden="true"></span>Now racing</span>
        <a class="hs-title" id="hero-title" href="/races/${hero0.id}/">${esc(hero0.title)}<span aria-hidden="true"> →</span></a>
      </div>
      <div class="hs-media"><canvas id="hero-canvas" aria-hidden="true"></canvas></div>
      <div class="hs-tabs" role="tablist" aria-label="Featured races">${heroTabs}</div>
    </figure>
  </section>

  <div class="hub-bar" id="browse">
    <div class="hub-bar-inner">
      <label class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 5 5" stroke-linecap="round"/></svg>
        <input type="search" id="race-search" placeholder="Search races, people, companies…" autocomplete="off" aria-label="Search races">
        <kbd class="search-kbd" aria-hidden="true">/</kbd>
      </label>
      <div class="chips" role="toolbar" aria-label="Filter by category">
      ${chips}
      </div>
      <span class="search-count num" id="search-count" aria-live="polite"></span>
    </div>
  </div>
${featured}
${records}
${zones}
  <p class="search-empty" id="search-empty">No races match that search — try a shorter word, or clear the category filter.</p>
${explainer}
</main>
${footer()}
<script type="application/json" id="preview-data">${JSON.stringify(previews)}</script>
<script type="module" src="${v('/js/hub.js')}"></script>
</body>
</html>`;
  writeFileSync(join(root, 'index.html'), html);
}

/* ---------------- race pages ---------------- */

function buildRacePage(r, i) {
  const ds = datasets.get(r.id);
  const st = statsById.get(r.id);
  const cat = catById.get(r.category);
  const prev = races[(i - 1 + races.length) % races.length];
  const next = races[(i + 1) % races.length];
  const prevDs = datasets.get(prev.id);
  const nextDs = datasets.get(next.id);
  // same-category neighbours, wrapping so every page cross-links its lane
  const catPeers = races.filter((x) => x.category === r.category && x.id !== r.id);
  const selfIdx = catPeers.length ? races.filter((x) => x.category === r.category).findIndex((x) => x.id === r.id) : 0;
  const related = catPeers.length
    ? Array.from({ length: Math.min(4, catPeers.length) }, (_, k) => catPeers[(selfIdx + k) % catPeers.length])
    : [];
  const kf = ds.keyframes;
  const t0 = kf[0].t, t1 = kf[kf.length - 1].t;

  const description = `${ds.blurb.split('. ')[0]}. Animated bar chart race, ${spanOf(ds)}.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: ds.title,
    description: ds.blurb,
    url: `${site.url}/races/${ds.id}/`,
    temporalCoverage: `${yearOf(t0)}/${yearOf(t1)}`,
    creator: { '@type': 'Person', name: site.author, url: site.authorUrl },
    isBasedOn: ds.source.url,
  };

  const milestoneItems = (ds.milestones || []).map((m) => `
      <li><button type="button" data-t="${m.t}">
        <span class="m-year num">${yearOf(m.t, ds.timeLabel)}</span>
        <span class="m-body"><span class="m-title">${esc(m.title)}</span>${m.text ? `<span class="m-text">${esc(m.text)}</span>` : ''}</span>
      </button></li>`).join('');

  const yrs = (n) => {
    const r = n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
    return `${r.toLocaleString('en-US')} yr${r === 1 ? '' : 's'}`;
  };
  const reignStrip = st.reigns.map((rg) => {
    const range = `${yearOf(rg.from, ds.timeLabel)}–${yearOf(rg.to, ds.timeLabel)}`;
    return `<button type="button" class="reign" data-t="${rg.from}" style="left:${rg.left.toFixed(3)}%;width:${rg.width.toFixed(3)}%;--c:${rg.color};--ink:${inkFor(rg.color)}" title="${esc(rg.label)} · ${range}" aria-label="${esc(rg.label)} led ${range}. Jump there.">${rg.width >= 11 ? `<span>${esc(rg.label)}</span>` : ''}</button>`;
  }).join('');
  const heldMax = st.held.length ? st.held[0].yrs : 1;
  const heldRows = st.held.slice(0, 6).map((h) => `
        <li><span class="h-label">${esc(h.label)}</span><span class="h-bar"><i style="width:${Math.max(2, (h.yrs / heldMax) * 100).toFixed(1)}%;background:${h.color}"></i></span><span class="h-val num">${yrs(h.yrs)}</span></li>`).join('');

  const leaderLabel = st.finalLeader.label;
  const riseFact = st.rise
    ? `<div class="fact fact-wide"><b>#${st.rise.rank} → #1</b><span>${esc(leaderLabel)} ranked #${st.rise.rank} when it first appeared in ${yearOf(st.rise.t, ds.timeLabel)} — and finished on top</span></div>`
    : '';

  const relatedPreviews = {};
  for (const rel of related) relatedPreviews[rel.id] = previewFor(datasets.get(rel.id));

  const html = `<!doctype html>
<html lang="en">
<head>${meta({
    title: `${ds.title} (${spanOf(ds)}) — ${site.name}`,
    description,
    path: `/races/${ds.id}/`,
    ogImage: `/assets/og/${ds.id}.png`,
  })}
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
${header(cat.id)}
<main class="race-main" data-cat="${cat.id}" data-race-id="${ds.id}">
  <div class="race-head">
    <p class="crumbs"><a href="/#${cat.id}">${esc(cat.label)}</a><span aria-hidden="true">/</span><span class="num">${spanOf(ds)}</span></p>
    <h1>${esc(ds.title)}</h1>
    <p class="blurb">${esc(ds.blurb)}</p>
    <div class="race-actions">
      <button type="button" class="pill-btn" id="btn-share"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" stroke-linecap="round"/></svg><span>Share this moment</span></button>
      <span class="race-tags num"><span>${ds.entities.length} contenders</span><span>${st.leadChanges} lead change${st.leadChanges === 1 ? '' : 's'}</span>${
        ds.dataQuality === 'illustrative' ? '<span class="quality-flag">illustrative data</span>' : '<span class="quality-ok">sourced data</span>'}</span>
    </div>
  </div>

  <figure class="stage" style="margin:0">
    <div class="stage-media">
      <canvas id="race-canvas" aria-label="Animated bar chart race: ${esc(ds.title)}"></canvas>
      <div class="callout" id="callout" role="status" aria-live="polite"></div>
    </div>
    <div class="transport">
      <button class="t-btn" id="btn-play" type="button" aria-label="Play"></button>
      <button class="t-btn secondary" id="btn-restart" type="button" aria-label="Restart"></button>
      <div class="scrub" id="scrub" role="slider" aria-label="Timeline" aria-valuemin="${yearOf(t0, ds.timeLabel)}" aria-valuemax="${yearOf(t1, ds.timeLabel)}">
        <div class="track"></div><div class="fill"></div><div class="thumb"></div>
      </div>
      <div class="speed" title="Playback speed (drag, or press [ and ])">
        <svg class="speed-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/><path d="M13.8 10.2 18 6M4.2 20a9 9 0 1 1 15.6 0" stroke-linecap="round"/></svg>
        <input id="speed-range" class="speed-range" type="range" min="0.25" max="3" step="0.05" value="1" aria-label="Playback speed" aria-valuetext="1×">
        <span class="speed-val num" id="speed-val">1&times;</span>
      </div>
    </div>
    <p class="step-note" id="step-note"></p>
  </figure>

  <p class="context-strip">
    <span>Source: <a href="${esc(ds.source.url)}" rel="noopener">${esc(ds.source.name)}</a></span>${
      ds.source.note ? `\n    <span>${esc(ds.source.note)}</span>` : ''}
    <span>Updated ${esc(ds.lastUpdated)}</span>
    <span class="kbd-hint"><kbd>Space</kbd> play · <kbd>←</kbd><kbd>→</kbd> step · <kbd>[</kbd><kbd>]</kbd> speed</span>
  </p>

  ${st.reigns.length ? `<section class="reigns" aria-labelledby="rg-head">
    <div class="sec-head">
      <h2 id="rg-head">Who held #1</h2>
      <p>${st.distinctLeaders === 1 ? `One leader, start to finish.` : `${st.distinctLeaders} different leaders in ${st.spanYears.toLocaleString('en-US')} years.`} Click a stretch to jump there.</p>
    </div>
    <div class="reign-strip">${reignStrip}</div>
    <div class="reign-axis num"><span>${yearOf(t0, ds.timeLabel)}</span><span>${yearOf(t1, ds.timeLabel)}</span></div>
    ${st.held.length > 1 ? `<div class="held">
      <h3>Total time at #1</h3>
      <ol>${heldRows}
      </ol>
    </div>` : ''}
  </section>` : ''}

  <div class="race-grid">
    ${milestoneItems ? `<section class="story" aria-labelledby="st-head">
      <div class="sec-head"><h2 id="st-head">Key moments</h2><p>Click any moment to replay it.</p></div>
      <ol class="milestone-list" id="milestone-list">${milestoneItems}
      </ol>
    </section>` : ''}
    <aside class="race-side">
      <section class="facts" aria-labelledby="fx-head">
        <div class="sec-head"><h2 id="fx-head">The race in numbers</h2></div>
        <div class="fact-grid">
          <div class="fact"><b class="num">${st.leadChanges}</b><span>lead change${st.leadChanges === 1 ? '' : 's'}</span></div>
          <div class="fact"><b class="num">${st.distinctLeaders}</b><span>different leader${st.distinctLeaders === 1 ? '' : 's'}</span></div>
          <div class="fact"><b class="num">${st.spanYears.toLocaleString('en-US')}</b><span>years covered</span></div>
          <div class="fact"><b class="num">${ds.entities.length}</b><span>contenders</span></div>${st.longestReign ? `
          <div class="fact fact-wide"><b>${esc(st.longestReign.label)}</b><span>longest unbroken reign — ${st.longestReign.years.toLocaleString('en-US')} yr${st.longestReign.years === 1 ? '' : 's'} at #1${st.leadChanges === 0 ? ', wire to wire' : ''}</span></div>` : ''}
          ${riseFact}
        </div>
      </section>
      <section class="standings" aria-labelledby="sd-head">
        <div class="sec-head"><h2 id="sd-head">Final standings · <span class="num">${yearOf(t1, ds.timeLabel)}</span></h2></div>
        <ol>${st.standings.map((s, k) => `
          <li><span class="s-rank num">${k + 1}</span><span class="s-dot" style="background:${s.color}" aria-hidden="true"></span><span class="s-label">${esc(s.label)}</span><span class="s-val num">${esc(s.value)}</span></li>`).join('')}
        </ol>
      </section>
    </aside>
  </div>

  ${related.length ? `<section class="related" aria-labelledby="rl-head">
    <div class="sec-head"><h2 id="rl-head">More ${esc(cat.short)} races</h2><a href="/#${cat.id}">See all ${races.filter((x) => x.category === cat.id).length} →</a></div>
    <div class="card-grid related-grid">${related.map((rel) => raceCard(rel)).join('')}
    </div>
  </section>` : ''}

  <nav class="race-pager" aria-label="More races">
    <a href="/races/${prev.id}/"><span class="dir">← Previous race</span>${esc(prevDs.title)}</a>
    <a href="/races/${next.id}/" class="pg-next"><span class="dir">Next race →</span>${esc(nextDs.title)}</a>
  </nav>
</main>
${footer()}
${related.length ? `<script type="application/json" id="preview-data">${JSON.stringify(relatedPreviews)}</script>` : ''}
<script type="module" src="${v('/js/race-page.js')}"></script>
</body>
</html>`;

  mkdirSync(join(root, 'races', ds.id), { recursive: true });
  writeFileSync(join(root, 'races', ds.id, 'index.html'), html);
}

/* ---------------- sitemap + robots ---------------- */

function buildSitemap() {
  const urls = [
    { loc: `${site.url}/`, priority: '1.0', changefreq: 'monthly' },
    ...races.map((r) => ({
      loc: `${site.url}/races/${r.id}/`,
      priority: '0.7',
      changefreq: 'yearly',
    })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
  writeFileSync(join(root, 'sitemap.xml'), xml);
  writeFileSync(join(root, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);
}

/* ---------------- OG images ---------------- */

function ogSvg(ds, cat) {
  // final standings as the representative frame
  const kf = ds.keyframes;
  const finals = sampleAt(ds, kf[kf.length - 1].t);
  const log = ds.scale === 'log';
  const shaped = (v) => (log ? (v > 0 ? Math.log10(v) : 0) : v);
  const rows = [...ds.entities]
    .map((e) => ({ ...e, v: shaped(finals[e.id] || 0) }))
    .filter((e) => e.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 6);
  const max = rows[0]?.v || 1;
  const accent = cat ? cat.accent : '#4c8dff';
  const title = ds ? ds.title : `${site.name} — ${site.tagline}`;

  const bars = rows.map((e, i) => {
    const y = 214 + i * 62;
    const w = Math.max(30, (e.v / max) * 660);
    return `
  <rect x="90" y="${y}" width="${w}" height="40" rx="6" fill="${e.color}"/>
  <text x="${90 + w + 16}" y="${y + 27}" font-size="24" fill="#9aa3b5" font-family="Menlo, monospace">${esc(e.label)}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#131a29"/><stop offset="1" stop-color="#0b0e14"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="90" y="84" width="26" height="26" rx="5" fill="${accent}" transform="skewX(-12) translate(24 0)"/>
  <text x="138" y="106" font-size="30" font-weight="800" letter-spacing="6" fill="#f2f4f8" font-family="Helvetica, Arial, sans-serif">OVERTAKE</text>
  <text x="352" y="106" font-size="19" letter-spacing="4" fill="#5c6577" font-family="Menlo, monospace">RANKINGS OVER TIME</text>
  <text x="90" y="176" font-size="52" font-weight="800" fill="#f2f4f8" font-family="Helvetica, Arial, sans-serif">${esc(title)}</text>
  ${bars}
  <text x="1110" y="590" text-anchor="end" font-size="26" fill="#39414f" font-family="Menlo, monospace">${ds ? esc(spanOf(ds)) : esc(site.tagline)}</text>
</svg>`;
}

async function buildOgImages() {
  mkdirSync(join(root, 'assets', 'og'), { recursive: true });
  let Resvg;
  try {
    ({ Resvg } = await import('@resvg/resvg-js'));
  } catch {
    console.warn('resvg not installed — writing SVGs only (run npm install, then npm run build)');
  }
  const render = (name, svg) => {
    if (!Resvg) {
      writeFileSync(join(root, 'assets', 'og', `${name}.svg`), svg);
      return;
    }
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
    writeFileSync(join(root, 'assets', 'og', `${name}.png`), png);
  };
  for (const r of races) {
    render(r.id, ogSvg(datasets.get(r.id), catById.get(r.category)));
  }
  // site-wide card: reuse the most iconic race (market cap) or first available
  const flagship = datasets.get('market-cap') || datasets.get(races[0].id);
  const fakeSite = { ...flagship, title: `${site.name} — ${site.tagline}` };
  render('site', ogSvg(fakeSite, null));
}

/* ---------------- run ---------------- */

buildHub();
races.forEach((r, i) => buildRacePage(r, i));
buildSitemap();
await buildOgImages();
console.log(`built: hub + ${races.length} race pages + sitemap + OG images`);
