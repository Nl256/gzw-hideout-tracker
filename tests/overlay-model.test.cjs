const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../dist/core.js'),model=require('../dist/overlay-model.js');
const catalog={items:[{id:'wood',name:'Wood'},{id:'wire',name:'Wire'}],stations:[{id:'a',levels:[{level:1,items:{wood:6},money:100}]},{id:'b',levels:[{level:1,items:{wood:4,wire:2},money:50}]}]};
function profile(){const value=core.newProfile('private-id','Private operator');value.goals={a:1,b:1};value.stash={wood:7};value.wishlist={wood:3};value.cash=25;value.history=[{private:'history'}];return value;}
test('overlay combines goals and reserves, deducts shared stash once, and exposes no save identity',()=>{
 const result=model.sanitize(model.snapshot(profile(),catalog,core));
 assert.deepEqual(result.items,[{id:'wood',name:'Wood',have:7,required:13,need:6},{id:'wire',name:'Wire',have:0,required:2,need:2}]);
 assert.deepEqual(result.cash,{have:25,required:150,need:125});
 assert.equal(result.units,8);assert.equal(result.total,15);assert.equal(result.collected,7);
 assert.doesNotMatch(JSON.stringify(result),/private-id|Private operator|history|faction|mode/);
});
test('a new profile or completed goal replaces the old stream list rather than mixing progress',()=>{
 const first=profile();core.build(first,catalog,'a',1,false);core.build(first,catalog,'b',1,false);
 const completed=model.snapshot(first,catalog,core);assert.deepEqual(completed.items,[{id:'wood',name:'Wood',have:7,required:3,need:0}]);assert.equal(completed.goals,0);
 const other=core.newProfile('other');other.wishlist={wire:4};
 assert.deepEqual(model.snapshot(other,catalog,core).items,[{id:'wire',name:'Wire',have:0,required:4,need:4}]);
});
test('stream boundary strips extra fields and rejects dangerous paths and inconsistent quantities',()=>{
 const value=model.snapshot(profile(),catalog,core);value.token='secret';value.items[0].url='https://evil.example';
 const result=model.sanitize(value);assert.equal(result.token,undefined);assert.equal(result.items[0].url,undefined);
 for(const id of ['../secret','wood.svg','<img>','x/'.repeat(9)])assert.throws(()=>model.sanitize({...value,items:[{...value.items[0],id}]}));
 assert.throws(()=>model.sanitize({...value,items:[{...value.items[0],need:999}]}));
 assert.throws(()=>model.sanitize({...value,cash:{have:0,required:100,need:0}}));
 assert.throws(()=>model.sanitize({...value,items:[value.items[0],value.items[0]]}));
});
test('appearance preferences have safe limits and remain separate from save data',()=>{
 assert.deepEqual(model.settings({rows:1000,scale:NaN,opacity:-1}),model.defaults);
 assert.deepEqual(model.settings({rows:12,scale:140,opacity:0,onlyMissing:false,showCash:false,rotate:false}),{rows:12,scale:140,opacity:0,onlyMissing:false,showCash:false,rotate:false});
});
