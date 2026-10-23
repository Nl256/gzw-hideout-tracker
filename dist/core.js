(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HideoutCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const VERSION=1,MAX=999999;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const integer=(n,max=MAX)=>Number.isSafeInteger(Number(n))&&Number(n)>=0&&Number(n)<=max;
 function newProfile(id,name='Operator 01',faction='Crimson Shield',mode='PvE'){return {id,name,faction,mode,stash:{},cash:0,built:{},goals:{},wishlist:{},history:[]};}
 function newState(id){return {schemaVersion:VERSION,activeProfileId:id,theme:'dark',profiles:[newProfile(id)],updatedAt:new Date().toISOString()};}
 function tier(station,level){return station.levels.find(t=>t.level===level);}
 function plan(profile,catalog,selection=profile.goals){
  const totals={},uses={},gaps=[],steps=[];let money=0;
  for(const station of catalog.stations){const current=profile.built[station.id]||0,target=selection[station.id]||0;
   for(const t of station.levels.filter(t=>t.level>current&&t.level<=target)){
    const level=t.level;
    steps.push({stationId:station.id,level,tier:t});
    if(t.coverage==='unknown'||t.coverage==='partial')gaps.push({stationId:station.id,level,reason:'Incomplete requirements'});
    money+=Number(t.money)||0;
    for(const [id,n] of Object.entries(t.items||{})){totals[id]=(totals[id]||0)+n;(uses[id]??=[]).push({stationId:station.id,stationName:station.name,level,quantity:n});}
   }
  }
  if(selection===profile.goals){for(const [id,n]of Object.entries(profile.wishlist||{})){if(n>0){totals[id]=(totals[id]||0)+n;(uses[id]??=[]).push({stationId:null,stationName:'Personal reserve',level:null,quantity:n});}}}
  const missing={};let units=0,collected=0,total=0;
  for(const [id,n] of Object.entries(totals)){missing[id]=Math.max(0,n-(profile.stash[id]||0));units+=missing[id];total+=n;collected+=Math.min(n,profile.stash[id]||0);}
  return {totals,uses,missing,units,total,collected,money,moneyMissing:Math.max(0,money-profile.cash),gaps,steps};
 }
 function snapshot(p){const {history,...before}=p;return clone(before);}
 function remember(p,label){p.history.push({label,before:snapshot(p)});if(p.history.length>15)p.history.shift();}
 function undo(p){const entry=p.history.pop();if(!entry)return null;const history=p.history;Object.assign(p,clone(entry.before));p.history=history;return entry.label;}
 function build(profile,catalog,stationId,level,spend=false){
  const s=catalog.stations.find(s=>s.id===stationId);if(!s||!s.levels.some(t=>t.level===level))throw Error('Invalid station level.');
  if(level<=(profile.built[stationId]||0))throw Error('Choose a higher level to complete.');
  const cost=plan(profile,catalog,{[stationId]:level});
  if(spend&&(cost.gaps.length||cost.units||cost.moneyMissing))throw Error('The tracked stash does not cover every known requirement.');
  remember(profile,`Complete ${s.name} level ${level}`);
  if(spend){for(const [id,n]of Object.entries(cost.totals))profile.stash[id]=(profile.stash[id]||0)-n;profile.cash-=cost.money;}
  profile.built[stationId]=level;
  if((profile.goals[stationId]||0)<=level)delete profile.goals[stationId];
  return cost;
 }
 function validateImport(raw,catalog){
  if(!raw||raw.schemaVersion!==VERSION||!Array.isArray(raw.profiles)||raw.profiles.length<1||raw.profiles.length>20)throw Error('This is not a supported HIDEOUT backup.');
  const allowedItems=new Set(catalog.items.map(i=>i.id)),stations=new Map(catalog.stations.map(s=>[s.id,s]));
  const ids=new Set();
  const profiles=raw.profiles.map((p,i)=>{
   if(!p||typeof p.id!=='string'||!p.id||p.id.length>100||ids.has(p.id))throw Error('The backup has invalid or duplicate operator IDs.');ids.add(p.id);
   if(typeof p.name!=='string'||!p.name.trim()||p.name.length>60)throw Error('The backup has an invalid operator name.');
   const clean=newProfile(p.id,p.name.trim(),['Crimson Shield','Mithras','Lamang'].includes(p.faction)?p.faction:'Crimson Shield',['PvE','PvEvP'].includes(p.mode)?p.mode:'PvE');
   if(!integer(p.cash,999999999))throw Error('The backup has an invalid cash amount.');clean.cash=Number(p.cash);
   for(const key of ['stash','built','goals','wishlist']){
    const source=key==='wishlist'?(p[key]||{}):p[key];
    if(!source||typeof source!=='object'||Array.isArray(source))throw Error(`The backup has invalid ${key} data.`);
    for(const [id,n]of Object.entries(source)){
     if(id==='__proto__'||id==='constructor'||id==='prototype')throw Error('Invalid backup key.');
     if(key==='stash'||key==='wishlist'){if(!allowedItems.has(id)||id==='us-dollars')throw Error(`Unknown material in backup: ${id}`);if(!integer(n))throw Error('Invalid material quantity.');clean[key][id]=Number(n);}
     else{const s=stations.get(id);if(!s||!integer(n)||!(Number(n)===0||s.levels.some(t=>t.level===Number(n))))throw Error('Invalid station level.');clean[key][id]=Number(n);}
    }
   }
   for(const [id,n]of Object.entries(clean.goals))if(n<=(clean.built[id]||0))delete clean.goals[id];
   return clean;
  });
  return {schemaVersion:VERSION,activeProfileId:ids.has(raw.activeProfileId)?raw.activeProfileId:profiles[0].id,theme:raw.theme==='light'?'light':'dark',profiles,updatedAt:new Date().toISOString()};
 }
 return {VERSION,MAX,clone,integer,newProfile,newState,tier,plan,remember,undo,build,validateImport};
});
