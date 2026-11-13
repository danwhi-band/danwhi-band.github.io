'use strict';
/* Local management token only. Names/drafts never enter browser storage or URLs. */
(() => {
  const root=document.getElementById('rsvp');if(!root)return;
  const el=id=>document.getElementById('rsvp-'+id),form=el('form'),name=el('name'),party=el('party'),consent=el('consent'),website=el('website'),status=el('status'),record=el('record'),access=el('access'),remember=el('remember'),recovery=el('recovery');
  const key='danwhi-rsvp-management-v1',validToken=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v),endpoint=root.dataset.endpoint||'',closes=Date.parse(root.dataset.closes);
  let token='',entry=null,pending=null,busy=false,editing=false,cancelOpen=false,lookupOnly=false,retryAt=0,retryTimer=0,controller=null,storedToken='';
  const graphemes=value=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ko',{granularity:'grapheme'}).segment(value)]:Array.from(value);
  const normalize=value=>value.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').trim().replace(/\s+/g,' ');
  function say(text,state='idle',focus=false){status.textContent=text;root.dataset.state=state;if(focus)status.focus();}
  function closed(){return Number.isFinite(closes)&&Date.now()>=closes;}
  function configured(){try{const u=new URL(endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname!=='project.supabase.co';}catch{return false;}}
  function newToken(){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function operation(action,fields={}){return{action,token,operationId:crypto.randomUUID(),...fields};}
  function analyticsContext(){
    try{const value=window.DanwhiAnalytics?.getContext?.();if(value&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value.sessionId)&&validToken(value.sessionCapability))return{sessionId:value.sessionId,sessionCapability:value.sessionCapability};}catch{}
    return null;
  }
  function storagePreference(){if(!token)return;try{if(remember.checked){localStorage.setItem(key,token);storedToken=token;el('access-status').textContent='이 브라우저에 관리 토큰만 저장했어요.';}else{if(localStorage.getItem(key)===token)localStorage.removeItem(key);el('access-status').textContent='이 브라우저에 저장하지 않아요. 비공개 관리 링크를 직접 보관해 주세요.';}}catch{remember.checked=false;el('access-status').textContent='브라우저 저장이 차단됐어요. 비공개 관리 링크를 복사해 안전하게 보관해 주세요.';}}
  function render(){
    root.setAttribute('aria-busy',String(busy));access.hidden=!token;record.hidden=!entry;form.hidden=lookupOnly||Boolean(entry&&!editing)||cancelOpen;
    const frozen=busy||Boolean(pending);for(const node of [name,party,consent,website])node.disabled=frozen;
    el('submit').disabled=frozen||closed()||!configured();el('submit').textContent=editing?'변경 저장':'방문 등록';
    el('edit').disabled=frozen||closed()||!entry||entry.status!=='active';el('cancel-open').disabled=frozen||!entry||entry.status!=='active';el('edit-back').hidden=!editing;el('edit-back').disabled=frozen;
    el('cancel-confirm').hidden=!cancelOpen;el('cancel-confirm-button').disabled=frozen;el('cancel-back').disabled=frozen;
    recovery.hidden=!(pending||lookupOnly);el('retry').hidden=!pending;el('retry').disabled=busy||Date.now()<retryAt;el('check-server').disabled=busy||!token||Date.now()<retryAt;
    el('retry').textContent=Date.now()<retryAt?`${Math.ceil((retryAt-Date.now())/1000)}초 후 재시도`:'같은 요청 재시도';
    if(entry){const active=entry.status==='active';el('record-label').textContent=active?'SERVER CONFIRMED':'CANCELLED · SERVER CONFIRMED';el('record-name').textContent=active?entry.nickname:'방문 등록 취소됨';el('record-party').textContent=active?`${entry.partyCount}명 · 본인 포함`:'서버에서 취소를 확인했으며 이름이 삭제됐어요.';const time=new Date(entry.updatedAt);el('record-time').textContent=Number.isNaN(time.getTime())?'':`마지막 변경 ${new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(time)} · 한국시간`;}
  }
  function setCooldown(value){clearTimeout(retryTimer);const seconds=Number(value),until=Number.isFinite(seconds)?Date.now()+Math.max(1,seconds)*1000:Date.parse(value);retryAt=Number.isFinite(until)&&until>Date.now()?until:Date.now()+30000;const tick=()=>{render();if(Date.now()<retryAt)retryTimer=setTimeout(tick,Math.min(1000,retryAt-Date.now()));};tick();}
  function validEntry(r){return r&&['active','cancelled'].includes(r.status)&&Number.isInteger(r.version)&&r.version>=1&&Number.isInteger(r.partyCount)&&r.partyCount>=0&&r.partyCount<=20&&typeof r.createdAt==='string'&&typeof r.updatedAt==='string'&&Number.isFinite(Date.parse(r.createdAt))&&Number.isFinite(Date.parse(r.updatedAt))&&(r.status==='cancelled'?r.nickname===null:typeof r.nickname==='string'&&r.nickname.length>0&&r.partyCount>=1);}
  function accept(r,source){entry=r;lookupOnly=false;if(source.action!=='get'||pending&&(pending.action==='register'||r.version>=(pending.version||0)+1||r.status==='cancelled'))pending=null;editing=Boolean(pending&&pending.action==='update');cancelOpen=Boolean(pending&&pending.action==='cancel');if(!pending){name.value=r.nickname||'';party.value=String(r.partyCount||1);consent.checked=false;}el('copy-fallback').hidden=true;}
  async function request(payload,{conflict=false}={}){
    if(busy)return;if(!configured()){say('등록 서버가 아직 연결되지 않았어요. 현재 등록은 저장되지 않았습니다.','error',true);render();return;}
    busy=true;controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);say(payload.action==='get'?'서버에서 내 등록을 확인하고 있어요…':payload.action==='cancel'?'취소 결과를 서버에서 확인하고 있어요…':'서버에 저장하고 있어요. 결과가 확인될 때까지 기다려 주세요.','saving');render();let reload=false;
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',body:JSON.stringify(payload),signal:controller.signal});
      let data;try{data=await response.json();}catch{throw new Error('Uncertain response');}
      if(response.ok&&data.ok===true&&validEntry(data.registration)){
        accept(data.registration,payload);storagePreference();
        if(pending)say('현재 서버 기록을 확인했지만 이전 변경 요청의 최종 결과는 아직 확인되지 않았어요. 같은 요청을 재시도해 주세요.','uncertain',true);
        else say(entry.status==='cancelled'?'방문 등록 취소가 서버에서 확인됐어요. 이름이 삭제됐습니다.':conflict?'다른 기기에서 변경된 최신 등록을 불러왔어요. 내용을 확인한 뒤 다시 수정해 주세요.':'방문 등록이 서버에서 확인됐어요. 아래 인원이 현재 등록된 내용입니다.','confirmed',true);
      }else{
        const code=data&&data.code;
        if(response.status===429||code==='RATE_LIMITED'){setCooldown(response.headers.get('Retry-After')||'30');say('요청이 잠시 많아요. 표시된 시간이 지나면 같은 요청으로 다시 시도해 주세요.','error',true);}
        else if(code==='CONFLICT'){pending=null;cancelOpen=false;editing=false;lookupOnly=true;reload=true;say('등록이 다른 기기에서 변경됐어요. 최신 서버 기록을 다시 확인합니다.','error');}
        else if(code==='NOT_FOUND'){say(pending?'아직 서버에서 등록을 찾지 못했어요. 전송 결과는 확정되지 않았습니다. 같은 요청을 재시도해 주세요.':'이 관리 링크에 해당하는 등록을 찾지 못했어요. 링크를 확인해 주세요. 새 등록은 자동으로 만들지 않습니다.',pending?'uncertain':'error',true);lookupOnly=false;}
        else if(code==='INVALID'||code==='CLOSED'){if(payload.action!=='get')pending=null;say(code==='CLOSED'?(payload.action==='get'||payload.action==='cancel'?'등록 관리 이용 기간이 끝나 요청을 처리할 수 없어요. 보관·삭제 일정은 운영자가 안내합니다.':'신규 등록·수정 접수가 마감됐어요. 기존 관리 링크의 조회·취소는 2026년 12월 6일 정오(한국시간)까지 가능합니다.'):'입력 내용을 확인해 주세요. 이 요청은 저장되지 않았습니다.','error',true);}
        else throw new Error('Uncertain response');
      }
    }catch{
      say(payload.action==='get'?'서버 기록을 확인하지 못했어요. 현재 등록 여부를 단정할 수 없습니다. 다시 확인해 주세요.':'응답을 받지 못해 저장 여부를 확인할 수 없어요. 입력은 유지했습니다. 새 등록 대신 같은 요청을 재시도하거나 서버 기록을 확인해 주세요.','uncertain',true);if(payload.action==='get'&&!entry)lookupOnly=true;
    }finally{clearTimeout(timer);controller=null;busy=false;render();}
    if(reload)await request(operation('get'),{conflict:true});
  }
  function errorField(id,message){el(id+'-error').textContent=message;el(id).setAttribute('aria-invalid',message?'true':'false');}
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||pending||lookupOnly)return;
    const nickname=normalize(name.value),count=graphemes(nickname).length,value=party.value.trim(),partyCount=Number(value);errorField('name',!count||count>24||/\p{Surrogate}/u.test(nickname)||!nickname.replace(/[\p{Default_Ignorable_Code_Point}\s]/gu,'')?'이름 또는 닉네임을 보이는 문자 1–24자로 입력해 주세요.':'');errorField('party',!/^\d+$/.test(value)||!Number.isInteger(partyCount)||partyCount<1||partyCount>20?'본인을 포함해 1–20명의 정수를 입력해 주세요.':'');errorField('consent',!consent.checked?'개인정보 처리 안내에 동의해 주세요.':'');
    const invalid=[name,party,consent].find(node=>node.getAttribute('aria-invalid')==='true');if(invalid){invalid.focus();return;}
    if(closed()){say('방문 등록 접수가 마감됐어요.','error',true);render();return;}
    try{if(!token){token=newToken();storagePreference();}const fields={nickname,partyCount,consent:true,version:entry?entry.version:0,website:website.value};if(!entry){const analytics=analyticsContext();if(analytics)fields.analytics=analytics;}pending=operation(entry?'update':'register',fields);}catch{say('이 브라우저에서 안전한 관리 링크를 만들 수 없어요. HTTPS 지원 최신 브라우저를 이용해 주세요. 등록은 전송되지 않았습니다.','error',true);return;}
    await request(pending);
  });
  el('retry').addEventListener('click',()=>{if(pending&&!busy&&Date.now()>=retryAt)request(pending);});
  el('check-server').addEventListener('click',()=>{if(token&&!busy&&Date.now()>=retryAt)request(operation('get'));});
  el('edit').addEventListener('click',()=>{if(busy||pending||!entry||entry.status!=='active')return;editing=true;cancelOpen=false;name.value=entry.nickname;party.value=String(entry.partyCount);consent.checked=false;render();name.focus();});
  el('edit-back').addEventListener('click',()=>{if(busy||pending)return;editing=false;render();el('edit').focus();});
  el('cancel-open').addEventListener('click',()=>{if(busy||pending||!entry||entry.status!=='active')return;cancelOpen=true;editing=false;render();el('cancel-confirm-button').focus();});
  el('cancel-back').addEventListener('click',()=>{if(busy)return;cancelOpen=false;render();el('cancel-open').focus();});
  el('cancel-confirm-button').addEventListener('click',()=>{if(busy||pending||!entry||entry.status!=='active'||!cancelOpen)return;pending=operation('cancel',{version:entry.version});request(pending);});
  remember.addEventListener('change',storagePreference);
  el('copy').addEventListener('click',async()=>{if(!token)return;const url=new URL(window.location.href);url.search='';url.hash='rsvp='+token;const link=url.href;try{await navigator.clipboard.writeText(link);el('access-status').textContent='비공개 관리 링크를 복사했어요. 안전한 곳에 보관하고 다른 사람에게 보내지 마세요.';el('copy-fallback').hidden=true;}catch{el('private-link').value=link;el('copy-fallback').hidden=false;el('private-link').focus();el('private-link').select();el('access-status').textContent='자동 복사가 차단됐어요. 아래 관리 링크를 직접 복사해 주세요.';}});
  try{const saved=localStorage.getItem(key);if(validToken(saved))storedToken=saved;}catch{}
  const fragment=window.location.hash;if(fragment.startsWith('#rsvp=')){
    const candidate=fragment.slice(6);if(validToken(candidate))token=candidate;
    try{history.replaceState(history.state,'',window.location.pathname+window.location.search);}catch{}
    if(!token){lookupOnly=true;say('관리 링크 형식이 올바르지 않아요. 등록은 새로 만들지 않습니다.','error');}
  }else token=storedToken;
  if(token){remember.checked=storedToken===token;lookupOnly=true;render();if(storedToken&&storedToken!==token)el('access-status').textContent='다른 등록의 관리 정보가 이 브라우저에 저장돼 있어요. 현재 등록을 기억하려면 위 항목을 체크해 주세요.';try{request(operation('get'));}catch{say('이 브라우저에서 관리 정보를 안전하게 확인할 수 없어요.','error');}}
  else{if(!lookupOnly)say(closed()?'방문 등록 접수가 마감됐어요.':configured()?'이름과 본인을 포함한 인원을 입력해 주세요. 아직 등록되지 않았습니다.':'등록 서버 연결을 준비 중입니다. 현재 등록은 저장되지 않습니다.');render();}
  window.addEventListener('pagehide',()=>{clearTimeout(retryTimer);if(controller)controller.abort();});
  window.addEventListener('pageshow',()=>{if(retryAt>Date.now())setCooldown(String(Math.ceil((retryAt-Date.now())/1000)));else render();});
})();
