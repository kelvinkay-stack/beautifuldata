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

/* ---------------- helpers ---------------- */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const yearOf = (t) => String(Math.floor(t));
const spanOf = (ds) => {
  const kf = ds.keyframes;
  return `${yearOf(kf[0].t)}–${yearOf(kf[kf.length - 1].t)}`;
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

/* compact preview series for hub cards: top-6 entities, 30 frames */
function previewFor(ds) {
  const kf = ds.keyframes;
  const t0 = kf[0].t, t1 = kf[kf.length - 1].t;
  const peak = {};
  for (const k of kf) {
    for (const [id, v] of Object.entries(k.values)) {
      peak[id] = Math.max(peak[id] ?? 0, v);
    }
  }
  const finals = sampleAt(ds, t1);
  const top = [...ds.entities]
    .sort((a, b) => (finals[b.id] || peak[b.id] || 0) - (finals[a.id] || peak[a.id] || 0))
    .slice(0, 6);
  const frames = [];
  const N = 30;
  const log = ds.scale === 'log';
  for (let i = 0; i < N; i++) {
    const vals = sampleAt(ds, t0 + ((t1 - t0) * i) / (N - 1));
    frames.push(top.map((e) => {
      const v = vals[e.id] || 0;
      const shaped = log ? (v > 0 ? Math.log10(v) : 0) : v;
      return Math.round(shaped * 1000) / 1000;
    }));
  }
  return { entities: top.map((e) => ({ label: e.label, color: e.color })), frames };
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
  <div class="inner">
    <span>Overtake — ${races.length} races across ${site.categories.length} categories. Data sources are cited on every race page.</span>
    <span class="byline"><a href="${site.authorUrl}" rel="author">Kelvin Kay</a></span>
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
  <link rel="stylesheet" href="${v('/css/site.css')}">
  ${importMap()}`;

/* ---------------- hub ---------------- */

function buildHub() {
  const previews = {};
  for (const r of races) previews[r.id] = previewFor(datasets.get(r.id));

  const t0 = Math.min(...races.map((r) => datasets.get(r.id).keyframes[0].t));
  const t1 = Math.max(...races.map((r) => {
    const kf = datasets.get(r.id).keyframes;
    return kf[kf.length - 1].t;
  }));

  const zones = site.categories.map((cat) => {
    const catRaces = races.filter((r) => r.category === cat.id);
    if (!catRaces.length) return '';
    return `
<section class="zone" id="${cat.id}" data-cat="${cat.id}" aria-labelledby="zh-${cat.id}">
  <div class="zone-head">
    <span class="zone-icon" aria-hidden="true">${ICONS[cat.motif] || ''}</span>
    <h2 id="zh-${cat.id}">${esc(cat.label)}</h2>
    <p class="zone-blurb">${esc(cat.blurb)}</p>
  </div>
  <div class="card-grid">
    ${catRaces.map((r) => {
      const ds = datasets.get(r.id);
      return `
    <a class="race-card" href="/races/${r.id}/">
      <div class="card-preview"><canvas data-race="${r.id}" aria-hidden="true"></canvas></div>
      <div class="card-body">
        <h3>${esc(ds.title)}</h3>
        <p class="card-meta"><span>${spanOf(ds)}</span><span>·</span><span>${ds.entities.length} contenders</span>${
          ds.dataQuality === 'illustrative'
            ? '<span class="quality illustrative">illustrative</span>' : ''
        }</p>
      </div>
    </a>`;
    }).join('')}
  </div>
</section>`;
  }).join('\n');

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
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
${header()}
<main>
  <section class="hub-hero">
    <h1>Every ranking is a race.<br><em>Watch them run.</em></h1>
    <p>${esc(site.description)}</p>
    <div class="hero-stats num">
      <span><b>${races.length}</b> races</span>
      <span><b>${site.categories.length}</b> categories</span>
      <span><b>${yearOf(t0)}–${yearOf(t1)}</b> covered</span>
    </div>
  </section>
${zones}
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
  const cat = catById.get(r.category);
  const prev = races[(i - 1 + races.length) % races.length];
  const next = races[(i + 1) % races.length];
  const prevDs = datasets.get(prev.id);
  const nextDs = datasets.get(next.id);
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
        <span class="m-year num">${yearOf(m.t)}</span>
        <span class="m-title">${esc(m.title)}</span>
      </button></li>`).join('');

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
    <p class="crumbs"><a href="/#${cat.id}">${esc(cat.label)}</a><span aria-hidden="true">/</span><span>${spanOf(ds)}</span></p>
    <h1>${esc(ds.title)}</h1>
    <p class="blurb">${esc(ds.blurb)}</p>
  </div>

  <figure class="stage" style="margin:0">
    <div class="stage-media">
      <canvas id="race-canvas" aria-label="Animated bar chart race: ${esc(ds.title)}"></canvas>
      <div class="callout" id="callout" role="status" aria-live="polite"></div>
    </div>
    <div class="transport">
      <button class="t-btn" id="btn-play" type="button" aria-label="Play"></button>
      <button class="t-btn secondary" id="btn-restart" type="button" aria-label="Restart"></button>
      <div class="scrub" id="scrub" role="slider" aria-label="Timeline" aria-valuemin="${yearOf(t0)}" aria-valuemax="${yearOf(t1)}">
        <div class="track"></div><div class="fill"></div><div class="thumb"></div>
      </div>
      <button class="speed-btn" id="btn-speed" type="button" aria-label="Playback speed">1×</button>
    </div>
    <p class="step-note" id="step-note"></p>
  </figure>

  <p class="context-strip">
    <span>Source: <a href="${esc(ds.source.url)}" rel="noopener">${esc(ds.source.name)}</a></span>${
      ds.source.note ? `\n    <span>${esc(ds.source.note)}</span>` : ''}${
      ds.dataQuality === 'illustrative'
        ? '\n    <span class="quality-flag">illustrative data</span>' : ''}
    <span>Updated ${esc(ds.lastUpdated)}</span>
  </p>

  ${milestoneItems ? `<h2 style="font-size:var(--fs-14);color:var(--text-faint);letter-spacing:.08em;text-transform:uppercase;margin:var(--sp-6) 0 var(--sp-3)">Key moments</h2>
  <ul class="milestone-list" id="milestone-list">${milestoneItems}
  </ul>` : ''}

  <nav class="race-pager" aria-label="More races">
    <a href="/races/${prev.id}/"><span class="dir">← Previous race</span>${esc(prevDs.shortTitle)}</a>
    <a href="/races/${next.id}/" style="text-align:right"><span class="dir">Next race →</span>${esc(nextDs.shortTitle)}</a>
  </nav>
</main>
${footer()}
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
