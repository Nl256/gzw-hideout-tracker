// This entry point is packaged only by scripts/test-installed-update.cjs.
// It is excluded from the public application's app/**/* file list.
const {app,BrowserWindow,protocol,session}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const root=require('../package.json').updateTestRoot;
if(!root||!path.isAbsolute(root)){app.exit(2);return;}
app.setPath('userData',path.join(root,'user-data'));
app.setPath('sessionData',path.join(root,'user-data','browser-data'));
const fail=error=>{fs.writeFileSync(path.join(root,'failed.txt'),String(error.stack||error));app.exit(1);};
process.on('uncaughtException',fail);process.on('unhandledRejection',fail);
protocol.registerSchemesAsPrivileged([{scheme:'hideout',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
app.whenReady().then(async()=>{
 protocol.handle('hideout',()=>new Response('<!doctype html><title>Isolated updater test</title><p>Testing an internal update.</p>'));
 const window=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
 await window.loadURL('hideout://app/index.html');
 if(app.getVersion()==='1.0.1'){
  const saved=await window.webContents.executeJavaScript('JSON.parse(localStorage.getItem("update-test-progress"))');
  if(saved?.guestWood!==7||saved?.accountDraft!==11)throw Error('Saved progress did not survive installation.');
  fs.writeFileSync(path.join(root,'result.json'),JSON.stringify({version:app.getVersion(),saved,installed:true,restarted:true}));
  app.quit();return;
 }
 await window.webContents.executeJavaScript('localStorage.setItem("update-test-progress",JSON.stringify({guestWood:7,accountDraft:11}))');
 const {autoUpdater}=require('electron-updater');
 autoUpdater.disableDifferentialDownload=true;
 autoUpdater.installDirectory=path.dirname(process.execPath);
 autoUpdater.logger={info:()=>{},warn:()=>{},error:e=>fs.appendFileSync(path.join(root,'updater.log'),String(e)+'\n')};
 const {createUpdates}=require('../app/updates.cjs');
 const manager=createUpdates({updater:autoUpdater,currentVersion:app.getVersion(),prepareInstall:async()=>{await session.defaultSession.flushStorageData();await session.defaultSession.cookies.flushStore();},onState:state=>{
  fs.appendFileSync(path.join(root,'states.jsonl'),JSON.stringify(state)+'\n');
  if(state.status==='available')setImmediate(()=>manager.download());
  if(state.status==='ready')setImmediate(()=>manager.install());
  if(state.status==='error')fail(Error(state.message));
 }});
 await manager.check(true);
}).catch(fail);
