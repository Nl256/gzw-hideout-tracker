'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomBytes}=require('node:crypto');
const {createOverlayServer}=require('./overlay-server.cjs');
function createOverlay({BrowserWindow,ipcMain,screen,clipboard,overlaySession,uiRoot,dataRoot,checkMain,notify,show=true}){
 const model=require(path.join(uiRoot,'overlay-model.js'));
 const file=path.join(dataRoot,'overlay-preferences.json');
 let prefs={enabled:false,token:randomBytes(32).toString('hex'),alwaysOnTop:true},floating=null,data=null,received=0;
 try{const saved=JSON.parse(fs.readFileSync(file,'utf8'));if(/^[a-f0-9]{64}$/.test(saved.token))prefs={...prefs,token:saved.token,enabled:saved.enabled===true,alwaysOnTop:saved.alwaysOnTop!==false,bounds:saved.bounds};}catch{}
 const save=()=>{fs.mkdirSync(dataRoot,{recursive:true});fs.writeFileSync(file,JSON.stringify(prefs));};
 const snapshot=()=>({connected:!!data&&Date.now()-received<20000,updatedAt:received,snapshot:data});
 const server=createOverlayServer({uiRoot,token:prefs.token,getSnapshot:snapshot});
 const status=()=>({...server.status(),floating:!!floating&&!floating.isDestroyed(),alwaysOnTop:prefs.alwaysOnTop});
 const changed=()=>notify(status());
 const checkFloat=event=>{if(event.sender!==floating?.webContents||event.senderFrame!==floating.webContents.mainFrame||!event.senderFrame.url.startsWith('hideout://app/overlay.html'))throw Error('Untrusted overlay request');};
 const bounds=()=>{
  const saved=prefs.bounds;
  if(!saved||!['x','y','width','height'].every(key=>Number.isInteger(saved[key]))||saved.width<300||saved.width>1600||saved.height<240||saved.height>2160)return {width:390,height:620};
  const area=screen.getDisplayMatching(saved).workArea;
  const width=Math.min(saved.width,area.width),height=Math.min(saved.height,area.height);
  return {width,height,x:Math.max(area.x,Math.min(saved.x,area.x+area.width-width)),y:Math.max(area.y,Math.min(saved.y,area.y+area.height-height))};
 };
 async function open(){
  if(floating&&!floating.isDestroyed()){if(floating.isMinimized())floating.restore();floating.show();floating.focus();return status();}
  floating=new BrowserWindow({...bounds(),minWidth:300,minHeight:240,maxWidth:1600,show:false,title:'HIDEOUT — Tracked items',frame:false,alwaysOnTop:prefs.alwaysOnTop,backgroundColor:'#11170f',autoHideMenuBar:true,webPreferences:{session:overlaySession,preload:path.join(__dirname,'overlay-preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,backgroundThrottling:false,devTools:false}});
  floating.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  floating.webContents.on('will-navigate',event=>event.preventDefault());
  floating.webContents.on('will-attach-webview',event=>event.preventDefault());
  floating.once('ready-to-show',()=>{if(show)floating?.showInactive();});
  floating.on('close',()=>{try{prefs.bounds=floating.getNormalBounds();save();}catch{}});
  floating.on('closed',()=>{floating=null;changed();});
  await floating.loadURL('hideout://app/overlay.html?floating=1');changed();return status();
 }
 const mainHandlers={
  'publish':value=>{data=model.sanitize(value);received=Date.now();if(floating&&!floating.isDestroyed())floating.webContents.send('hideout:overlay-snapshot',snapshot());return true;},
  'state':status,
  'open':open,
  'enabled':async enabled=>{if(typeof enabled!=='boolean')throw Error('Invalid overlay option');if(enabled)await server.start();else await server.stop();prefs.enabled=enabled;try{save();}catch{prefs.enabled=false;await server.stop();changed();throw Error('Could not save the OBS connection settings.');}changed();return status();},
  'copy':()=>{const value=status();if(!value.enabled)throw Error('Enable the OBS overlay first.');clipboard.writeText(value.url);return true;}
 };
 for(const [name,handler]of Object.entries(mainHandlers))ipcMain.handle('hideout:overlay-'+name,(event,value)=>{checkMain(event);return handler(value);});
 ipcMain.handle('hideout:float-state',event=>{checkFloat(event);return {...snapshot(),alwaysOnTop:prefs.alwaysOnTop};});
 ipcMain.handle('hideout:float-pin',(event,value)=>{checkFloat(event);if(typeof value!=='boolean')throw Error('Invalid window option');prefs.alwaysOnTop=value;floating.setAlwaysOnTop(value);save();changed();return value;});
 ipcMain.handle('hideout:float-close',event=>{checkFloat(event);floating.close();});
 async function restore(){if(prefs.enabled){try{await server.start();}catch{prefs.enabled=false;try{save();}catch{}}}changed();}
 async function dispose(){if(floating&&!floating.isDestroyed())floating.close();await server.stop();}
 return {restore,dispose,status};
}
module.exports={createOverlay};
