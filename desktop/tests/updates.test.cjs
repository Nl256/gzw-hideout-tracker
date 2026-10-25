const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {createUpdates,newer,allowedUpdateUrl}=require('../app/updates.cjs');
function setup(options={}){
 const fake=new EventEmitter();fake.checks=0;fake.downloads=0;fake.installs=[];
 fake.checkForUpdates=async()=>{fake.checks++;fake.emit('update-available',{version:'1.4.1'});};
 fake.downloadUpdate=async()=>{fake.downloads++;fake.emit('download-progress',{percent:42.9});fake.emit('update-downloaded',{version:'1.4.1'});};
 fake.quitAndInstall=(...args)=>fake.installs.push(args);
 const states=[],manager=createUpdates({updater:fake,currentVersion:'1.4.0',onState:s=>states.push(s),...options});
 return {fake,states,manager};
}
test('checking never downloads or installs without the two explicit player choices',async()=>{
 let saved=false;const {fake,manager}=setup({prepareInstall:async()=>{saved=true;}});
 assert.equal(fake.autoDownload,false);assert.equal(fake.autoInstallOnAppQuit,false);assert.equal(fake.allowDowngrade,false);
 await manager.check();assert.equal(manager.snapshot().status,'available');assert.equal(fake.downloads,0);
 await manager.install();assert.equal(fake.installs.length,0);
 await manager.download();assert.equal(manager.snapshot().status,'ready');assert.equal(fake.installs.length,0);
 await manager.install();assert.equal(saved,true);assert.deepEqual(fake.installs,[[true,true]]);
});
test('Later survives reopening and a manual check can show the prompt again',async()=>{
 let pref=null,clock=100000;const config={now:()=>clock,loadPreference:()=>pref,savePreference:v=>pref=v};
 const first=setup(config);await first.manager.check();first.manager.later();assert.equal(first.fake.downloads,0);
 const reopened=setup(config);await reopened.manager.check();assert.equal(reopened.manager.snapshot().deferred,true);
 await reopened.manager.check(true);assert.equal(reopened.manager.snapshot().deferred,false);
 clock+=25*60*60*1000;await reopened.manager.check();assert.equal(reopened.manager.snapshot().deferred,false);
});
test('a rejected or incomplete download never enables installation and can be retried',async()=>{
 const {fake,manager}=setup();await manager.check();
 fake.downloadUpdate=async()=>{throw Error('checksum mismatch');};await manager.download();
 assert.equal(manager.snapshot().status,'error');assert.equal(manager.snapshot().deferred,false);
 await manager.install();assert.equal(fake.installs.length,0);
 fake.emit('update-downloaded',{version:'1.4.1'});assert.equal(manager.snapshot().status,'error');
 await manager.check(true);assert.equal(manager.snapshot().status,'available');
});
test('a postponed ready update reappears after a day without downloading again',async()=>{
 let clock=100000;const {fake,manager}=setup({now:()=>clock});await manager.check();await manager.download();manager.later();
 await manager.check();assert.equal(manager.snapshot().deferred,true);clock+=25*60*60*1000;await manager.check();
 assert.equal(manager.snapshot().deferred,false);assert.equal(manager.snapshot().status,'ready');assert.equal(fake.downloads,1);
});
test('concurrent requests download once and flushing saved data completes before installation',async()=>{
 let downloadDone,flushDone;const {fake,manager}=setup({prepareInstall:()=>new Promise(resolve=>flushDone=resolve)});
 await manager.check();fake.downloadUpdate=()=>{fake.downloads++;return new Promise(resolve=>downloadDone=()=>{fake.emit('update-downloaded',{version:'1.4.1'});resolve();});};
 const a=manager.download(),b=manager.download();await Promise.resolve();assert.equal(fake.downloads,1);downloadDone();await Promise.all([a,b]);
 const installing=manager.install();await Promise.resolve();assert.equal(fake.installs.length,0);flushDone();await installing;assert.equal(fake.installs.length,1);
});
test('an active sign-in or save-flush failure keeps a downloaded update ready without quitting',async()=>{
 const {fake,manager}=setup({prepareInstall:async()=>{throw Error('signin active');}});await manager.check();await manager.download();await manager.install();
 assert.equal(fake.installs.length,0);assert.equal(manager.snapshot().status,'ready');assert.match(manager.snapshot().message,/Finish any sign-in/);
});
test('offline automatic checks stay quiet, manual failures are visible, and checks are throttled',async()=>{
 const {fake,manager}=setup();fake.checkForUpdates=async()=>{fake.checks++;throw Error('offline');};
 await manager.check();assert.equal(manager.snapshot().deferred,true);await manager.check();assert.equal(fake.checks,1);
 await manager.check(true);assert.equal(fake.checks,2);assert.equal(manager.snapshot().deferred,false);
});
test('older, prerelease and malformed versions cannot become installable updates',async()=>{
 for(const version of ['1.3.9','1.4.0','1.5.0-beta.1','https://evil.test/','1.4.1<script>']){
  const {fake,manager}=setup();fake.checkForUpdates=async()=>fake.emit('update-available',{version});await manager.check();await manager.download();assert.equal(fake.downloads,0);
 }
 assert.equal(newer('1.10.0','1.9.9'),true);
});
test('updater traffic stays separate and limited to this repository and GitHub asset hosts',()=>{
 for(const url of ['https://github.com/Nl256/gzw-hideout-tracker/releases.atom','https://github.com/Nl256/gzw-hideout-tracker/releases/download/v1.4.1/latest.yml','https://release-assets.githubusercontent.com/github-production-release-asset/file'])assert.equal(allowedUpdateUrl(url),true);
 for(const url of ['http://github.com/Nl256/gzw-hideout-tracker/releases','https://github.com/attacker/repo/releases','https://github.com.evil.test/Nl256/gzw-hideout-tracker/releases','file:///update.exe','https://user:pass@github.com/Nl256/gzw-hideout-tracker/releases','https://release-assets.githubusercontent.com:1234/file'])assert.equal(allowedUpdateUrl(url),false);
});
