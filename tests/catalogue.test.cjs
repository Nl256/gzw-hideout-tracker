const test=require('node:test'),assert=require('node:assert/strict');
const {validate,compatible}=require('../dist/catalog-update.js');
const D=require('../dist/catalog.json'),C=require('../dist/core.js');
const clone=v=>JSON.parse(JSON.stringify(v));
test('a published recipe correction changes shopping totals without changing progress',()=>{
 const next=clone(D),state=C.newState('one');state.profiles[0].goals['laboratory-heat-source']=1;state.profiles[0].stash.wood=2;
 next.stations[0].levels[0].items.wood=10;
 const updated=compatible(D,next);assert.equal(C.plan(state.profiles[0],updated).missing.wood,8);assert.equal(C.validateImport(state,updated).profiles[0].stash.wood,2);
});
test('removed catalogue IDs and tiers remain readable in existing backups',()=>{
 const next=clone(D),state=C.newState('one');state.profiles[0].built['laboratory-heat-source']=3;state.profiles[0].stash.wood=7;
 next.stations[0].levels.pop();next.items=next.items.filter(i=>i.id!=='wood');
 next.conflicts=next.conflicts.filter(c=>next.stations.find(s=>s.id===c.stationId)?.levels.some(t=>t.level===c.level));
 for(const s of next.stations)for(const t of s.levels)delete t.items.wood;
 const merged=compatible(D,next);assert.equal(C.validateImport(state,merged).profiles[0].built['laboratory-heat-source'],3);assert.equal(merged.items.find(i=>i.id==='wood').legacy,true);
});
test('invalid updates cannot introduce executable links, unsafe IDs or broken recipes',()=>{
 for(const mutate of [d=>d.items[0].sourceUrl='javascript:alert(1)',d=>d.items[0].id='../file',d=>d.stations[0].levels[0].items.wood=-1,d=>d.stations[0].levels[0].items['non-existent']=3,d=>d.stations[0].levels.push(d.stations[0].levels[0])]){const next=clone(D);mutate(next);assert.throws(()=>validate(next));}
 assert.equal(validate(D),D);
});
