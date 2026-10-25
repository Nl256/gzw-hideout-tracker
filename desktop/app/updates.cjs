'use strict';

const stable = value => typeof value === 'string' && /^\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(value);
function newer(next, current) {
 if (!stable(next) || !stable(current)) return false;
 const a=next.split('.').map(Number),b=current.split('.').map(Number);
 for(let i=0;i<3;i++)if(a[i]!==b[i])return a[i]>b[i];
 return false;
}
function allowedUpdateUrl(value) {
 try {
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||u.port)return false;
  if(u.hostname==='github.com')return u.pathname.startsWith('/Nl256/gzw-hideout-tracker/releases');
  if(u.hostname==='api.github.com')return u.pathname.startsWith('/repos/Nl256/gzw-hideout-tracker/releases');
  return ['release-assets.githubusercontent.com','objects.githubusercontent.com','github-releases.githubusercontent.com'].includes(u.hostname);
 }catch{return false;}
}

// The renderer can request actions, but never supplies a feed, file path or URL.
function createUpdates({updater,currentVersion,onState=()=>{},prepareInstall=async()=>{},now=Date.now,loadPreference=()=>null,savePreference=()=>{}}) {
 updater.autoDownload=false;
 updater.autoInstallOnAppQuit=false;
 updater.allowDowngrade=false;
 updater.allowPrerelease=false;
 updater.disableWebInstaller=true;
 let state={status:'idle',currentVersion,version:null,percent:0,message:'',deferred:false};
 let preference;try{preference=loadPreference();}catch{}
 let checking=null,downloading=null,installing=null,consented=null,lastCheck=0,manual=false;
 const snapshot=()=>({...state});
 const send=(patch)=>{state={...state,...patch};onState(snapshot());return snapshot();};
 const deferred=version=>!manual&&preference?.version===version&&Number.isFinite(preference.until)&&preference.until>now();
 const failure=()=>send({status:'error',percent:0,deferred:!manual&&!consented,message:'The update could not finish. Your current app and saved progress are still available. Check your connection and try again.'});
 updater.on('error',failure);
 updater.on('update-not-available',()=>{consented=null;send({status:'current',version:null,percent:0,message:'You have the latest app version.',deferred:false});});
 updater.on('update-available',info=>{
  if(!newer(info?.version,currentVersion)){consented=null;send({status:'current',version:null,message:'You have the latest app version.',deferred:false});return;}
  consented=null;send({status:'available',version:info.version,percent:0,message:'',deferred:deferred(info.version)});
 });
 updater.on('download-progress',progress=>{
  if(state.status==='downloading')send({percent:Math.max(0,Math.min(100,Math.floor(Number(progress.percent)||0)))});
 });
 updater.on('update-downloaded',info=>{
  if(info?.version!==consented||!newer(info.version,currentVersion))return;
  send({status:'ready',version:info.version,percent:100,message:'',deferred:false});
 });
 async function check(force=false) {
  if(checking)return checking;
  if(state.status==='ready')return force||!deferred(state.version)?send({deferred:false}):snapshot();
  if(['downloading','installing'].includes(state.status))return snapshot();
  if(!force&&lastCheck&&now()-lastCheck<15*60*1000)return snapshot();
  manual=force;lastCheck=now();send({status:'checking',message:'',deferred:false});
  checking=Promise.resolve().then(()=>updater.checkForUpdates()).catch(failure).finally(()=>{checking=null;manual=false;});
  await checking;return snapshot();
 }
 async function download() {
  if(downloading)return downloading;
  if(state.status!=='available')return snapshot();
  consented=state.version;preference=null;try{savePreference(null);}catch{}
  send({status:'downloading',percent:0,message:'',deferred:false});
  downloading=Promise.resolve().then(()=>updater.downloadUpdate()).catch(()=>{failure();consented=null;}).finally(()=>{downloading=null;});
  await downloading;return snapshot();
 }
 async function install() {
  if(installing)return installing;
  if(state.status!=='ready'||state.version!==consented)return snapshot();
  send({status:'installing',message:'',deferred:false});
  installing=Promise.resolve().then(prepareInstall).then(()=>updater.quitAndInstall(true,true)).catch(()=>send({status:'ready',message:'The app could not restart yet. Finish any sign-in, then try Restart & update again.'})).finally(()=>{installing=null;});
  await installing;return snapshot();
 }
 function later() {
  if(!['available','ready'].includes(state.status))return snapshot();
  preference={version:state.version,until:now()+24*60*60*1000};try{savePreference(preference);}catch{}
  return send({deferred:true});
 }
 return {snapshot,check,download,install,later};
}
module.exports={createUpdates,newer,allowedUpdateUrl};
