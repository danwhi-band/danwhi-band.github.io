'use strict';
(() => {
  const map=document.getElementById('venue-map');
  if(!map)return;
  const root=document.documentElement, replay=document.getElementById('map-replay');
  const hasObserver='IntersectionObserver' in window;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false, played=false, restartFrame=0;
  const still=()=>!hasObserver||reduce.matches||root.classList.contains('motion-still');
  function sync(){
    const stopped=still();
    map.classList.toggle('map-still',stopped);
    map.classList.toggle('map-paused',document.hidden||!visible);
    replay.disabled=stopped;
    replay.setAttribute('aria-label',stopped?'모션 효과가 꺼져 있습니다':'지도 다시 펼치기');
    if(!stopped&&visible&&!document.hidden&&!played){played=true;map.classList.add('is-open');}
  }
  map.addEventListener('animationend',event=>{if(event.animationName==='map-cover-away')map.classList.add('map-revealed');});
  const options=document.getElementById('venue-map-options'),walk=document.getElementById('walk-view'),surrounding=document.getElementById('surrounding-map');
  const walkButton=document.getElementById('walk-view-button'),surroundingButton=document.getElementById('surrounding-view-button');
  if(options&&walk&&surrounding&&walkButton&&surroundingButton){
    options.hidden=false;
    function chooseMap(showSurrounding){
      walk.hidden=showSurrounding;surrounding.hidden=!showSurrounding;
      walkButton.setAttribute('aria-pressed',String(!showSurrounding));surroundingButton.setAttribute('aria-pressed',String(showSurrounding));
      cancelAnimationFrame(restartFrame);played=true;map.classList.add('is-open','map-revealed');sync();
    }
    walkButton.addEventListener('click',()=>chooseMap(false));
    surroundingButton.addEventListener('click',()=>chooseMap(true));
  }
  root.classList.add('venue-ready');replay.hidden=false;
  replay.addEventListener('click',()=>{
    if(still())return;
    cancelAnimationFrame(restartFrame);
    map.classList.remove('is-open','map-revealed');played=true;
    restartFrame=requestAnimationFrame(()=>{restartFrame=requestAnimationFrame(()=>{map.classList.add('is-open');sync();});});
  });
  if(hasObserver){
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=0.12;sync();},{threshold:0.12}).observe(map);
  }else{visible=true;map.classList.add('map-still','is-open');played=true;}
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['class']});
  reduce.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(restartFrame);if(played)map.classList.add('is-open');map.classList.add('map-paused');});
  window.addEventListener('pageshow',sync);
  sync();
  const copy=document.getElementById('address-copy'),fallback=document.getElementById('address-fallback');
  const field=document.getElementById('venue-address-copy'),status=document.getElementById('venue-copy-status');
  copy.addEventListener('click',async()=>{
    try{
      if(!navigator.clipboard||!window.isSecureContext)throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(field.value);
      fallback.hidden=true;status.textContent='공연장 주소를 복사했어요.';
    }catch{
      fallback.hidden=false;field.focus();field.select();status.textContent='아래 주소를 직접 복사해 주세요.';
    }
  });
})();
