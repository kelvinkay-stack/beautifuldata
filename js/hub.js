/* Hub bootstrap: the card grid is static HTML (SEO); this only wakes the
 * looping canvas previews, lazily and only when cards are on screen. */

const dataEl = document.getElementById('preview-data');
if (dataEl) {
  const previews = JSON.parse(dataEl.textContent);
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
