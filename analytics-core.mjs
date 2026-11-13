// Small privacy-safe client primitives. No SDK, person profile, replay or DOM capture.
export const CAMPAIGN='danwhi_20261205';
export const SESSION_KEY='danwhi-analytics-session-v1';
export const CONSENT_KEY='danwhi-analytics-consent-v1';
export const SESSION_IDLE_MS=30*60*1000,SESSION_MAX_MS=24*60*60*1000;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const CAP=/^[A-Za-z0-9_-]{43}$/;
const ALLOWED={source:new Set(['direct','instagram','kakao','qr','other','not_set']),medium:new Set(['none','social','share','offline','other','not_set']),campaign:new Set([CAMPAIGN,'not_set']),content:new Set(['bio','story','chat','poster','other','not_set'])};
export const INTERACTIONS=new Set(['map_walk','map_surrounding','map_replay','directions_open','address_copy','setlist_open','setlist_expand_all','ticket_create','ticket_download','ticket_share','calendar_save','invitation_share','link_copy','rsvp_start']);
export function safeAttribution(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const clean={};for(const k of Object.keys(ALLOWED)){if(!ALLOWED[k].has(value[k]))return null;clean[k]=value[k]}return clean;
}
export function attributionFromEntry(href){
 const u=new URL(href);if(u.protocol!=='https:'||!['danwhi-live.vercel.app','danhwi-live.vercel.app'].includes(u.hostname)||u.username||u.password||u.pathname!=='/'||u.hash.startsWith('#rsvp='))throw Error('Untracked entry');
 const p=u.searchParams;if(![...p.keys()].some(k=>k.startsWith('utm_')))return{source:'direct',medium:'none',campaign:'not_set',content:'not_set'};
 const map={source:{instagram:'instagram',ig:'instagram',kakao:'kakao',qr:'qr'},medium:{social:'social',share:'share',offline:'offline'},content:{bio:'bio',link_in_bio:'bio',story:'story',chat:'chat',poster:'poster'}};
 const normalized=k=>{const vals=p.getAll('utm_'+k);return !vals.length?'not_set':vals.length===1?(Object.hasOwn(map[k],vals[0].toLowerCase())?map[k][vals[0].toLowerCase()]:'other'):'other'};
 return {source:normalized('source'),medium:normalized('medium'),campaign:p.getAll('utm_campaign').length===1&&p.get('utm_campaign')===CAMPAIGN?CAMPAIGN:'not_set',content:normalized('content')};
}
export function sessionActive(s,now){return !!s&&Number.isSafeInteger(s.createdAt)&&Number.isSafeInteger(s.lastActivity)&&s.lastActivity>=s.createdAt&&now>=s.lastActivity&&now-s.lastActivity<SESSION_IDLE_MS&&now-s.createdAt<SESSION_MAX_MS}
export function cleanSession(s,now){
 if(!s||!UUID.test(s.id||'')||!sessionActive(s,now))return null;
 const attribution=safeAttribution(s.attribution);if(!attribution)return null;
 const out={id:s.id,createdAt:s.createdAt,lastActivity:s.lastActivity,attribution};
 if(typeof s.capability==='string'&&CAP.test(s.capability))out.capability=s.capability;
 if(UUID.test(s.startEventId||''))out.startEventId=s.startEventId;
 return out;
}
export function loadSession(storage,now){try{const raw=storage.getItem(SESSION_KEY);return raw?cleanSession(JSON.parse(raw),now):null}catch{return null}}
export function saveSession(storage,s){try{const clean=cleanSession(s,s.lastActivity);if(!clean)throw Error();storage.setItem(SESSION_KEY,JSON.stringify(clean));return true}catch{return false}}
export function clearSession(storage){try{storage.removeItem(SESSION_KEY);return true}catch{return false}}
export function storageAvailable(storage){try{const k='danwhi-analytics-storage-check';storage.setItem(k,'1');storage.removeItem(k);return true}catch{return false}}
export function newSession({now,attribution,randomUUID}){const s={id:randomUUID(),createdAt:now,lastActivity:now,attribution:safeAttribution(attribution),startEventId:randomUUID()};if(!cleanSession(s,now))throw Error('Session unavailable');return s}
export function trackingAllowed({consented,gpc,dnt,management,storage}={}){return consented===true&&!gpc&&!dnt&&!management&&storage===true}
export function validCapability(v){return typeof v==='string'&&CAP.test(v)}
export function registrationContext(s,now,allowed){return allowed&&sessionActive(s,now)&&validCapability(s.capability)?{sessionId:s.id,sessionCapability:s.capability}:null}
export function interactionPayload(action){return INTERACTIONS.has(action)?{event:'interaction',interaction:action}:null}
