/* Validates every dataset in /data against the spec in docs/DATA-SPEC.md.
 * Exits non-zero on any error so builds can't ship broken races. */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const catIds = new Set(config.categories.map((c) => c.id));
const expected = new Map(config.races.map((r) => [r.id, r.category]));

const dataDir = join(root, 'data');
const files = readdirSync(dataDir).filter((f) => f.endsWith('.json') && f !== 'manifest.json');

let errors = 0;
let warnings = 0;
const err = (f, msg) => { console.error(`  ERROR ${f}: ${msg}`); errors++; };
const warn = (f, msg) => { console.warn(`  warn  ${f}: ${msg}`); warnings++; };

for (const f of files.sort()) {
  let ds;
  try {
    ds = JSON.parse(readFileSync(join(dataDir, f), 'utf8'));
  } catch (e) {
    err(f, `invalid JSON — ${e.message}`);
    continue;
  }

  if (ds.id !== f.replace(/\.json$/, '')) err(f, `id "${ds.id}" ≠ filename`);
  if (!catIds.has(ds.category)) err(f, `unknown category "${ds.category}"`);
  if (expected.has(ds.id) && expected.get(ds.id) !== ds.category)
    err(f, `category "${ds.category}" ≠ manifest "${expected.get(ds.id)}"`);
  for (const k of ['title', 'shortTitle', 'blurb', 'lastUpdated']) {
    if (typeof ds[k] !== 'string' || !ds[k].trim()) err(f, `missing ${k}`);
  }
  if (!ds.unit || typeof ds.unit.format !== 'string') err(f, 'missing unit.format');
  if (!['sourced', 'illustrative'].includes(ds.dataQuality)) err(f, 'dataQuality must be sourced|illustrative');
  if (!ds.source?.name || !ds.source?.url) err(f, 'missing source.name/url');
  if (ds.topN && (ds.topN < 6 || ds.topN > 12)) warn(f, `unusual topN ${ds.topN}`);

  const ids = new Set();
  const colors = new Map();
  for (const e of ds.entities || []) {
    if (!e.id || !e.label) { err(f, 'entity missing id/label'); continue; }
    if (ids.has(e.id)) err(f, `duplicate entity id "${e.id}"`);
    ids.add(e.id);
    if (!/^#[0-9a-fA-F]{6}$/.test(e.color || '')) err(f, `entity "${e.id}" bad color "${e.color}"`);
    else {
      const c = e.color.toLowerCase();
      if (colors.has(c)) warn(f, `color ${c} reused by "${e.id}" and "${colors.get(c)}"`);
      colors.set(c, e.id);
    }
  }
  if (ids.size < 8) warn(f, `only ${ids.size} entities`);

  const kf = ds.keyframes || [];
  if (kf.length < 10) err(f, `only ${kf.length} keyframes`);
  let prevT = -Infinity;
  const seen = new Set();
  const isLog = ds.scale === 'log';
  kf.forEach((k, i) => {
    if (typeof k.t !== 'number') { err(f, `keyframe[${i}] t not a number`); return; }
    if (k.t <= prevT) err(f, `keyframe[${i}] t=${k.t} not ascending`);
    prevT = k.t;
    for (const [id, v] of Object.entries(k.values || {})) {
      if (!ids.has(id)) err(f, `keyframe[${i}] references unknown entity "${id}"`);
      if (typeof v !== 'number' || !isFinite(v)) err(f, `keyframe[${i}].${id} not a number`);
      else if (v < 0) err(f, `keyframe[${i}].${id} negative`);
      else if (isLog && v !== 0 && v <= 0) err(f, `log-scale value must be > 0`);
      if (v > 0) seen.add(id);
    }
  });
  for (const id of ids) {
    if (!seen.has(id)) warn(f, `entity "${id}" never has a value > 0`);
  }

  const t0 = kf[0]?.t, t1 = kf[kf.length - 1]?.t;
  for (const m of ds.milestones || []) {
    if (typeof m.t !== 'number' || m.t < t0 || m.t > t1)
      err(f, `milestone "${m.title}" t=${m.t} outside [${t0}, ${t1}]`);
    if (!m.title) err(f, 'milestone missing title');
    if ((m.title || '').length > 48) warn(f, `milestone title long: "${m.title}"`);
  }
  if ((ds.milestones || []).length < 3) warn(f, `only ${(ds.milestones || []).length} milestones`);
}

const present = new Set(files.map((f) => f.replace(/\.json$/, '')));
for (const id of expected.keys()) {
  if (!present.has(id)) console.warn(`  todo  dataset not yet written: ${id}.json`);
}

console.log(`\n${files.length} datasets checked — ${errors} errors, ${warnings} warnings`);
process.exit(errors ? 1 : 0);
