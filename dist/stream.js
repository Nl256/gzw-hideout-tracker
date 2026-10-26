(() => {
 'use strict';
 const app=window.HideoutApp,bridge=window.HideoutDesktop,model=window.HideoutOverlayModel;
 const $=selector=>document.querySelector(selector),key='gzw-hideout-overlay-settings:v1';
 let options=model.settings(),state={enabled:false,floating:false},busy=false;
 try{options=model.settings(JSON.parse(localStorage.getItem(key)||'{}'));}catch{}
 const preview=window.HideoutOverlayView.mount($('#overlay-preview'));
 let channelId=globalThis.crypto?.randomUUID?.();
 try{const previous=sessionStorage.getItem('hideout-floating-channel');if(/^[a-f0-9-]{36}$/.test(previous||''))channelId=previous;else if(channelId)sessionStorage.setItem('hideout-floating-channel',channelId);}catch{}
 const channel=typeof BroadcastChannel!=='undefined'&&channelId?new BroadcastChannel('hideout-list-'+channelId):null;
 const floatingUrl=new URL('overlay.html',location.href);floatingUrl.searchParams.set('floating','1');floatingUrl.searchParams.set('channel',channelId||'');
 $('#stream-float-tab').href=floatingUrl.href;$('#stream-float-tab').hidden=!!bridge||!channel;
 const message=value=>{$('#stream-message').textContent=value;};
 const payload=()=>({connected:true,updatedAt:Date.now(),snapshot:app.getOverlaySnapshot(options)});
 function publish(){
  const value=payload();preview.update(value);channel?.postMessage({type:'snapshot',value});
  if(bridge?.publishOverlay)bridge.publishOverlay(value.snapshot).catch(()=>message('The live list could not connect. Reopen the app to try again.'));
 }
 function paintState(value){
  state=value;$('#stream-status').textContent=value.enabled?'OBS connection on':'OBS connection off';
  $('#stream-toggle').textContent=value.enabled?'Turn off OBS overlay':'Enable OBS overlay';
  $('#stream-toggle').disabled=busy;$('#stream-copy').disabled=busy||!value.enabled;
  $('#stream-link').hidden=!value.enabled;$('#stream-link').value=value.url||'';
 }
 for(const field of document.querySelectorAll('[data-overlay-option]')){
  const name=field.dataset.overlayOption;
  if(field.type==='checkbox')field.checked=options[name];else field.value=options[name];
  const output=$(`[data-overlay-value="${name}"]`);if(output)output.textContent=options[name]+(name==='rows'?'':'%');
  field.addEventListener('input',()=>{
   options=model.settings({...options,[name]:field.type==='checkbox'?field.checked:Number(field.value)});
   if(output)output.textContent=options[name]+(name==='rows'?'':'%');
   try{localStorage.setItem(key,JSON.stringify(options));}catch{}
   publish();
  });
 }
 $('#stream-float').addEventListener('click',()=>{
  if(bridge?.openFloating){bridge.openFloating().then(()=>message('Floating list opened. Drag its title bar and resize its edges.')).catch(()=>message('Could not open the floating list. Try reopening the app.'));return;}
  if(!channel){message('This browser does not support the floating connection. Use the Windows app.');return;}
  const popup=window.open(floatingUrl.href,'hideout-floating-'+channelId,'popup,width=410,height=680,resizable=yes,scrollbars=yes');
  if(popup){popup.opener=null;message('Floating list opened. Keep this tracker tab open.');}else message('Allow pop-ups for this tracker, then try Open floating list again.');
 });
 if(bridge?.getOverlayState){
  $('#stream-desktop').hidden=false;$('#stream-web').hidden=true;
  $('#stream-toggle').addEventListener('click',async()=>{
   if(busy)return;busy=true;paintState(state);message('');
   try{publish();paintState(await bridge.enableOverlay(!state.enabled));message(state.enabled?'Connected. Copy the link into an OBS Browser Source on this PC.':'OBS overlay turned off.');}
   catch(error){message(error.message?.includes('already in use')?'The OBS connection is in use. Close the other tracker copy and try again.':'Could not start the OBS connection. Reopen the app and try again.');}
   finally{busy=false;paintState(state);}
  });
  $('#stream-copy').addEventListener('click',()=>bridge.copyOverlayLink().then(()=>message('OBS link copied. Paste it into the Browser Source URL in OBS.')).catch(()=>message('Select the OBS link below and copy it manually.')));
  bridge.onOverlay(paintState);bridge.getOverlayState().then(paintState).catch(()=>message('Reopen the app to connect the overlay.'));
 }else{$('#stream-desktop').hidden=true;$('#stream-web').hidden=false;}
 channel&&(channel.onmessage=event=>{if(event.data?.type==='request')channel.postMessage({type:'snapshot',value:payload()});});
 window.addEventListener('hideout:rendered',publish);
 window.addEventListener('beforeunload',()=>{channel?.postMessage({type:'closed'});channel?.close();});
 setInterval(publish,5000);publish();
})();
