'use strict';
/* Names stay in page memory. No network, storage, analytics, QR or booking operation. */
(() => {
  const section=document.getElementById('invitation-card');
  if(!section)return;
  const form=document.getElementById('ticket-form'),input=document.getElementById('ticket-name');
  const create=document.getElementById('ticket-create'),save=document.getElementById('ticket-download'),share=document.getElementById('ticket-share');
  const canvas=document.getElementById('ticket-canvas'),preview=document.getElementById('ticket-image'),loading=document.getElementById('ticket-preview-loading');
  const error=document.getElementById('ticket-name-error'),status=document.getElementById('ticket-status'),openImage=document.getElementById('ticket-open-image');
  const context=canvas.getContext('2d'),filename='danwhi-invitation-2026-12-05.png';
  let posterPromise,nameFontPromise,baseFontPromise,objectURL='',preparedFile=null,generation=0,busy=false,rendered=false;
  const graphemes=text=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ko',{granularity:'grapheme'}).segment(text)].map(part=>part.segment):Array.from(text);
  const normalizeName=value=>value.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').trim().replace(/\s+/g,' ');
  function timeout(promise){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Asset timeout')),15000);})]).finally(()=>clearTimeout(timer));}
  function poster(){
    if(!posterPromise)posterPromise=new Promise((resolve,reject)=>{
      const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{posterPromise=null;reject(new Error('Poster unavailable'));};image.src='/assets/poster.png';
    });return posterPromise;
  }
  function baseFonts(){
    if(!baseFontPromise)baseFontPromise=document.fonts?Promise.all([document.fonts.load('400 180px Anton','DANWHI'),document.fonts.load('700 26px "Noto Sans KR"','초대 카드 공연 안내 서울특별시 서초구 주흥길 지하 신논현역 출구 도보 오후 시작')]).catch(e=>{baseFontPromise=null;throw e;}):Promise.resolve();
    return baseFontPromise;
  }
  function nameFont(){
    if(!nameFontPromise){
      if(typeof FontFace!=='function'||!document.fonts)return Promise.resolve();
      const font=new FontFace('Ticket Hangul','url(/assets/fonts/ticket-hangul.woff2)',{weight:'700',style:'normal'});
      nameFontPromise=font.load().then(loaded=>{document.fonts.add(loaded);}).catch(e=>{nameFontPromise=null;throw e;});
    }return nameFontPromise;
  }
  function text(value,x,y,size,family='"Anton",Impact,sans-serif',color='#f2ebdb',weight='400'){
    context.fillStyle=color;context.font=`${weight} ${size}px ${family}`;context.textAlign='left';context.fillText(value,x,y);
  }
  function fitted(value,x,y,maxWidth,size,family,color,weight='400'){
    let current=size;context.font=`${weight} ${current}px ${family}`;
    while(context.measureText(value).width>maxWidth&&current>20){current-=1;context.font=`${weight} ${current}px ${family}`;}
    text(value,x,y,current,family,color,weight);return current;
  }
  function nameLines(name,size){
    context.font=`700 ${size}px "Ticket Hangul","Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif`;
    const lines=[];let line='';
    for(const char of graphemes(name)){
      if(line&&context.measureText(line+char).width>748){lines.push(line.trim());line=char;}else line+=char;
    }if(line)lines.push(line.trim());return lines;
  }
  function draw(image,name){
    if(!context)throw new Error('Canvas unavailable');
    const ink='#151413',red='#903039',paper='#f2ebdb',korean='"Ticket Hangul","Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
    context.setTransform(1,0,0,1,0,0);context.globalAlpha=1;context.globalCompositeOperation='source-over';context.filter='none';
    context.fillStyle=red;context.fillRect(0,0,900,1400);
    context.strokeStyle='#210d1640';context.lineWidth=1;
    for(let y=14;y<1400;y+=13){context.beginPath();context.moveTo(0,y);context.lineTo(900,y+5);context.stroke();}
    text('MOBICIAN REGULAR LIVE',54,66,23,'monospace',ink,'700');
    text('INVITATION / 2026',570,66,20,'monospace',ink);
    fitted('DANWHI',47,269,806,206,'"Anton",Impact,sans-serif',ink);
    text('A NIGHT WITH YOU.',55,320,25,'monospace',ink,'700');
    // Original poster: uncropped, unfiltered, full opacity. No layer is drawn over it.
    const posterWidth=366,posterHeight=posterWidth*image.naturalHeight/image.naturalWidth;
    context.drawImage(image,54,355,posterWidth,posterHeight);
    context.strokeStyle='#211516';context.lineWidth=2;context.strokeRect(53,354,posterWidth+2,posterHeight+2);
    text('SAVE THE DATE',464,390,18,'monospace',ink,'700');
    text('12.05',455,505,108,'"Anton",Impact,sans-serif',ink);
    text('2026 · SAT',464,549,26,'monospace',ink,'700');
    text('18:00',461,618,60,'"Anton",Impact,sans-serif',ink);
    text('오후 6시 공연 시작',464,654,24,korean,ink,'700');
    context.fillStyle=ink;context.fillRect(464,678,382,2);
    fitted('PULSE LIVE HALL',461,732,385,47,'"Anton",Impact,sans-serif',ink);
    fitted('서울특별시 서초구',464,777,382,24,korean,ink,'700');
    fitted('주흥길 12, 지하 1층',464,809,382,24,korean,ink,'700');
    fitted('신논현역 1번 출구',464,854,382,24,korean,ink,'700');
    text('도보 약 5분',464,887,24,korean,ink,'700');
    context.setLineDash([12,10]);context.strokeStyle=paper;context.lineWidth=2;context.beginPath();context.moveTo(32,920);context.lineTo(868,920);context.stroke();context.setLineDash([]);
    context.fillStyle=ink;context.fillRect(0,944,900,316);
    text('THIS NIGHT IS FOR',62,996,20,'monospace','#b77c80');
    if(name){
      let size=88,lines=nameLines(name,size);while(lines.length>2&&size>28){size-=2;lines=nameLines(name,size);}
      const y=lines.length===1?1117:1071;lines.forEach((line,i)=>text(line,62,y+i*(size+13),size,korean,paper,'700'));
      text('님을 초대합니다.',64,1221,27,korean,'#c9b4a5','700');
    }else{text('YOUR NAME',61,1123,102,'"Anton",Impact,sans-serif',paper);text('이름을 넣어 나만의 초대 카드를 만드세요.',64,1221,23,korean,'#c9b4a5','700');}
    fitted('초대 카드 · 예매/입장권 아님',54,1320,792,32,korean,paper,'700');
    text('danwhi-band.github.io',54,1366,24,'monospace',paper);
    text('KEEP THE NIGHT.',590,1366,20,'monospace',paper);
  }
  function setEnabled(enabled){save.disabled=!enabled;share.disabled=!enabled;}
  input.addEventListener('input',()=>{
    generation++;setEnabled(false);openImage.hidden=true;error.textContent='';input.removeAttribute('aria-invalid');
    if(rendered||busy)status.textContent='이름을 바꿨어요. 카드 만들기를 다시 눌러 주세요.';
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    const name=normalizeName(input.value),count=graphemes(name).length;
    if(!name||count>24){error.textContent=!name?'카드에 넣을 이름을 입력해 주세요.':'이름은 24자 이내로 입력해 주세요.';input.setAttribute('aria-invalid','true');input.focus();setEnabled(false);return;}
    error.textContent='';input.removeAttribute('aria-invalid');const request=++generation;busy=true;create.disabled=true;setEnabled(false);status.textContent='이 브라우저에서 이미지를 만들고 있어요…';
    try{
      const [image]=await timeout(Promise.all([poster(),baseFonts(),nameFont()]));
      if(request!==generation)return;
      draw(image,name);loading.hidden=true;
      const blob=await timeout(new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Image export failed')),'image/png')));
      if(request!==generation)return;
      const nextURL=URL.createObjectURL(blob),oldURL=objectURL;objectURL=nextURL;
      preview.src=nextURL;preview.alt=`${name}님을 위한 단휘밴드 초대 카드. 2026년 12월 5일 토요일 오후 6시 시작. 펄스 라이브홀, 서울특별시 서초구 주흥길 12, 지하 1층. 신논현역 1번 출구에서 도보 약 5분. 예매권이나 입장권이 아닙니다.`;
      preview.hidden=false;canvas.hidden=true;openImage.href=nextURL;openImage.hidden=false;
      preparedFile=typeof File==='function'?new File([blob],filename,{type:'image/png'}):null;
      if(oldURL)URL.revokeObjectURL(oldURL);rendered=true;setEnabled(true);section.classList.remove('ticket-ready');requestAnimationFrame(()=>section.classList.add('ticket-ready'));
      status.textContent='초대 카드가 준비됐어요. 저장하거나 원하는 곳에 공유해 주세요.';
    }catch{
      posterPromise=null;baseFontPromise=null;nameFontPromise=null;
      status.textContent='이미지를 만들지 못했어요. 연결 상태를 확인하고 다시 눌러 주세요.';
    }finally{busy=false;create.disabled=false;}
  });
  save.addEventListener('click',()=>{
    if(save.disabled||!objectURL)return;
    const link=document.createElement('a');link.href=objectURL;link.download=filename;document.body.appendChild(link);link.click();link.remove();
    status.textContent='이미지 저장을 요청했어요. 저장되지 않으면 아래 큰 이미지를 열어 길게 눌러 주세요.';
  });
  share.addEventListener('click',async()=>{
    if(share.disabled||!objectURL)return;
    let shareable=false;try{shareable=Boolean(preparedFile&&navigator.share&&navigator.canShare&&navigator.canShare({files:[preparedFile]}));}catch{}
    if(!shareable){
      status.textContent='이 브라우저는 이미지 공유를 지원하지 않아요. 이미지를 저장하거나 길게 눌러 공유해 주세요.';openImage.hidden=false;return;
    }
    share.disabled=true;
    try{await navigator.share({files:[preparedFile],title:'DANWHI 공연 초대 카드'});status.textContent='공유 화면을 닫았어요.';}
    catch(e){status.textContent=e&&e.name==='AbortError'?'공유를 취소했어요.':'공유하지 못했어요. 이미지 저장을 이용해 주세요.';}
    finally{if(!save.disabled)share.disabled=false;}
  });
  window.addEventListener('pagehide',event=>{if(!event.persisted&&objectURL)URL.revokeObjectURL(objectURL);});
  // No full-name font request until the visitor explicitly creates a card.
  timeout(Promise.all([poster(),baseFonts()])).then(([image])=>{if(!rendered&&!busy){draw(image,'');loading.hidden=true;}}).catch(()=>{posterPromise=null;baseFontPromise=null;loading.textContent='이름을 입력하고 카드 만들기를 눌러 주세요.';});
})();
