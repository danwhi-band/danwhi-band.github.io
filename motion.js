'use strict';
(() => {
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const stage = document.getElementById('poster-stage');
  const toggle = document.getElementById('motion-toggle');
  const ignite = document.getElementById('ignite-button');
  const status = document.getElementById('stage-status');
  if (!hero || !stage || !toggle || !ignite) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  let manualPause = false;
  let inView = true;
  let frame = 0;
  let igniteTimer = 0;
  let ignitedAt = 0;
  let revealObserver;
  let stageObserver;
  const animated = !reduced.matches;
  const revealItems = Array.from(document.querySelectorAll('.section, .song'));
  const still = () => reduced.matches || manualPause;
  function resetDepth() {
    stage.style.setProperty('--pointer-x', '0px');
    stage.style.setProperty('--pointer-y', '0px');
    stage.style.setProperty('--scroll-lift', '0px');
  }
  function syncMotion() {
    const paused = still();
    root.classList.toggle('motion-still', paused);
    root.classList.toggle('motion-paused', paused || document.hidden);
    hero.classList.toggle('stage-playing', !paused && inView && !document.hidden);
    toggle.textContent = reduced.matches ? '모션 최소화' : manualPause ? '모션 켜기' : '모션 끄기';
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', reduced.matches ? '기기 설정에 따라 모션이 최소화되었습니다' : manualPause ? '모션 효과 켜기' : '모션 효과 끄기');
    if (paused || document.hidden || !inView) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      resetDepth();
    }
    if (paused) {
      hero.classList.remove('is-intro');
      revealItems.forEach(item => item.classList.add('is-visible'));
    }
  }
  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    }, {rootMargin:'0px 0px 80px 0px', threshold:0.05});
    revealItems.forEach((item, index) => {
      item.classList.add('reveal-item');
      if (item.classList.contains('song')) item.style.setProperty('--reveal-delay', `${index % 3 * 55}ms`);
      revealObserver.observe(item);
    });
    stageObserver = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      syncMotion();
    }, {threshold:0});
    stageObserver.observe(hero);
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
  }
  root.classList.add('motion-ready');
  if (animated) hero.classList.add('is-intro');
  syncMotion();
  document.querySelector('.stage-title').addEventListener('animationend', event => {
    if (event.animationName === 'title-envelope') hero.classList.remove('is-intro');
  });
  toggle.addEventListener('click', () => {
    if (reduced.matches) {
      status.textContent = '기기의 모션 줄이기 설정을 따르고 있어요.';
      return;
    }
    manualPause = !manualPause;
    syncMotion();
    status.textContent = manualPause ? '모션 효과를 껐어요.' : '모션 효과를 켰어요.';
  });
  ignite.addEventListener('click', () => {
    // One slow lighting cue, never rapid repeated flashes.
    const now = Date.now();
    if (now - ignitedAt < 4500) return;
    ignitedAt = now;
    hero.classList.remove('is-intro');
    hero.classList.add('is-ignited');
    status.textContent = '무대 조명을 켰어요. 소리는 재생되지 않습니다.';
    clearTimeout(igniteTimer);
    igniteTimer = setTimeout(() => hero.classList.remove('is-ignited'), 4400);
  });
  function updateScrollDepth() {
    frame = 0;
    if (still() || !inView || document.hidden) return;
    const box = stage.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -box.top / Math.max(1, box.height)));
    stage.style.setProperty('--scroll-lift', `${(-progress * 8).toFixed(2)}px`);
  }
  window.addEventListener('scroll', () => {
    if (!frame && !still() && inView && !document.hidden) frame = requestAnimationFrame(updateScrollDepth);
  }, {passive:true});
  if (finePointer.matches) {
    stage.addEventListener('pointermove', event => {
      if (still() || !inView || document.hidden || event.pointerType === 'touch') return;
      const rect = stage.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
      stage.style.setProperty('--pointer-x', `${(x * 3).toFixed(2)}px`);
      stage.style.setProperty('--pointer-y', `${(y * 2).toFixed(2)}px`);
    }, {passive:true});
    stage.addEventListener('pointerleave', () => {
      stage.style.setProperty('--pointer-x', '0px');
      stage.style.setProperty('--pointer-y', '0px');
    });
  }
  document.addEventListener('visibilitychange', syncMotion);
  reduced.addEventListener('change', syncMotion);
  window.addEventListener('pagehide', () => {
    clearTimeout(igniteTimer);
    if (frame) cancelAnimationFrame(frame);
    hero.classList.remove('is-ignited');
  });
})();
