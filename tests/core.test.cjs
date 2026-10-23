const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../dist/core.js');
const D=require('../dist/catalog.json');
test('the complete community snapshot has referential integrity',()=>{
 assert.equal(D.items.length,73);assert.equal(D.stations.length,15);assert.equal(D.stations.reduce((n,s)=>n+s.levels.length,0),36);
 const ids=new Set(D.items.map(i=>i.id));assert.equal(ids.size,D.items.length);
 for(const s of D.stations)for(const t of s.levels){assert(t.previousLevel===0||s.levels.some(previous=>previous.level===t.previousLevel));for(const[id,n]of Object.entries(t.items)){assert(ids.has(id),id);assert(Number.isInteger(n)&&n>0);}assert(t.sourceUrl.startsWith('https://gzwhideout.com/'));}
});
test('shared stash is deducted once across all goals',()=>{
 const p=C.newProfile('one');p.goals={'laboratory-heat-source':1,'workshop-micro-electronics':1,'workshop-storage-equipment':1};p.stash.wood=1;
 const plan=C.plan(p,D);assert.equal(plan.totals.wood,3);assert.equal(plan.missing.wood,2);assert.equal(plan.uses.wood.length,3);
});
test('later tiers include unbuilt predecessors, including the explicit sparse ventilation chain',()=>{
 const p=C.newProfile('one');p.goals={'laboratory-heat-source':3};assert.equal(C.plan(p,D).totals.steel,17);
 p.built['laboratory-heat-source']=1;assert.equal(C.plan(p,D).totals.steel,14);
 p.goals={'laboratory-ventilation-system':3};const plan=C.plan(p,D);assert.deepEqual(plan.steps.map(s=>s.level),[1,3]);assert.equal(plan.gaps.length,0);assert.equal(plan.totals['pc-fan'],5);
});
test('all listed upgrades aggregate to the independently checked source totals',()=>{
 const p=C.newProfile('one');p.goals=Object.fromEntries(D.stations.map(s=>[s.id,Math.max(...s.levels.map(t=>t.level))]));const plan=C.plan(p,D);
 assert.equal(plan.money,340000);assert.equal(plan.totals.steel,92);assert.equal(plan.totals['electrical-parts'],38);assert.equal(plan.totals['circuit-board'],8);assert.equal(Object.keys(plan.totals).length,46);
});
test('completion deducts resources once and undo restores all progress',()=>{
 const p=C.newProfile('one');p.goals={'laboratory-heat-source':1,'workshop-storage-equipment':1};p.stash={steel:3,'construction-material':2,wood:2};
 C.build(p,D,'laboratory-heat-source',1,true);assert.equal(p.stash.wood,1);assert.equal(p.stash.steel,0);assert.equal(p.built['laboratory-heat-source'],1);assert(!p.goals['laboratory-heat-source']);assert.equal(C.plan(p,D).missing.wood,0);
 C.undo(p);assert.equal(p.stash.wood,2);assert(!p.built['laboratory-heat-source']);assert.equal(p.goals['laboratory-heat-source'],1);
});
test('cannot spend missing stock; manual sync leaves stock alone',()=>{
 const p=C.newProfile('one');assert.throws(()=>C.build(p,D,'laboratory-heat-source',1,true));assert.equal(p.history.length,0);
 C.build(p,D,'laboratory-heat-source',1,false);assert.deepEqual(p.stash,{});assert.equal(p.built['laboratory-heat-source'],1);
});
test('personal reserves remain separate from construction consumption',()=>{
 const p=C.newProfile('one');p.goals={'laboratory-heat-source':1};p.wishlist={wood:5};p.stash={wood:6,steel:3,'construction-material':2};assert.equal(C.plan(p,D).totals.wood,6);
 C.build(p,D,'laboratory-heat-source',1,true);assert.equal(p.stash.wood,5);assert.equal(C.plan(p,D).totals.wood,5);
});
test('backup roundtrip preserves separate operators and rejects invalid quantities or imaginary tiers',()=>{
 const state=C.newState('one');state.profiles.push(C.newProfile('two'));state.profiles[0].stash.wood=9;state.profiles[1].stash.wood=2;state.profiles[0].wishlist.wood=4;
 const restored=C.validateImport(JSON.parse(JSON.stringify(state)),D);assert.equal(restored.profiles[0].stash.wood,9);assert.equal(restored.profiles[1].stash.wood,2);assert.equal(restored.profiles[0].wishlist.wood,4);
 const bad=C.clone(state);bad.profiles[0].stash.wood=-1;assert.throws(()=>C.validateImport(bad,D));bad.profiles[0].stash.wood=0;bad.profiles[0].built['laboratory-ventilation-system']=2;assert.throws(()=>C.validateImport(bad,D));
 const unsafe=JSON.parse(JSON.stringify(state));unsafe.profiles[0].stash=JSON.parse('{"__proto__": 1}');assert.throws(()=>C.validateImport(unsafe,D));
});
