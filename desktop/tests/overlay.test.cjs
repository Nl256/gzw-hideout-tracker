const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os'),{EventEmitter}=require('node:events');
const {createOverlay}=require('../app/overlay.cjs');
const core=require('../../dist/core.js'),model=require('../../dist/overlay-model.js'),catalog=require('../../dist/catalog.json');
test('floating window is sandboxed, read-only, scoped to its sender, and remembers safe bounds',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hideout-overlay-test-')),handlers=new Map(),windows=[],events=[];
 let primary=true;
 class Window extends EventEmitter{
  constructor(options){super();this.options=options;this.webContents=new EventEmitter();this.webContents.mainFrame={url:'hideout://app/overlay.html?floating=1'};this.webContents.setWindowOpenHandler=fn=>this.openHandler=fn;this.webContents.send=(...args)=>events.push(args);windows.push(this);}
  isDestroyed(){return !!this.destroyed;}isMinimized(){return false;}show(){}showInactive(){}focus(){}setAlwaysOnTop(value){this.pinned=value;}
  getNormalBounds(){return {x:99999,y:99999,width:420,height:650};}
  async loadURL(url){this.url=url;this.emit('ready-to-show');}
  close(){this.emit('close');this.destroyed=true;this.emit('closed');}
 }
 const controller=createOverlay({BrowserWindow:Window,ipcMain:{handle:(name,fn)=>handlers.set(name,fn)},screen:{getDisplayMatching:()=>({workArea:{x:0,y:0,width:1920,height:1080}})},clipboard:{writeText:()=>{}},overlaySession:{isolated:true},uiRoot:path.resolve(__dirname,'../../dist'),dataRoot:root,checkMain:()=>{if(!primary)throw Error('Untrusted request');},notify:()=>{}});
 t.after(async()=>{await controller.dispose();fs.rmSync(root,{recursive:true,force:true});});
 const invoke=(name,value,event={})=>handlers.get('hideout:'+name)(event,value);
 const profile=core.newProfile('secret-user','Secret name');profile.wishlist={wood:6};profile.stash={wood:2};
 invoke('overlay-publish',model.snapshot(profile,catalog,core));
 await invoke('overlay-open');const first=windows[0];
 assert.equal(first.options.webPreferences.nodeIntegration,false);assert.equal(first.options.webPreferences.sandbox,true);assert.equal(first.options.webPreferences.contextIsolation,true);assert.equal(first.options.alwaysOnTop,true);assert.equal(first.options.frame,false);assert.equal(first.options.webPreferences.session.isolated,true);
 assert.deepEqual(first.openHandler({url:'https://evil.example'}),{action:'deny'});
 const sender={sender:first.webContents,senderFrame:first.webContents.mainFrame};
 const value=invoke('float-state',undefined,sender);assert.equal(value.connected,true);assert.equal(value.snapshot.items[0].need,4);assert.doesNotMatch(JSON.stringify(value),/secret-user|Secret name/);
 assert.throws(()=>invoke('float-state',undefined,{}),/Untrusted/);
 assert.throws(()=>invoke('float-state',undefined,{sender:first.webContents,senderFrame:{url:'hideout://app/overlay.html'}}),/Untrusted/);
 assert.throws(()=>invoke('float-pin','yes',sender),/Invalid/);
 assert.equal(invoke('float-pin',false,sender),false);assert.equal(first.pinned,false);
 profile.stash.wood=5;invoke('overlay-publish',model.snapshot(profile,catalog,core));assert.equal(events.at(-1)[1].snapshot.items[0].need,1);
 invoke('float-close',undefined,sender);await invoke('overlay-open');assert.equal(windows[1].options.alwaysOnTop,false);assert.deepEqual({x:windows[1].options.x,y:windows[1].options.y},{x:1500,y:430});
 primary=false;assert.throws(()=>invoke('overlay-publish',{}),/Untrusted/);assert.throws(()=>invoke('overlay-copy'),/Untrusted/);
 assert.equal(controller.status().enabled,false);
});
