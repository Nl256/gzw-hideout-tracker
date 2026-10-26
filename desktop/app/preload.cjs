const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('HideoutDesktop',Object.freeze({
 publishOverlay:value=>ipcRenderer.invoke('hideout:overlay-publish',value),
 getOverlayState:()=>ipcRenderer.invoke('hideout:overlay-state'),
 openFloating:()=>ipcRenderer.invoke('hideout:overlay-open'),
 enableOverlay:value=>ipcRenderer.invoke('hideout:overlay-enabled',value),
 copyOverlayLink:()=>ipcRenderer.invoke('hideout:overlay-copy'),
 onOverlay:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('hideout:overlay-status',listener);return ()=>ipcRenderer.removeListener('hideout:overlay-status',listener);},
 getUpdateState:()=>ipcRenderer.invoke('hideout:update-state'),
 checkUpdates:()=>ipcRenderer.invoke('hideout:update-check'),
 downloadUpdate:()=>ipcRenderer.invoke('hideout:update-download'),
 installUpdate:()=>ipcRenderer.invoke('hideout:update-install'),
 deferUpdate:()=>ipcRenderer.invoke('hideout:update-later'),
 onUpdate:callback=>{const listener=(_event,result)=>callback(result);ipcRenderer.on('hideout:update-status',listener);return ()=>ipcRenderer.removeListener('hideout:update-status',listener);},
 prepareSignIn:()=>ipcRenderer.invoke('hideout:prepare-signin'),
 openSignIn:url=>ipcRenderer.invoke('hideout:open-signin',url),
 cancelSignIn:()=>ipcRenderer.invoke('hideout:cancel-signin'),
 onSignIn:callback=>{const listener=(_event,result)=>callback(result);ipcRenderer.on('hideout:signin-result',listener);return ()=>ipcRenderer.removeListener('hideout:signin-result',listener);}
}));
