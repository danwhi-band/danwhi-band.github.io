'use strict';
(() => {
  // Silent synthetic rhythm, not an audio analyser. No microphone or audio access.
  const canvas = document.getElementById('eq-canvas');
  const hero = document.querySelector('.hero');
  const root = document.documentElement;
  if (!canvas || !hero || !canvas.getContext || !('MutationObserver' in window)) return;
  const ctx = canvas.getContext('2d', {alpha:true});
  if (!ctx) return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const COLS = 104, ROWS = 36, DURATION = 2900, FPS = 30;
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = COLS; maskCanvas.height = ROWS;
  const maskContext = maskCanvas.getContext('2d', {willReadFrequently:true});
  if (!maskContext) return;
  let mask = new Uint8Array(COLS * ROWS);
  let frame = 0, elapsed = 0, last = 0, painted = -100, running = false, currentCue = '', ready = false;
  let width = 720, height = 340;
  const clamp = (x,a,b) => Math.min(b,Math.max(a,x));
  function state(value) { if (canvas.dataset.eqState !== value) canvas.dataset.eqState = value; }
  function size() {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    width = Math.round(Math.max(260, box.width || 360) * dpr);
    height = Math.round(width / 2.12);
    canvas.width = width; canvas.height = height;
  }
  function makeMask() {
    maskContext.clearRect(0,0,COLS,ROWS);
    maskContext.fillStyle = '#fff';
    maskContext.font = '400 29px Anton, Impact, sans-serif';
    maskContext.textAlign = 'center'; maskContext.textBaseline = 'alphabetic';
    maskContext.fillText('DANWHI', COLS / 2, 28, COLS - 3);
    const data = maskContext.getImageData(0,0,COLS,ROWS).data;
    for(let i=0;i<mask.length;i++) mask[i] = data[i*4+3] > 90 ? 1 : 0;
  }
  function draw(ms) {
    const cellX = width / COLS, cellY = height / ROWS;
    const time = ms / 1000;
    const sweep = clamp((ms - 360) / 1100, 0, 1) * (COLS + 8);
    const settle = clamp((ms - 1250) / 750, 0, 1);
    ctx.clearRect(0,0,width,height);
    const entry = clamp(ms / 450, 0, 1);
    const final = ms >= DURATION;
    for(let x=0;x<COLS;x++) {
      const rhythm = .5 + .5 * Math.sin(x * .24 - time * 3.4) * Math.cos(x * .11 + time * 2.1);
      const heightCells = (final ? 4 + Math.sin(x*.23)*2 : (6 + rhythm * 27) * (1-settle) + (3 + rhythm * 6) * settle) * entry;
      for(let y=0;y<ROWS;y++) {
        const letter = mask[y*COLS+x] && x < sweep;
        const bar = y >= ROWS - heightCells;
        if (!letter && !bar) continue;
        ctx.fillStyle = letter ? '#f0e7d9' : y < ROWS-9 ? '#b94e59' : '#903039';
        if(letter && x > sweep-3) ctx.fillStyle='#c56870';
        const gapX = Math.max(.7, cellX*.18), gapY = Math.max(.8, cellY*.22);
        ctx.fillRect(x*cellX,y*cellY,cellX-gapX,cellY-gapY);
      }
    }
    state(ms < 360 ? 'bars' : ms < 1460 ? 'resolve' : final ? 'settled' : 'hold');
  }
  const enabled = () => !preference.matches && !root.classList.contains('motion-still') && !document.hidden && hero.classList.contains('stage-playing');
  function stop() { if(frame) cancelAnimationFrame(frame); frame=0; last=0; running=false; }
  function tick(now) {
    frame=0;
    if(!enabled()) { stop(); state('paused'); return; }
    if(last) elapsed += Math.min(80,now-last);
    last=now;
    if(now-painted >= 1000/FPS || elapsed >= DURATION) { draw(Math.min(elapsed,DURATION)); painted=now; }
    if(elapsed < DURATION) frame=requestAnimationFrame(tick);
    else { running=false; state('settled'); }
  }
  function sync() {
    if(!ready) return;
    const cue = hero.classList.contains('is-ignited') ? 'replay' : hero.classList.contains('is-intro') ? 'intro' : '';
    if(cue !== currentCue) { stop(); currentCue=cue; elapsed=0; painted=-100; if(cue) draw(0); }
    if(!cue) { stop(); state('off'); return; }
    if(!enabled()) { stop(); state('paused'); return; }
    if(!running && elapsed < DURATION) { running=true; frame=requestAnimationFrame(tick); }
  }
  const observer = new MutationObserver(sync);
  observer.observe(hero,{attributes:true,attributeFilter:['class']});
  observer.observe(root,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',sync);
  preference.addEventListener('change',sync);
  window.addEventListener('resize',() => { if(!ready) return; size(); if(currentCue) draw(Math.min(elapsed,DURATION)); },{passive:true});
  window.addEventListener('pagehide',stop);
  Promise.resolve(document.fonts ? document.fonts.ready : undefined).then(() => {
    makeMask(); root.classList.add('eq-ready'); size(); ready=true; sync();
  });
})();
