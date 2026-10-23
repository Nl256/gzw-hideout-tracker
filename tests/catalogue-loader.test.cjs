const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{webcrypto,createHash}=require('node:crypto');
const D=require('../dist/catalog.json'),source=fs.readFileSync(require.resolve('../dist/catalog-update.js'),'utf8');
async function load({remote=D,cache=null,offline=false,badHash=false,editing=false}={}){
 const events={},timers=[],store=new Map(),applied=[];if(cache)store.set('gzw-hideout-catalogue:v1',JSON.stringify(cache));
 const raw=JSON.stringify(remote),revision=badHash?'0'.repeat(64):createHash('sha256').update(raw).digest('hex');
 const sandbox={HIDEOUT_DATA:JSON.parse(JSON.stringify(D)),Set,URL,TextEncoder,AbortSignal,crypto:webcrypto,
  HideoutApp:{setCatalogue:d=>applied.push(d),toast:()=>{}},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  document:{activeElement:{tagName:editing?'INPUT':'BODY'},querySelector:()=>null,addEventListener:(name,fn)=>events[name]=fn},
  setInterval:(fn,ms)=>timers.push({fn,ms}),addEventListener:()=>{},
  fetch:async url=>{if(offline)throw Error('offline');return url.includes('manifest')?{ok:true,json:async()=>({schemaVersion:1,revision,publishedAt:'2026-10-23T12:00:00Z'})}:{ok:true,headers:new Headers(),text:async()=>raw};}
 };sandbox.window=sandbox;vm.runInNewContext(source,sandbox);events.DOMContentLoaded();await sandbox.HideoutCatalogueReady;
 return {sandbox,store,applied,timers};
}
test('startup automatically downloads verified data and caches it without a click',async()=>{
 const remote=JSON.parse(JSON.stringify(D));remote.stations[0].levels[0].items.wood=9;
 const x=await load({remote});assert.equal(x.applied.length,1);assert.equal(x.applied[0].stations[0].levels[0].items.wood,9);assert.ok(x.store.has('gzw-hideout-catalogue:v1'));assert.ok(x.timers.some(t=>t.ms===300000));
});
test('catalogue updates wait for active input to finish and then apply automatically',async()=>{
 const remote=JSON.parse(JSON.stringify(D));remote.stations[0].levels[0].items.wood=9;
 const x=await load({remote,editing:true});assert.equal(x.applied.length,0);x.sandbox.document.activeElement.tagName='BODY';x.timers.find(t=>t.ms===1000).fn();assert.equal(x.applied.length,1);
});
test('partial downloads are ignored and an offline launch uses the cached catalogue',async()=>{
 const remote=JSON.parse(JSON.stringify(D));remote.stations[0].levels[0].items.wood=9;
 const bad=await load({remote,badHash:true});assert.equal(bad.applied.length,0);assert.equal(bad.store.size,0);
 const cache={data:remote,revision:'1'.repeat(64),publishedAt:'2026-10-23T11:00:00Z'};
 const offline=await load({cache,offline:true});assert.equal(offline.sandbox.HIDEOUT_DATA.stations[0].levels[0].items.wood,9);assert.equal(offline.applied.length,0);
});
