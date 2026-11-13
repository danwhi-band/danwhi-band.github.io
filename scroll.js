'use strict';
(() => {
  const root = document.documentElement;
  const scene = document.getElementById('scroll-stage');
  const sticky = document.querySelector('.stack-sticky');
  const toggle = document.getElementById('motion-toggle');
  if (!scene || !sticky) return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = false;
  let frame = 0;
  let lastY = window.scrollY;
  let lastTime = performance.now();
  let stretch = 0;
  let impulse = 0;
  let lastTick = 0;
  const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
  const paused = () => preference.matches || root.classList.contains('motion-still') || document.hidden;
  function resetVelocity() {
    stretch = 0; impulse = 0;
    root.style.setProperty('--velocity-scale', '1');
    root.style.setProperty('--velocity-skew', '0deg');
  }
  function updateScene() {
    const box = scene.getBoundingClientRect();
    const top = clamp(window.innerHeight * .07, 14, 55);
    const distance = Math.max(1, box.height - sticky.offsetHeight);
    const progress = clamp((top - box.top) / distance, 0, 1);
    const rise = clamp((progress - .13) / .72, 0, 1);
    const eased = rise * rise * (3 - 2 * rise);
    scene.style.setProperty('--stack-p', progress.toFixed(4));
    scene.style.setProperty('--card-b-y', `${((1 - eased) * 112).toFixed(2)}%`);
    scene.style.setProperty('--card-a-scale', (1 - eased * .12).toFixed(4));
    scene.style.setProperty('--card-a-y', `${(-eased * 12).toFixed(2)}px`);
    scene.style.setProperty('--card-b-rotate', `${(-4 * (1 - eased)).toFixed(2)}deg`);
    scene.style.setProperty('--burst-rotate', `${(-18 + progress * 75).toFixed(2)}deg`);
    scene.style.setProperty('--stack-glow', progress.toFixed(4));
    // Five staggered native-scroll shutters; no time-driven scroll progress.
    for (let i = 0; i < 5; i++) {
      const c = clamp((progress - .12 - i * .045) / .53, 0, 1);
      const travel = c * c * (3 - 2 * c) * 116 * (i % 2 ? 1 : -1);
      scene.style.setProperty(`--curtain-${i}`, `${travel.toFixed(2)}%`);
    }
    scene.style.setProperty('--live-scale', (.88 + eased * .12).toFixed(4));
    scene.style.setProperty('--live-title-scale', (1.22 - eased * .22).toFixed(4));
    scene.style.setProperty('--live-mask', `${((1 - eased) * 100).toFixed(2)}%`);
    scene.style.setProperty('--live-title-y', `${((1 - eased) * 20).toFixed(2)}px`);
  }
  function tick(time) {
    frame = 0;
    if (!active || paused()) { resetVelocity(); return; }
    const dt = Math.min(40, Math.max(8, time - (lastTick || time - 16)));
    lastTick = time;
    updateScene();
    // Bounded velocity response on decorative letters only, with exponential rebound.
    impulse *= Math.pow(.90, dt / 16.67);
    stretch += (impulse - stretch) * (1 - Math.pow(.55, dt / 16.67));
    root.style.setProperty('--velocity-scale', (1 + clamp(stretch, -.09, .14)).toFixed(4));
    root.style.setProperty('--velocity-skew', `${clamp(stretch * 18, -1.8, 2.4).toFixed(3)}deg`);
    if (Math.abs(stretch) > .0007 || Math.abs(impulse) > .0007) frame = requestAnimationFrame(tick);
    else resetVelocity();
  }
  function schedule() { if (!frame && active && !paused()) frame = requestAnimationFrame(tick); }
  function sync() {
    if (paused()) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      resetVelocity();
    } else {
      lastY = window.scrollY;
      lastTime = performance.now();
      schedule();
    }
  }
  // Without observation support keep the accessible, ordinary static two-poster flow.
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    active = entries[0].isIntersecting;
    if (!active) { if (frame) cancelAnimationFrame(frame); frame = 0; resetVelocity(); }
    else schedule();
  }, {rootMargin:'120px 0px', threshold:0});
  observer.observe(scene);
  root.classList.add('scroll-ready');
  window.addEventListener('scroll', () => {
    const now = performance.now();
    const delta = window.scrollY - lastY;
    const elapsed = Math.min(64, Math.max(12, now - lastTime));
    lastY = window.scrollY; lastTime = now;
    if (!active || paused()) return;
    impulse = clamp(delta / elapsed * .025, -.09, .14);
    schedule();
  }, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  document.addEventListener('visibilitychange', sync);
  preference.addEventListener('change', sync);
  if (toggle) toggle.addEventListener('click', sync);
  window.addEventListener('pagehide', () => { if (frame) cancelAnimationFrame(frame); frame = 0; resetVelocity(); });
})();
