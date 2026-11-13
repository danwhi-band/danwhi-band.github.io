'use strict';
(() => {
  const root=document.documentElement;
  const scene=document.getElementById('info');
  const panel=document.getElementById('lcd-stage');
  const source=document.getElementById('countdown');
  const pieces=document.getElementById('countdown-pieces');
  const kicker=document.getElementById('countdown-kicker');
  const truth=document.getElementById('lcd-truth');
  const mode=document.getElementById('lcd-mode');
  const toggle=document.getElementById('motion-toggle');
  const meter=Array.from(document.querySelectorAll('.lcd-meter i'));
  const svgNS = 'http://www.w3.org/2000/svg';
  const segmentMap = ['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];
  // Original seven-segment geometry: faint inactive cells, crisp active faces.
  const shapes = {
    a:'12,3 50,3 56,9 50,15 12,15 6,9',
    b:'53,17 59,11 63,19 63,48 57,54 51,48 51,23',
    c:'57,58 63,64 63,93 59,101 53,95 51,89 51,64',
    d:'12,97 50,97 56,103 50,109 12,109 6,103',
    e:'5,58 11,64 11,89 9,95 3,101 0,93 0,64',
    f:'3,11 9,17 11,23 11,48 5,54 0,48 0,19',
    g:'12,50 50,50 56,56 50,62 12,62 6,56'
  };
  function digitFace(char, ghost) {
    const svg=document.createElementNS(svgNS,'svg');
    svg.setAttribute('viewBox','0 0 64 112');svg.setAttribute('focusable','false');svg.setAttribute('aria-hidden','true');
    for(const [key,points] of Object.entries(shapes)) {
      const on=segmentMap[Number(char)].includes(key);
      if(!ghost && !on) continue;
      const polygon=document.createElementNS(svgNS,'polygon');polygon.setAttribute('points',points);
      polygon.setAttribute('class',ghost?(on?'lcd-cell lcd-cell-truth':'lcd-cell'):'lcd-cell-on');svg.append(polygon);
    }
    return svg;
  }
  if(!scene||!panel||!source||!pieces) return;
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const DURATION=700; // 38 visible numeric steps at about 18 ms each today.
  let active=false,lcdActive=false,frame=0,elapsed=0,lastTime=0,wireProgress=0;
  let lastText='',lastDisplay='',target=null,complete=false,wireDirty=true;
  const reduced=()=>preference.matches||root.classList.contains('motion-still');
  function display(text) {
    if(text===lastDisplay)return;lastDisplay=text;pieces.setAttribute('data-display',text);
    pieces.replaceChildren();pieces.classList.toggle('is-word',target===null);
    for(const [i,char] of Array.from(text).entries()) {
      const tile=document.createElement('span');tile.className='day-piece';
      if(text.startsWith('D−')&&i<2)tile.classList.add('day-piece-prefix');
      const ghost=document.createElement('span');ghost.className='day-piece-ghost';
      const ink=document.createElement('span');ink.className='day-piece-ink';
      if(/^[0-9]$/.test(char)) {
        tile.classList.add('lcd-digit');ghost.append(digitFace(char,true));ink.append(digitFace(char,false));
      }else{ghost.textContent=ink.textContent=char===' '?'\u00a0':char;}
      tile.append(ghost,ink);pieces.append(tile);
    }
  }
  function wire(p) {
    scene.style.setProperty('--date-p',p.toFixed(4));
    scene.style.setProperty('--wire-turn',`${(-16*(1-p)).toFixed(2)}deg`);
    scene.style.setProperty('--wire-lift',`${(24*(1-p)).toFixed(2)}px`);
    scene.style.setProperty('--date-lift',`${(25*(1-p)).toFixed(2)}px`);
    scene.style.setProperty('--wire-dash',((1-p)*100).toFixed(2));
    scene.style.setProperty('--date-glow',(.15+p*.45).toFixed(3));
  }
  function render(p) {
    const counting=!complete&&target!==null;
    scene.classList.toggle('lcd-counting',counting);
    if(mode)mode.textContent=counting?'COUNT-UP ANIMATION':'DAYS TO LIVE';
    if(truth)truth.textContent=`ACTUAL ${lastText}`;
    const value=complete||target===null?lastText:`D−${String(Math.floor(target*p)).padStart(String(target).length,'0')}`;
    display(value);
    meter.forEach((bar,i)=>bar.classList.toggle('lit',p>=(i+1)/meter.length));
    scene.style.setProperty('--lcd-light',clamp((p-.75)/.25,0,1).toFixed(4));
    scene.style.setProperty('--lcd-progress',p.toFixed(4));
    if(complete&&target===null&&mode)mode.textContent=lastText==='D-DAY'?'TODAY IS THE DAY':'THANK YOU';
  }
  function finish(animate=false) {
    complete=true;elapsed=DURATION;lastTime=0;wireProgress=1;wire(1);render(1);
    if(animate&&!reduced())scene.classList.add('date-complete');
  }
  function build() {
    const text=source.textContent.trim();if(!text||text===lastText)return;
    const changed=Boolean(lastText);lastText=text;
    const match=/^D−(\d+)$/.exec(text);target=match?Number(match[1]):null;
    if(kicker)kicker.textContent=text==='D-DAY'?'TODAY IS THE DAY':text==='THANK YOU'?'THANK YOU FOR THE LIVE':'DAYS UNTIL LIVE';
    root.classList.add('date-ready');
    // The accessible and small fixed actual readouts never animate or show a fictional date.
    if(changed||reduced()||target===null){finish(false);return;}
    render(0);wire(0);
  }
  function tick(now) {
    frame=0;
    if(document.hidden||reduced())return;
    if(active&&wireDirty){const b=scene.getBoundingClientRect();wireProgress=Math.max(wireProgress,clamp((window.innerHeight*.9-b.top)/Math.max(1,window.innerHeight*.65),0,1));wire(wireProgress);wireDirty=false;}
    if(lcdActive&&!complete){
      if(lastTime)elapsed+=Math.min(80,Math.max(0,now-lastTime));
      lastTime=now;
      if(elapsed>=DURATION)finish(true);else render(elapsed/DURATION);
    }else lastTime=0;
    if(lcdActive&&!complete)schedule();
  }
  function schedule(){if(!frame&&!document.hidden&&!reduced()&&((active&&wireDirty)||(lcdActive&&!complete)))frame=requestAnimationFrame(tick);}
  function cancel(){if(frame)cancelAnimationFrame(frame);frame=0;lastTime=0;}
  function sync(){cancel();if(reduced()){finish(false);return;}schedule();}
  build();
  if('MutationObserver' in window)new MutationObserver(build).observe(source,{childList:true,characterData:true,subtree:true});
  if(!('IntersectionObserver' in window)){finish(false);return;}
  new IntersectionObserver(entries=>{active=entries[0].isIntersecting;scene.classList.toggle('date-active',active);wireDirty=true;if(active)schedule();else if(!lcdActive)cancel();},{rootMargin:'80px 0px',threshold:0}).observe(scene);
  new IntersectionObserver(entries=>{
    lcdActive=entries[0].isIntersecting&&entries[0].intersectionRatio>=.35;
    panel.classList.toggle('lcd-active',lcdActive);
    if(lcdActive)schedule();else{cancel();schedule();}
  },{threshold:[0,.35,.75]}).observe(panel);
  window.addEventListener('scroll',()=>{wireDirty=true;schedule();},{passive:true});
  window.addEventListener('resize',()=>{wireDirty=true;schedule();},{passive:true});
  document.addEventListener('visibilitychange',sync);
  preference.addEventListener('change',sync);
  if(toggle)toggle.addEventListener('click',sync);
  window.addEventListener('pagehide',cancel);
})();
