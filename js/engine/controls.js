/* Transport UI: play/pause, scrub bar with milestone markers, speed,
 * restart, keyboard shortcuts, and the milestone callout card. */

import { formatTime } from './format.js';

const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.6z"/></svg>';
const ICON_RESTART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 10a8 8 0 1 1 2 6.9"/><path d="M4 4v6h6" stroke-linejoin="round"/></svg>';

const SPEED_MIN = 0.25;
const SPEED_MAX = 3;

const fmtSpeed = (v) =>
  `${(Math.round(v * 100) / 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}×`;

export function mountControls(controller, els, dataset) {
  const { playBtn, restartBtn, speedRange, speedVal, scrub, callout, stepNote } = els;
  const model = controller.model;

  playBtn.innerHTML = ICON_PLAY;
  restartBtn.innerHTML = ICON_RESTART;

  /* ---- scrub bar ---- */
  const fill = scrub.querySelector('.fill');
  const thumb = scrub.querySelector('.thumb');
  const markers = [];
  for (const m of model.milestones) {
    const b = document.createElement('button');
    b.className = 'mstone';
    b.type = 'button';
    const yr = formatTime(m.t, dataset.timeLabel);
    b.setAttribute('aria-label', `Jump to ${yr}: ${m.title}`);
    b.style.left = (model.timeToProgress(m.t) * 100).toFixed(2) + '%';
    b.innerHTML = `<span class="tip">${yr} · ${escapeHtml(m.title)}</span>`;
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      controller.pause();
      controller.seek(model.timeToProgress(m.t));
      showCallout(m);
    });
    scrub.appendChild(b);
    markers.push({ el: b, t: m.t });
  }

  function setProgressUI(p) {
    const pct = (p * 100).toFixed(3) + '%';
    fill.style.width = pct;
    thumb.style.left = pct;
    const t = model.progressToTime(p);
    for (const mk of markers) mk.el.classList.toggle('passed', mk.t <= t);
  }
  setProgressUI(0);

  let scrubbing = false;
  const pFromEvent = (ev) => {
    const r = scrub.getBoundingClientRect();
    if (!(r.width > 0)) return controller.progress; // no layout — keep current
    return Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
  };
  scrub.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('.mstone')) return;
    scrubbing = true;
    scrub.setPointerCapture(ev.pointerId);
    controller.pause();
    controller.seek(pFromEvent(ev));
  });
  scrub.addEventListener('pointermove', (ev) => {
    if (scrubbing) controller.seek(pFromEvent(ev));
  });
  scrub.addEventListener('pointerup', () => (scrubbing = false));

  /* ---- buttons ---- */
  playBtn.addEventListener('click', () => controller.toggle());
  restartBtn.addEventListener('click', () => controller.restart(true));

  /* ---- speed slider ---- */
  function setSpeedUI(v, { fromInput = false } = {}) {
    const s = Math.min(SPEED_MAX, Math.max(SPEED_MIN, v));
    controller.setSpeed(s);
    if (!fromInput) speedRange.value = String(s);
    const pct = ((s - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100;
    speedRange.style.setProperty('--fill', pct.toFixed(1) + '%');
    speedRange.setAttribute('aria-valuetext', fmtSpeed(s));
    speedVal.textContent = fmtSpeed(s);
  }
  speedRange.min = String(SPEED_MIN);
  speedRange.max = String(SPEED_MAX);
  speedRange.addEventListener('input', () =>
    setSpeedUI(parseFloat(speedRange.value), { fromInput: true }));
  setSpeedUI(1);

  /* ---- keyboard ---- */
  window.addEventListener('keydown', (ev) => {
    // speed nudges work anywhere, including while the slider is focused
    if (ev.key === '[') { setSpeedUI(controller.speed - 0.25); return; }
    if (ev.key === ']') { setSpeedUI(controller.speed + 0.25); return; }
    if (ev.target.closest('input, textarea, select')) return;
    if (ev.key === ' ') { ev.preventDefault(); controller.toggle(); }
    else if (ev.key === 'ArrowRight') { controller.pause(); controller.stepBy(1); }
    else if (ev.key === 'ArrowLeft') { controller.pause(); controller.stepBy(-1); }
    else if (ev.key.toLowerCase() === 'r') controller.restart(true);
  });

  /* ---- milestone callout ---- */
  let hideTimer = 0;
  function showCallout(m) {
    callout.innerHTML =
      `<div class="co-year num">${formatTime(m.t, dataset.timeLabel)}</div>` +
      `<div class="co-title">${escapeHtml(m.title)}</div>` +
      `<div class="co-text">${escapeHtml(m.text || '')}</div>`;
    callout.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => callout.classList.remove('show'), 4500);
  }

  /* ---- controller hooks ---- */
  controller.hooks.onProgress = setProgressUI;
  controller.hooks.onMilestone = showCallout;
  controller.hooks.onPlayState = (playing) => {
    playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  };
  controller.hooks.onEnd = () => {
    playBtn.innerHTML = ICON_PLAY;
  };

  if (controller.reduced && stepNote) {
    stepNote.textContent =
      'Reduced motion is on — the race advances in steps. Use ← → to move between years.';
  }

  return { showCallout };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
