import {CONSENT_KEY,attributionFromEntry,storageAvailable,trackingAllowed} from './analytics-core.mjs';
import {createAnalyticsClient} from './analytics-client.mjs';
// This module deliberately never reads form values, names, management storage, or element text.
const $=id=>document.getElementById(id),allow=$('analytics-allow'),deny=$('analytics-deny'),status=$('analytics-status'),settings=$('analytics-settings');
let local,tab,storage=false,consented=false,choice=null,attribution=null,client;
const management=window.__DANWHI_ANALYTICS_MANAGEMENT_ENTRY__!==false;
const privacySignal=()=>navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||window.doNotTrack==='1';
try{local=window.localStorage;tab=window.sessionStorage;storage=storageAvailable(local)&&storageAvailable(tab)&&typeof window.crypto?.randomUUID==='function';choice=storage?local.getItem(CONSENT_KEY):null;consented=choice==='allow';if(!management)attribution=attributionFromEntry(window.location.href)}catch{}
const canTrack=()=>trackingAllowed({consented,gpc:privacySignal(),dnt:false,management,storage:storage&&!!attribution});
function render(){
 const reason=management?'등록 관리 링크로 들어온 방문은 통계를 수집하지 않아요.':privacySignal()?'브라우저의 추적 거부 설정에 따라 통계를 수집하지 않아요.':!storage||!attribution?'이 브라우저에서는 통계를 수집하지 않아요. 모든 기능은 그대로 이용할 수 있어요.':consented?'통계 수집을 허용했어요. 언제든 아래에서 중지할 수 있어요.':'통계를 수집하지 않고 있어요.';
 if(status)status.textContent=reason;
 if(allow)allow.disabled=management||privacySignal()||!storage||!attribution||consented;
 if(deny)deny.disabled=!storage||(!consented&&choice==='deny');
}
function failClosed(){storage=false;consented=false;client?.setEnabled(false);render()}
try{client=createAnalyticsClient({storage:tab,attribution,fetcher:(...args)=>fetch(...args),uuid:()=>crypto.randomUUID(),visible:()=>document.visibilityState==='visible',onUnavailable:failClosed})}catch{failClosed()}
function choose(value){
 try{if(!storage)return;choice=value?'allow':'deny';local.setItem(CONSENT_KEY,choice);consented=value;client?.setEnabled(canTrack());render();if(settings&&!value)settings.open=false}catch{failClosed()}
}
allow?.addEventListener('click',()=>choose(true));deny?.addEventListener('click',()=>choose(false));
Object.defineProperty(window,'DanwhiAnalytics',{value:Object.freeze({getContext:()=>canTrack()?client?.getContext()||null:null}),writable:false,configurable:false});
render();if(settings&&storage&&choice)settings.open=false;
client?.setEnabled(canTrack());
// Fixed selectors/actions only. Captures are button intents, not asserted successful downloads/shares.
const buttons={'walk-view-button':'map_walk','surrounding-view-button':'map_surrounding','map-replay':'map_replay','address-copy':'address_copy','ticket-download':'ticket_download','ticket-share':'ticket_share','share-button':'invitation_share','copy-button':'link_copy','playlist-play':'playlist_play'};
document.addEventListener('click',e=>{
 if(!e.isTrusted||!canTrack())return;
 const target=e.target instanceof Element?e.target.closest('button,a,summary'):null;if(!target||target.disabled)return;
 let action=buttons[target.id];
 if(!action&&target.matches('.venue-actions a'))action='directions_open';
 if(!action&&target.matches('.calendar-link'))action='calendar_save';
 if(!action&&target.matches('details.song > summary')&&!target.parentElement.open)action='setlist_open';
 if(!action&&target.id==='expand-all'&&target.getAttribute('aria-pressed')==='false')action='setlist_expand_all';
 if(action)client?.capture(action);
},true);
document.addEventListener('submit',e=>{if(!e.isTrusted||!canTrack())return;const action=e.target?.id==='ticket-form'?'ticket_create':e.target?.id==='rsvp-form'?'rsvp_start':null;if(action)client?.capture(action)},true);
// Activity is a timestamp only: no keys, pointer locations, scroll depth or input values.
let lastActivity=0;
const markActivity=e=>{if(e.isTrusted&&canTrack()&&Date.now()-lastActivity>5000){lastActivity=Date.now();client?.activity()}};
for(const name of ['pointerdown','keydown','scroll'])document.addEventListener(name,markActivity,{passive:true,capture:true});
setInterval(()=>{if(!canTrack()){client?.setEnabled(false);return}client?.heartbeat()},60000);
window.addEventListener('pageshow',e=>{if(e.persisted&&canTrack())client?.pageview()});
window.addEventListener('storage',e=>{if(e.key===CONSENT_KEY){try{choice=local.getItem(CONSENT_KEY);consented=choice==='allow';client?.setEnabled(canTrack());render()}catch{failClosed()}}});
