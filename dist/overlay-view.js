(() => {
 'use strict';
 const query=new URLSearchParams(location.search),bridge=window.HideoutFloating;
 const floating=!!bridge||query.get('floating')==='1';
 document.body.dataset.overlaySurface=floating?'floating':'stream';
 const view=window.HideoutOverlayView.mount(document.querySelector('#overlay-root'),{floating});
 let lastReceived=0;
 const receive=value=>{lastReceived=Date.now();view.update(value);};
 if(floating){
  document.querySelector('.ho-windowbar').hidden=false;
  if(!bridge)document.querySelector('.ho-drag-label').textContent='Tracked items · move using the browser title bar';
  document.querySelector('#float-close').addEventListener('click',()=>bridge?bridge.close():window.close());
  if(bridge){
   const pin=document.querySelector('#float-pin');pin.hidden=false;
   pin.addEventListener('click',async()=>{try{const value=await bridge.setAlwaysOnTop(pin.getAttribute('aria-pressed')!=='true');pin.setAttribute('aria-pressed',String(value));}catch{view.disconnect('Reopen the floating list from your tracker.');}});
   bridge.onSnapshot(receive);
   bridge.getState().then(value=>{pin.setAttribute('aria-pressed',String(value.alwaysOnTop));receive(value);}).catch(()=>view.disconnect());
  }else if(typeof BroadcastChannel!=='undefined'&&/^[a-f0-9-]{36}$/.test(query.get('channel')||'')){
   const channel=new BroadcastChannel('hideout-list-'+query.get('channel'));
   channel.onmessage=event=>{if(event.data?.type==='snapshot')receive(event.data.value);if(event.data?.type==='closed')view.disconnect('Tracker closed. Reopen the tracker and its floating list.');};
   channel.postMessage({type:'request'});
   setInterval(()=>channel.postMessage({type:'request'}),5000);
  }else view.disconnect('Open Stream & floating list in your tracker to connect this window.');
 }else if(location.hostname==='127.0.0.1'&&/^[a-f0-9]{64}$/.test(query.get('token')||'')){
  const poll=async()=>{try{const url=new URL('snapshot',location.href);url.searchParams.set('token',query.get('token'));const response=await fetch(url,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(4000)});if(!response.ok)throw Error('Disconnected');receive(await response.json());}catch{view.disconnect('Tracker disconnected. Open the Windows app and enable the OBS overlay.');}finally{setTimeout(poll,2000);}};poll();
 }else view.disconnect('Copy the OBS link from Stream & floating list in the Windows app.');
 setInterval(()=>{if(lastReceived&&Date.now()-lastReceived>20000)view.disconnect('Tracker disconnected. Open the tracker to reconnect.');},5000);
})();
