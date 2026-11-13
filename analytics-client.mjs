import {newSession,loadSession,saveSession,clearSession,sessionActive,validCapability,registrationContext,interactionPayload} from './analytics-core.mjs';
export const ENDPOINT='https://nqfbpyzuczjqurxcjxiy.supabase.co/functions/v1/danwhi-analytics';
// All network payloads are explicitly constructed; there is no caller-supplied property bag.
export function createAnalyticsClient({storage,attribution,fetcher,uuid,now=Date.now,visible=()=>true,onUnavailable=()=>{}}){
 let enabled=false,generation=0,session=null,queue=[],working=false,hasPage=false,pageEventId=null;
 let lastUserActivity=0,lastHeartbeat=0,lastWrite=0;const controllers=new Set();
 const active=()=>enabled&&visible();
 function persist(){if(!saveSession(storage,session)){disable();onUnavailable();return false}return true}
 function disable(){enabled=false;generation++;queue=[];session=null;hasPage=false;for(const c of controllers)c.abort();controllers.clear();clearSession(storage)}
 async function post(body,g){
  // At most one retry, reusing event UUID, so an uncertain delivery cannot double-count.
  for(let attempt=0;attempt<2;attempt++){
   if(!enabled||g!==generation)throw Error('Disabled');
   const c=new AbortController();controllers.add(c);const timer=setTimeout(()=>c.abort(),5000);
   try{
    const response=await fetcher(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:c.signal});
    const data=await response.json().catch(()=>({}));
    if(!enabled||g!==generation)throw Error('Disabled');
    if(response.status===409&&(data.code==='SESSION_EXPIRED'||data.error==='SESSION_EXPIRED')){const e=Error('Expired');e.expired=true;throw e}
    if(!response.ok){const e=Error('Unavailable');e.noRetry=response.status<500;throw e}
    return data;
   }catch(e){if(!enabled||g!==generation||e.expired||e.noRetry||attempt)throw e}
   finally{clearTimeout(timer);controllers.delete(c)}
  }
 }
 function rotate(){session=null;hasPage=false;pageEventId=uuid();clearSession(storage)}
 async function ensure(g){
  if(!sessionActive(session,now())){rotate();session=newSession({now:now(),attribution,randomUUID:uuid});if(!persist())throw Error('Storage')}
  if(!session.capability){
   if(!session.startEventId)session.startEventId=uuid();
   const s=session,data=await post({action:'start',sessionId:s.id,eventId:s.startEventId,attribution:s.attribution},g);
   if(!validCapability(data.sessionCapability)||data.ok!==true)throw Error('Invalid capability');
   if(!enabled||g!==generation||session!==s)throw Error('Disabled');
   session.capability=data.sessionCapability;if(!persist())throw Error('Storage');lastHeartbeat=now();
  }
  return session;
 }
 async function event(event,interaction,g,eventId=uuid()){
  const s=await ensure(g);
  const body={action:'event',sessionId:s.id,sessionCapability:s.capability,eventId,event};if(interaction)body.interaction=interaction;
  await post(body,g);
 }
 async function run(item,g,rotated=false){
  try{
   await ensure(g);
   if(!hasPage){await event('pageview',null,g,pageEventId||(pageEventId=uuid()));hasPage=true;if(item.kind==='page')return}
   if(item.kind==='event')await event('interaction',item.action,g,item.id);
   else if(item.kind==='page'&&item.force)await event('pageview',null,g,item.id);
   else if(item.kind==='heartbeat'){await post({action:'heartbeat',sessionId:session.id,sessionCapability:session.capability},g);lastHeartbeat=now()}
  }catch(e){if(e.expired&&!rotated&&enabled&&g===generation){rotate();return run(item,g,true)}}
 }
 async function drain(){
  if(working)return;working=true;
  try{while(queue.length&&enabled){const item=queue.shift();if(!visible())continue;const g=generation;await run(item,g)}}finally{working=false;if(queue.length&&enabled)void drain()}
 }
 function enqueue(item){if(!active()||queue.length>=24)return;queue.push(item);void drain()}
 function setEnabled(value){
  if(!value){disable();return}
  if(enabled)return;enabled=true;generation++;session=loadSession(storage,now());pageEventId=uuid();lastUserActivity=0;lastHeartbeat=now();
  enqueue({kind:'page',id:uuid()});
 }
 function activity(){
  if(!active())return;const t=now();lastUserActivity=t;
  if(sessionActive(session,t)){session.lastActivity=t;if(t-lastWrite>=5000){lastWrite=t;persist()}}
  else enqueue({kind:'page',id:uuid()});
 }
 function heartbeat(){if(active()&&lastUserActivity&&now()-lastUserActivity<60000&&now()-lastHeartbeat>=60000){lastHeartbeat=now();enqueue({kind:'heartbeat'})}}
 function capture(action){if(interactionPayload(action)){activity();enqueue({kind:'event',action,id:uuid()})}}
 return Object.freeze({setEnabled,activity,heartbeat,capture,pageview:()=>enqueue({kind:'page',force:true,id:uuid()}),getContext:()=>registrationContext(session,now(),enabled),isEnabled:()=>enabled});
}
