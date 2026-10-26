(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HideoutOverlayModel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const defaults={rows:6,opacity:92,scale:100,onlyMissing:true,showCash:true,rotate:true};
 const bounded=(value,min,max,fallback)=>Number.isInteger(value)&&value>=min&&value<=max?value:fallback;
 function settings(value={}){return {rows:bounded(value.rows,3,12,6),opacity:bounded(value.opacity,0,100,92),scale:bounded(value.scale,80,140,100),onlyMissing:value.onlyMissing!==false,showCash:value.showCash!==false,rotate:value.rotate!==false};}
 function snapshot(profile,catalog,core,options){
  const plan=core.plan(profile,catalog),clean=settings(options);
  const items=catalog.items.filter(item=>item.id!=='us-dollars'&&(plan.totals[item.id]||0)>0).map(item=>({id:item.id,name:item.name,have:profile.stash[item.id]||0,required:plan.totals[item.id],need:plan.missing[item.id]||0}));
  items.sort((a,b)=>b.need-a.need||a.name.localeCompare(b.name));
  return {schemaVersion:1,items,cash:{have:profile.cash||0,required:plan.money,need:plan.moneyMissing},units:plan.units,total:plan.total,collected:plan.collected,goals:Object.keys(profile.goals).length,incomplete:plan.gaps.length>0,settings:clean};
 }
 // Keep the stream payload read-only and intentionally small. No names, account IDs,
 // auth tokens, save histories, or other operators cross this boundary.
 function sanitize(value){
  if(!value||value.schemaVersion!==1||!Array.isArray(value.items)||value.items.length>500)throw Error('Invalid overlay snapshot.');
  const number=value=>{if(!Number.isSafeInteger(value)||value<0||value>999999999999)throw Error('Invalid overlay quantity.');return value;};
  const ids=new Set();
  const items=value.items.map(item=>{
   if(!item||typeof item.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(item.id)||ids.has(item.id)||typeof item.name!=='string'||!item.name.trim()||item.name.length>100)throw Error('Invalid overlay item.');
   ids.add(item.id);const have=number(item.have),required=number(item.required),need=number(item.need);
   if(need!==Math.max(0,required-have))throw Error('Invalid overlay total.');
   return {id:item.id,name:item.name,have,required,need};
  });
  const cash={have:number(value.cash?.have),required:number(value.cash?.required),need:number(value.cash?.need)};
  if(cash.need!==Math.max(0,cash.required-cash.have))throw Error('Invalid overlay cash.');
  const total=items.reduce((sum,item)=>sum+item.required,0),units=items.reduce((sum,item)=>sum+item.need,0);
  return {schemaVersion:1,items,cash,total,units,collected:total-units,goals:bounded(value.goals,0,500,0),incomplete:value.incomplete===true,settings:settings(value.settings)};
 }
 return {defaults,settings,snapshot,sanitize};
});
