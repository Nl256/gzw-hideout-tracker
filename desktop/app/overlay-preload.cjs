const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('HideoutFloating',Object.freeze({
 getState:()=>ipcRenderer.invoke('hideout:float-state'),
 setAlwaysOnTop:value=>ipcRenderer.invoke('hideout:float-pin',value),
 close:()=>ipcRenderer.invoke('hideout:float-close'),
 onSnapshot:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('hideout:overlay-snapshot',listener);return ()=>ipcRenderer.removeListener('hideout:overlay-snapshot',listener);}
}));
