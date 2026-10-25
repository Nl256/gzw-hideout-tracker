const {app,BrowserWindow,Menu,protocol,shell,session,dialog,ipcMain}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const qa=process.argv.includes('--smoke-test');
const qaDirArg=process.argv.find(a=>a.startsWith('--qa-dir='));
const qaDir=qaDirArg?path.resolve(qaDirArg.slice(9)):null;
const uiRoot=path.join(__dirname,'ui');
const dataRoot=qa&&qaDir?path.join(qaDir,'user-data'):path.join(app.getPath('appData'),'GZW Hideout Tracker');
app.setPath('userData',dataRoot);
app.setPath('sessionData',path.join(dataRoot,'browser-data'));
app.setName('GZW Hideout Tracker');
protocol.registerSchemesAsPrivileged([{scheme:'hideout',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
let mainWindow;
let updates;
const {createLogin,validAuthorize,ORIGIN}=require('./oauth.cjs');
const login=createLogin({onResult:result=>{if(mainWindow&&!mainWindow.isDestroyed()){mainWindow.webContents.send('hideout:signin-result',result);mainWindow.show();mainWindow.focus();}}});
function checkSender(event){if(event.sender!==mainWindow?.webContents||event.senderFrame!==mainWindow.webContents.mainFrame||!event.senderFrame.url.startsWith('hideout://app/'))throw Error('Untrusted request');}
ipcMain.handle('hideout:prepare-signin',event=>{checkSender(event);return login.prepare();});
ipcMain.handle('hideout:open-signin',async(event,url)=>{checkSender(event);if(!login.isActive()||!validAuthorize(url))throw Error('Invalid sign-in request');await shell.openExternal(url);});
ipcMain.handle('hideout:cancel-signin',event=>{checkSender(event);login.close();});
for(const [channel,action]of [['state','snapshot'],['check','check'],['download','download'],['install','install'],['later','later']]){
 ipcMain.handle('hideout:update-'+channel,event=>{checkSender(event);return updates?updates[action](action==='check'):({status:'current',currentVersion:app.getVersion(),message:'Updates are available in the installed Windows app.'});});
}
app.on('before-quit',()=>login.close());

function external(url){try{const parsed=new URL(url);if(parsed.protocol==='https:')shell.openExternal(parsed.href);}catch{}}
const single=app.requestSingleInstanceLock();
if(!single){app.quit();}else{
 app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();}});
 app.whenReady().then(async()=>{
  protocol.handle('hideout',async request=>{
   try{
    const url=new URL(request.url);if(url.hostname!=='app')return new Response('Not found',{status:404});
    const relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
    const target=path.resolve(uiRoot,'.'+relative);
    if(!target.startsWith(uiRoot+path.sep)||relative.includes('\\'))return new Response('Forbidden',{status:403});
    const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
    return new Response(await fs.promises.readFile(target),{headers:{'Content-Type':types[path.extname(target)]||'application/octet-stream','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://nl256.github.io; font-src 'self'; connect-src 'self' https://iptkvqddczvrxuxqoeil.supabase.co https://nl256.github.io/gzw-hideout-tracker/; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'"}});
   }catch{return new Response('Not found',{status:404});}
  });
  session.defaultSession.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  if(app.isPackaged&&process.platform==='win32'&&!qa){
   const {autoUpdater}=require('electron-updater');
   const {createUpdates,allowedUpdateUrl}=require('./updates.cjs');
   autoUpdater.logger=null;
   autoUpdater.netSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
   autoUpdater.netSession.setPermissionCheckHandler(()=>false);
   autoUpdater.netSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!allowedUpdateUrl(details.url)}));
   const preferenceFile=path.join(dataRoot,'app-update-preference.json');
   updates=createUpdates({updater:autoUpdater,currentVersion:app.getVersion(),
    onState:state=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('hideout:update-status',state);},
    loadPreference:()=>JSON.parse(fs.readFileSync(preferenceFile,'utf8')),
    savePreference:value=>{fs.mkdirSync(dataRoot,{recursive:true});fs.writeFileSync(preferenceFile,JSON.stringify(value));},
    prepareInstall:async()=>{if(login.isActive())throw Error('Sign-in is in progress');await session.defaultSession.flushStorageData();await session.defaultSession.cookies.flushStore();}
   });
  }
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>{let allowed=false;try{const u=new URL(details.url);allowed=(u.protocol==='hideout:'&&u.hostname==='app')||['blob:','data:'].includes(u.protocol)||u.origin===ORIGIN||(u.origin==='https://nl256.github.io'&&u.pathname.startsWith('/gzw-hideout-tracker/'));}catch{}callback({cancel:!allowed});});
  let windowState={width:1440,height:1000};
  const windowFile=path.join(dataRoot,'window.json');
  try{const saved=JSON.parse(fs.readFileSync(windowFile,'utf8'));if(saved.width>=900&&saved.width<=7680&&saved.height>=650&&saved.height<=4320)windowState={width:saved.width,height:saved.height};}catch{}
  mainWindow=new BrowserWindow({...windowState,minWidth:780,minHeight:600,show:false,title:'GZW Hideout Tracker',backgroundColor:'#10140f',icon:path.join(__dirname,'app.png'),autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,devTools:!app.isPackaged}});
  Menu.setApplicationMenu(null);
  mainWindow.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
  mainWindow.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('hideout://app/')){event.preventDefault();external(url);}});
  mainWindow.webContents.on('will-attach-webview',event=>event.preventDefault());
  mainWindow.on('close',()=>{if(!qa){try{fs.mkdirSync(dataRoot,{recursive:true});const bounds=mainWindow.getNormalBounds();fs.writeFileSync(windowFile,JSON.stringify({width:bounds.width,height:bounds.height}));}catch{}}});
  mainWindow.once('ready-to-show',()=>{if(!qa)mainWindow.show();});
  mainWindow.webContents.on('did-fail-load',(_event,errorCode,description)=>{if(errorCode!==-3&&!qa)dialog.showErrorBox('Unable to open tracker',description);});
  await mainWindow.loadURL('hideout://app/index.html?desktop=1');
  if(updates){
   const initialCheck=setTimeout(()=>updates.check(),15000);initialCheck.unref();
   const repeatCheck=setInterval(()=>updates.check(),60*60*1000);repeatCheck.unref();
   mainWindow.on('focus',()=>updates.check());
   app.on('before-quit',()=>{clearTimeout(initialCheck);clearInterval(repeatCheck);});
  }
  if(qa){
   try{
    if(!qaDir)throw Error('Smoke test needs --qa-dir.');fs.mkdirSync(qaDir,{recursive:true});
    const result=await mainWindow.webContents.executeJavaScript(`(async()=>{
      await document.fonts.ready;
      const key='gzw-hideout-operations:v1';
      const initial=JSON.parse(localStorage.getItem(key));
      const title=document.title;
      document.querySelector('.view-tabs [data-view="inventory"]').click();
      const icons=Array.from(document.querySelectorAll('#inventory-table img'));
      await Promise.all(icons.map(i=>i.decode().catch(()=>null)));
      const missingIcons=icons.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src);
      document.querySelector('.view-tabs [data-view="desk"]').click();
      const filter=document.querySelector('#needed-only');filter.checked=false;filter.dispatchEvent(new Event('change',{bubbles:true}));
      const input=document.querySelector('[data-stock="wood"]');
      input.value='7';input.dispatchEvent(new Event('change',{bubbles:true}));
      const changed=JSON.parse(localStorage.getItem(key));
      return {title,initialProfiles:initial.profiles.length,previousWood:initial.profiles[0].stash.wood||0,wood:changed.profiles[0].stash.wood,iconCount:icons.length,missingIcons,items:window.HIDEOUT_DATA.items.length,stations:window.HIDEOUT_DATA.stations.length,origin:location.origin,desktop:new URLSearchParams(location.search).get('desktop')==='1'};
    })()`);
    await session.defaultSession.flushStorageData();
    fs.writeFileSync(path.join(qaDir,'result.json'),JSON.stringify({...result,packaged:app.isPackaged,electron:process.versions.electron,executable:process.execPath},null,2));
    if(result.wood!==7||result.missingIcons.length||result.iconCount!==73||result.items!==73||result.origin!=='hideout://app')throw Error('Smoke test assertion failed.');
    try{const image=await mainWindow.webContents.capturePage();fs.writeFileSync(path.join(qaDir,'desktop.png'),image.toPNG());}catch(e){fs.writeFileSync(path.join(qaDir,'screenshot-note.txt'),'Hidden-window capture unavailable: '+String(e));}
    app.exit(0);
   }catch(e){if(qaDir)fs.writeFileSync(path.join(qaDir,'error.txt'),e.stack||String(e));app.exit(1);}
  }
 }).catch(e=>{if(qa&&qaDir){fs.mkdirSync(qaDir,{recursive:true});fs.writeFileSync(path.join(qaDir,'error.txt'),e.stack||String(e));}else dialog.showErrorBox('Unable to open tracker',String(e));app.exit(1);});
 app.on('window-all-closed',()=>app.quit());
}
