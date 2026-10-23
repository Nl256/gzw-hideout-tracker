(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports){module.exports=api;return;}
 root.HideoutCatalogue=api;
 root.HideoutBundledIcons=new Set(root.HIDEOUT_DATA.items.map(i=>i.id));
 const KEY='gzw-hideout-catalogue:v1',BASE='https://nl256.github.io/gzw-hideout-tracker/';
 let cached=null,pending=null,running=null;
 try{cached=JSON.parse(localStorage.getItem(KEY));if(cached){api.validate(cached.data);root.HIDEOUT_DATA=api.compatible(root.HIDEOUT_DATA,cached.data);}}catch{cached=null;}
 const editing=()=>document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName);
 function applyPending(){
  if(!pending||!root.HideoutApp||editing())return;
  const next=api.compatible(root.HIDEOUT_DATA,pending.data);
  root.HideoutApp.setCatalogue(next);root.HIDEOUT_DATA=next;cached={...pending,data:next};pending=null;
  try{localStorage.setItem(KEY,JSON.stringify(cached));}catch{}
  root.HideoutApp.toast('Catalogue updated automatically. Your progress is unchanged.');
 }
 async function refresh(){
  if(running)return running;
  running=(async()=>{
   const response=await fetch(BASE+'catalog-manifest.json',{cache:'no-store',signal:AbortSignal.timeout(5000)});
   if(!response.ok)throw Error('Catalogue unavailable');
   const manifest=await response.json();
   if(manifest.schemaVersion!==1||! /^[a-f0-9]{64}$/.test(manifest.revision)||!Number.isFinite(Date.parse(manifest.publishedAt)))throw Error('Invalid catalogue manifest');
   if(cached?.revision===manifest.revision||pending?.revision===manifest.revision)return;
   if(cached&&Date.parse(manifest.publishedAt)<Date.parse(cached.publishedAt))return;
   const res=await fetch(BASE+'catalog.json?v='+manifest.revision,{cache:'no-store',signal:AbortSignal.timeout(5000)});
   if(!res.ok||Number(res.headers.get('content-length'))>2000000)throw Error('Catalogue unavailable');
   const raw=await res.text();if(raw.length>2000000)throw Error('Catalogue too large');
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))),b=>b.toString(16).padStart(2,'0')).join('');
   if(hash!==manifest.revision)throw Error('Catalogue download was incomplete');
   const data=api.validate(JSON.parse(raw));
   if(JSON.stringify(data)===JSON.stringify(root.HIDEOUT_DATA)){cached={...manifest,data};try{localStorage.setItem(KEY,JSON.stringify(cached));}catch{}return;}
   pending={...manifest,data};applyPending();
  })().catch(()=>{}).finally(()=>{running=null;});
  return running;
 }
 root.HideoutCatalogueReady=new Promise(resolve=>document.addEventListener('DOMContentLoaded',()=>refresh().finally(resolve),{once:true}));
 setInterval(refresh,300000);setInterval(applyPending,1000);
 window.addEventListener('online',refresh);window.addEventListener('focus',refresh);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const fail=()=>{throw Error('Invalid catalogue');};
 const text=(v,max=2000)=>typeof v==='string'&&v.length<=max;
 const id=v=>text(v,100)&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)&&!['constructor','prototype'].includes(v);
 const number=(v,max=999999)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
 const url=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
 function validate(d){
  if(!d||d.schemaVersion!==1||!text(d.checkedOn,30)||!text(d.gameVersion,100)||!Array.isArray(d.items)||!d.items.length||d.items.length>2000||!Array.isArray(d.stations)||!d.stations.length||d.stations.length>200||!Array.isArray(d.conflicts)||!Array.isArray(d.sources))fail();
  const items=new Set(),stations=new Map();
  for(const i of d.items){if(!id(i.id)||items.has(i.id)||!text(i.name,150)||!text(i.category,100)||!url(i.sourceUrl))fail();items.add(i.id);}
  if(!items.has('us-dollars'))fail();
  for(const s of d.stations){
   if(!id(s.id)||stations.has(s.id)||!text(s.name,150)||!text(s.room,100)||!Array.isArray(s.levels)||!s.levels.length||s.levels.length>100)fail();
   const levels=new Set();let last=0;
   for(const t of s.levels){
    if(!number(t.level,100)||t.level<=last||!number(t.previousLevel,100)||t.previousLevel>=t.level||!text(t.name,150)||!text(t.provides)||!text(t.coverage,100)||!url(t.sourceUrl)||!number(t.money,999999999)||!t.items||typeof t.items!=='object'||Array.isArray(t.items)||!Array.isArray(t.requirements))fail();
    for(const [key,n]of Object.entries(t.items))if(!items.has(key)||key==='us-dollars'||!number(n)||n===0)fail();
    for(const q of t.requirements)if(!text(q.name,150)||!number(q.amount)||!text(q.unit,100))fail();
    levels.add(t.level);last=t.level;
   }
   stations.set(s.id,levels);
  }
  for(const c of d.conflicts)if(!stations.get(c.stationId)?.has(c.level)||!text(c.note)||!url(c.sourceUrl)||!url(c.alternateSourceUrl))fail();
  for(const s of d.sources)if(!text(s.name,200)||!text(s.scope)||!url(s.url))fail();
  return d;
 }
 function compatible(old,next){
  validate(next);const merged=JSON.parse(JSON.stringify(next));
  // Retain retired identifiers so saved stash, goals and completed tiers remain readable.
  for(const item of old.items)if(!merged.items.some(i=>i.id===item.id))merged.items.push({...item,legacy:true});
  for(const station of old.stations){
   const found=merged.stations.find(s=>s.id===station.id);
   if(!found)merged.stations.push({...station,legacy:true});
   else{for(const tier of station.levels)if(!found.levels.some(t=>t.level===tier.level))found.levels.push({...tier,legacy:true});found.levels.sort((a,b)=>a.level-b.level);}
  }
  return validate(merged);
 }
 return {validate,compatible};
});
