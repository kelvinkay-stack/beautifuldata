/* Race page bootstrap: fetch the dataset, lazy-load the engine, mount. */

const main = document.querySelector('.race-main');
const raceId = main.dataset.raceId;

// Engine module URLs are cache-busted by the import map injected in <head>
// at build time, so plain specifiers here always resolve to the current build.
async function boot() {
  const [ds, engine, controls] = await Promise.all([
    fetch(`/data/${raceId}.json`).then((r) => {
      if (!r.ok) throw new Error(`dataset ${raceId}: HTTP ${r.status}`);
      return r.json();
    }),
    import('/js/engine/controller.js'),
    import('/js/engine/controls.js'),
  ]);

  const canvas = document.getElementById('race-canvas');
  const controller = new engine.RaceController(canvas, ds, {});

  const ui = controls.mountControls(controller, {
    playBtn: document.getElementById('btn-play'),
    restartBtn: document.getElementById('btn-restart'),
    speedRange: document.getElementById('speed-range'),
    speedVal: document.getElementById('speed-val'),
    scrub: document.getElementById('scrub'),
    callout: document.getElementById('callout'),
    stepNote: document.getElementById('step-note'),
  }, ds);

  // milestone index below the stage (markup is static for SEO; bind here)
  for (const btn of document.querySelectorAll('#milestone-list button[data-t]')) {
    const t = parseFloat(btn.dataset.t);
    const m = controller.model.milestones.find((x) => Math.abs(x.t - t) < 1e-9);
    if (!m) continue;
    btn.addEventListener('click', () => {
      controller.pause();
      controller.seek(controller.model.timeToProgress(m.t));
      ui.showCallout(m);
      document.querySelector('.stage').scrollIntoView({
        behavior: controller.reduced ? 'auto' : 'smooth', block: 'center',
      });
    });
  }

  // A ResizeObserver re-sizes the canvas whenever the stage actually gets
  // (or changes) dimensions — robust to the canvas measuring 0 at construction
  // before layout settles, which a one-shot window 'resize' listener misses.
  let lastW = -1, rt = 0;
  const ro = new ResizeObserver((entries) => {
    const w = Math.round(entries[0].contentRect.width);
    if (w === lastW) return;
    const first = lastW < 0;
    lastW = w;
    if (w <= 0) return;
    clearTimeout(rt);
    rt = setTimeout(() => {
      controller.resize();
      // if the very first real measurement arrived after we already tried to
      // start, make sure the current frame is painted at the right size
      if (first && controller.reduced) controller.seek(1);
    }, first ? 0 : 120);
  });
  ro.observe(canvas.parentElement);

  if (controller.reduced) {
    // no unrequested motion: land on the final standings, let the
    // visitor step through with ← / → or the transport
    controller.seek(1);
  } else {
    controller.play();
  }
}

boot().catch((err) => {
  console.error(err);
  const stage = document.querySelector('.stage');
  if (stage) {
    const msg = document.createElement('p');
    msg.style.cssText = 'padding:48px 24px;color:#9aa3b5;text-align:center';
    msg.textContent = 'This race failed to load. Please refresh the page.';
    stage.prepend(msg);
  }
});
