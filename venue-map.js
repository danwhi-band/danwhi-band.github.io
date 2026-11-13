'use strict';
/* The venue's public Kakao map-share ID, not a developer API credential. */
(() => {
  const status=document.getElementById('map-load-status');
  let timeout,observer,loaded=false;
  const check=()=>{
    const tiles=document.querySelectorAll('.wrap_map img');
    if([...tiles].some(image=>image.complete&&image.naturalWidth>=256)){
      loaded=true;status.textContent='';clearTimeout(timeout);if(observer)observer.disconnect();
    }
  };
  try{
    if(!window.daum||!window.daum.roughmap||!window.daum.roughmap.Lander)throw new Error('Map provider unavailable');
    observer=new MutationObserver(check);observer.observe(document.getElementById('daumRoughmapContainer1719579296403'),{childList:true,subtree:true});
    document.addEventListener('load',check,true);
    new window.daum.roughmap.Lander({timestamp:'1719579296403',key:'2jut5',mapHeight:'320'}).render();
    timeout=setTimeout(()=>{if(!loaded)status.textContent='지도 연결이 지연되고 있어요. 아래 네이버 지도 버튼에서도 위치를 확인할 수 있습니다.';},10000);
    check();
  }catch{
    if(observer)observer.disconnect();
    status.textContent='지도를 불러오지 못했습니다. 아래 네이버 지도 버튼을 이용해 주세요.';
  }
})();
