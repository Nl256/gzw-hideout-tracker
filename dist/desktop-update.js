(() => {
 'use strict';
 const bridge=window.HideoutDesktop;
 if(!bridge?.getUpdateState)return;
 const panel=document.getElementById('desktop-update'),title=document.getElementById('desktop-update-title'),copy=document.getElementById('desktop-update-copy');
 const action=document.getElementById('desktop-update-action'),later=document.getElementById('desktop-update-later'),progress=document.getElementById('desktop-update-progress');
 const check=document.getElementById('desktop-check-updates'),version=document.getElementById('desktop-app-version');
 let state={status:'idle'},showResult=false;
 version.hidden=false;check.hidden=false;
 function render(next){
  state=next;version.textContent=`Windows app ${next.currentVersion}`;
  const status=next.status;
  panel.hidden=next.deferred||(!['available','downloading','ready','installing','error'].includes(status)&&!showResult);
  check.disabled=['checking','downloading','installing'].includes(status);
  check.textContent=status==='checking'?'Checking for updates…':'Check for app updates';
  action.hidden=!['available','ready','error'].includes(status);
  later.hidden=!['available','ready','current','error'].includes(status);
  later.textContent=['available','ready'].includes(status)?'Later':'Dismiss';
  progress.hidden=status!=='downloading';progress.value=next.percent||0;
  if(status==='available'){
   title.textContent=`Version ${next.version} is available. Update the app?`;
   copy.textContent='The update downloads here. You can keep using the tracker and choose when to restart. Your saved progress stays in place.';
   action.textContent='Update now';
  }else if(status==='downloading'){
   title.textContent=`Downloading update · ${next.percent||0}%`;
   copy.textContent='Keep using your tracker. We’ll let you know when the update is ready.';
  }else if(status==='ready'){
   title.textContent=`Version ${next.version} is ready to install.`;
   copy.textContent=next.message||'Restart to finish updating. Progress is saved on this device; cloud sync continues when the app opens again.';
   action.textContent='Restart & update';
  }else if(status==='installing'){
   title.textContent='Saving and restarting…';copy.textContent='The app will reopen after the update finishes.';
  }else if(status==='error'){
   title.textContent='Update paused.';copy.textContent=next.message;action.textContent='Try again';
  }else if(status==='checking'){
   title.textContent='Checking for app updates…';copy.textContent='Looking for a newer Windows release.';
  }else{
   title.textContent='Your app is up to date.';copy.textContent='Material lists continue to update automatically.';
  }
 }
 async function run(fn){try{render(await fn());}catch{render({...state,status:'error',deferred:false,message:'Could not complete the update. Your current app and progress are still available. Please try again.'});}}
 check.addEventListener('click',()=>{showResult=true;run(()=>bridge.checkUpdates());});
 action.addEventListener('click',()=>{showResult=true;run(()=>state.status==='available'?bridge.downloadUpdate():state.status==='ready'?bridge.installUpdate():bridge.checkUpdates());});
 later.addEventListener('click',()=>{showResult=false;if(['available','ready'].includes(state.status))run(()=>bridge.deferUpdate());else panel.hidden=true;});
 bridge.onUpdate(render);
 run(()=>bridge.getUpdateState());
})();
