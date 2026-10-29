/* Hub bootstrap: the card grid is static HTML (SEO); this wakes the looping
 * canvas previews (lazily, only when cards approach the viewport), plays the
 * featured races live in the hero, and wires search + category filter chips,
 * which filter cards by title, category and contender names. */

const dataEl = document.getElementById('preview-data');
const previews = dataEl ? JSON.parse(dataEl.textContent) : {};
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (dataEl) {
  // don't even load the preview module until a card approaches the viewport
  const pending = [...document.querySelectorAll('.card-preview canvas[data-race]')];
  if (pending.length) {
    const wake = new IntersectionObserver(async (entries, io) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const { mountPreview } = await import('/js/engine/preview.js');
      for (const c of pending) {
        const pv = previews[c.dataset.race];
        if (pv) mountPreview(c, pv, reduced);
      }
    }, { rootMargin: '160px' });
    wake.observe(pending[0].closest('.zone') || pending[0]);
  }
}

/* ---------------- hero: featured races, played live ---------------- */

const heroCanvas = document.getElementById('hero-canvas');
if (heroCanvas) {
  const tabs = [...document.querySelectorAll('.hs-tab')];
  const title = document.getElementById('hero-title');
  const stage = heroCanvas.closest('.hero-stage');
  const cache = new Map();
  let controller = null;
  let idx = 0;
  let nextTimer = 0;
  let visible = true;
  let token = 0;

  const fetchRace = (id) => {
    if (!cache.has(id)) {
      cache.set(id, fetch(`/data/${id}.json`).then((r) => {
        if (!r.ok) throw new Error(`dataset ${id}: HTTP ${r.status}`);
        return r.json();
      }));
    }
    return cache.get(id);
  };

  const heightFor = () => (heroCanvas.parentElement.clientWidth < 520 ? 300 : 380);

  async function show(k) {
    const my = ++token;
    clearTimeout(nextTimer);
    idx = (k + tabs.length) % tabs.length;
    const tab = tabs[idx];
    tabs.forEach((t, j) => t.setAttribute('aria-selected', String(j === idx)));
    stage.style.setProperty('--accent', getComputedStyle(tab).getPropertyValue('--accent'));
    title.firstChild.textContent = tab.dataset.title;
    title.href = `/races/${tab.dataset.race}/`;

    const [ds, engine] = await Promise.all([
      fetchRace(tab.dataset.race),
      import('/js/engine/controller.js'),
    ]);
    if (my !== token) return; // a newer tab click won the race
    controller?.destroy();
    // a slightly shorter board reads better at hero size
    const heroDs = { ...ds, topN: Math.min(ds.topN, 8) };
    controller = new engine.RaceController(heroCanvas, heroDs, {
      rendererOpts: { fixedHeight: heightFor() },
      onProgress: (p) => stage.style.setProperty('--hs-progress', p.toFixed(4)),
      onEnd: () => { nextTimer = setTimeout(() => show(idx + 1), 2600); },
    });
    controller.setSpeed(1.5);
    if (reduced) controller.seek(1);
    else if (visible) controller.play();
    // warm the next race so the hand-off is instant
    fetchRace(tabs[(idx + 1) % tabs.length].dataset.race).catch(() => {});
  }

  tabs.forEach((t, k) => t.addEventListener('click', () => show(k)));

  // pause when the hero scrolls away, resume where it left off
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!controller || reduced) return;
    if (visible && controller.progress < 1) controller.play();
    else controller.pause();
  }, { threshold: 0.15 }).observe(stage);

  let lastW = heroCanvas.parentElement.clientWidth;
  new ResizeObserver(() => {
    const w = heroCanvas.parentElement.clientWidth;
    if (!controller || w === lastW) return;
    lastW = w;
    controller.renderer.opts.fixedHeight = heightFor();
    controller.resize();
  }).observe(heroCanvas.parentElement);

  show(0).catch((err) => {
    console.error(err);
    stage.classList.add('failed');
  });
}

/* ---------------- surprise me ---------------- */

const surprise = document.getElementById('surprise');
if (surprise) {
  const ids = Object.keys(previews);
  surprise.addEventListener('click', (e) => {
    if (!ids.length) return;
    e.preventDefault();
    location.href = `/races/${ids[Math.floor(Math.random() * ids.length)]}/`;
  });
}

/* ---------------- search + category filter ---------------- */

const input = document.getElementById('race-search');
if (input) {
  // featured cards are duplicates of category cards; the featured band is
  // hidden entirely while filtering (CSS), so index only the category grids
  const cards = [...document.querySelectorAll('.zone:not(.zone-featured) .race-card')].map((el) => {
    const id = el.querySelector('canvas[data-race]')?.dataset.race || '';
    const zone = el.closest('.zone');
    const hay = [
      el.querySelector('h3')?.textContent || '',
      zone?.querySelector('h2')?.textContent || '',
      id.replace(/-/g, ' '),
      ...(previews[id]?.entities || []).map((e) => e.label),
    ].join(' ').toLowerCase();
    return { el, cat: zone?.dataset.cat, hay };
  });
  const zones = [...document.querySelectorAll('.zone:not(.zone-featured)')];
  const chips = [...document.querySelectorAll('.chip[data-filter]')];
  const count = document.getElementById('search-count');
  const empty = document.getElementById('search-empty');
  const bar = document.getElementById('browse');
  const total = cards.length;
  let filter = 'all';

  const apply = () => {
    const q = input.value.trim().toLowerCase();
    const active = !!q || filter !== 'all';
    document.body.classList.toggle('searching', active);
    let shown = 0;
    for (const c of cards) {
      const hit = (filter === 'all' || c.cat === filter) && (!q || c.hay.includes(q));
      c.el.style.display = hit ? '' : 'none';
      if (hit) shown++;
    }
    for (const z of zones) {
      const any = [...z.querySelectorAll('.race-card')].some((el) => el.style.display !== 'none');
      z.style.display = any ? '' : 'none';
    }
    if (count) count.textContent = active ? `${shown} / ${total}` : '';
    empty?.classList.toggle('show', active && shown === 0);
  };

  const setFilter = (f, { scroll = true } = {}) => {
    filter = f;
    for (const c of chips) c.setAttribute('aria-pressed', String(c.dataset.filter === f));
    apply();
    // bring the results up under the sticky bar
    if (scroll && bar && bar.getBoundingClientRect().top > 80) {
      bar.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }
  };

  for (const c of chips) c.addEventListener('click', () => setFilter(c.dataset.filter));
  input.addEventListener('input', apply);

  // header nav anchors (/#sports …) jump to a section, so they clear the filter
  window.addEventListener('hashchange', () => {
    if (filter !== 'all') setFilter('all', { scroll: false });
  });

  // "/" focuses search from anywhere on the hub
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== input &&
        !/^(input|textarea)$/i.test(document.activeElement?.tagName || '')) {
      e.preventDefault();
      input.focus();
    }
  });
}
