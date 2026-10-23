const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('HideoutDesktop',Object.freeze({
 prepareSignIn:()=>ipcRenderer.invoke('hideout:prepare-signin'),
 openSignIn:url=>ipcRenderer.invoke('hideout:open-signin',url),
 cancelSignIn:()=>ipcRenderer.invoke('hideout:cancel-signin'),
 onSignIn:callback=>{const listener=(_event,result)=>callback(result);ipcRenderer.on('hideout:signin-result',listener);return ()=>ipcRenderer.removeListener('hideout:signin-result',listener);}
}));
