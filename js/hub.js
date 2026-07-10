/* Hub bootstrap: the card grid is static HTML (SEO); this wakes the looping
 * canvas previews (lazily, only when cards approach the viewport) and wires
 * the search box, which filters cards by title, category and contender names. */

const dataEl = document.getElementById('preview-data');
const previews = dataEl ? JSON.parse(dataEl.textContent) : {};

if (dataEl) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

/* ---------------- search ---------------- */

const input = document.getElementById('race-search');
if (input) {
  // featured cards are duplicates of category cards; the featured band is
  // hidden entirely while searching (CSS), so index only the category grids
  const cards = [...document.querySelectorAll('.zone:not(.zone-featured) .race-card')].map((el) => {
    const id = el.querySelector('canvas[data-race]')?.dataset.race || '';
    const zone = el.closest('.zone');
    const hay = [
      el.querySelector('h3')?.textContent || '',
      zone?.querySelector('h2')?.textContent || '',
      id.replace(/-/g, ' '),
      ...(previews[id]?.entities || []).map((e) => e.label),
    ].join(' ').toLowerCase();
    return { el, zone, hay };
  });
  const zones = [...document.querySelectorAll('.zone:not(.zone-featured)')];
  const count = document.getElementById('search-count');
  const empty = document.getElementById('search-empty');
  const total = cards.length;

  const apply = () => {
    const q = input.value.trim().toLowerCase();
    document.body.classList.toggle('searching', !!q);
    if (!q) {
      for (const c of cards) c.el.style.display = '';
      for (const z of zones) z.style.display = '';
      if (count) count.textContent = '';
      empty?.classList.remove('show');
      return;
    }
    let shown = 0;
    for (const c of cards) {
      const hit = c.hay.includes(q);
      c.el.style.display = hit ? '' : 'none';
      if (hit) shown++;
    }
    for (const z of zones) {
      const any = [...z.querySelectorAll('.race-card')].some((el) => el.style.display !== 'none');
      z.style.display = any ? '' : 'none';
    }
    if (count) count.textContent = `${shown} / ${total}`;
    empty?.classList.toggle('show', shown === 0);
  };

  input.addEventListener('input', apply);
  // "/" focuses search from anywhere on the hub
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== input &&
        !/^(input|textarea)$/i.test(document.activeElement?.tagName || '')) {
      e.preventDefault();
      input.focus();
    }
  });
}
