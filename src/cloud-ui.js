import {createClient} from '@supabase/supabase-js';
const A=window.HideoutApp,C=window.HideoutCore,S=window.HideoutSync;
const config=window.HIDEOUT_CLOUD||{};
const $=s=>document.querySelector(s);
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dialog=$('#account-modal'),content=$('#account-content');
let client=null,user=null,engine=null,accountKey=null,timer=null,status='guest',authError='',emailSent=false,email='',epoch=0,keepDraftOnSignout=false;
const configured=Boolean(config.url&&config.publishableKey);
const labels={guest:'Progress stays in this browser. Sign-in is optional.',connecting:'Opening your account save…',syncing:'Saving and checking for updates…',synced:'Saved to your account.',pending:'Saved here · waiting to sync.',offline:'Saved here · cloud unavailable. Retry when connected.',conflict:'Two versions need your attention. Both have been kept.',changed:'Another device saved first. Check again to review.',new:'Choose how to start your cloud save.'};
function setStatus(next){status=next;$('#cloud-mode').textContent=user?'CLOUD ACCOUNT':'GUEST MODE';$('#cloud-status').textContent=labels[next]||next;$('#account-menu').textContent=user?'My account':'Sign in / Cloud';$('#cloud-action').textContent=['conflict','changed','new'].includes(next)?'Review saves ↗':'Cloud saves ↗';$('#cloud-alert').hidden=!['conflict','changed'].includes(next);$('#cloud-alert').textContent=labels[next];if(dialog.open&&!document.activeElement?.closest('#email-form'))renderAccount();}
const header=title=>`<div class="modal-header"><h2 id="account-title">${title}</h2><button class="icon-button" data-account-close aria-label="Close account dialog">×</button></div>`;
function renderAccount(){
 if(!user){
  content.innerHTML=`<div class="modal-body">${header('Your hideout, anywhere.')}<p class="modal-copy">Keep playing as a guest, or sign in to save your operators, stash, and upgrade plans across devices.</p><div class="guest-card"><strong>No account needed</strong><p>Your guest progress stays in this browser. Signing in will keep it separate from your account save.</p></div>${configured?`${(config.providers||[]).includes('email')?`<form id="email-form" class="modal-form"><label class="field">Email address<input id="sign-in-email" type="email" autocomplete="email" required maxlength="254" value="${escape(email)}" placeholder="you@example.com"></label><button class="button" type="submit">${emailSent?'Send another sign-in link':'Email me a sign-in link'}</button></form>`:''}${(config.providers||[]).includes('github')?'<button class="button oauth-button" data-github-signin>Sign in with GitHub</button>':''}<p class="small-muted auth-note">${emailSent?'Link requested. Check your inbox and spam folder. Open it in this browser to finish signing in.':'Sign-in is handled by GitHub and Supabase. This tracker never sees your GitHub password. Your cloud progress is private to your account.'}</p>`:'<p class="notice">Cloud sign-in has not been configured for this copy yet. Guest saves and backups work normally.</p>'}<p id="auth-error" class="form-error" role="alert">${escape(authError)}</p><div class="modal-actions"><button class="button secondary" data-account-close>Continue as guest</button></div></div>`;
 }else{
  const conflict=engine?.conflict;
  content.innerHTML=`<div class="modal-body">${header('Your cloud save')}<p class="account-email">${escape(user.email||'Signed-in player')}</p><p class="modal-copy">${escape(labels[status]||status)}</p>${status==='new'?'<div class="backup-options"><button class="backup-option" data-start="device"><strong>Use this device’s progress</strong><small>Copy your existing account draft, or your guest operators if this is a new device.</small></button><button class="backup-option" data-start="fresh"><strong>Start a fresh cloud save</strong><small>Your guest progress stays available when you sign out.</small></button></div>':''}${conflict?`<div class="conflict-options"><p>Choose which version to continue with. Switching versions keeps a recovery copy on this device.</p><button class="button secondary" data-resolve="device">Use this device’s version</button>${conflict.payload?'<button class="button secondary" data-resolve="cloud">Use cloud version</button>':''}<button class="text-button" data-conflict-download>Download both versions first ↓</button></div>`:''}<div class="backup-options"><button class="backup-option" data-sync-now><strong>Sync now ↻</strong><small>Check for saves from your other devices.</small></button><button class="backup-option" data-account-backup><strong>Export current account progress ↓</strong><small>Keep a portable backup of this workspace.</small></button><button class="backup-option" data-recovery-backup><strong>Export recovery copies ↓</strong><small>Versions preserved before replacing progress on this browser.</small></button></div><p class="small-muted auth-note">Your guest save remains on this device. Use Backups to import operators from another browser or the desktop app.</p><p id="auth-error" class="form-error" role="alert">${escape(authError)}</p><div class="modal-actions"><button class="button secondary" data-signout>Sign out · return to guest</button></div></div>`;
 }
}
function showAccount(){keepDraftOnSignout=false;renderAccount();if(!dialog.open)dialog.showModal();}
function backup(key,state){
 const raw=localStorage.getItem(key+':recovery-copies');let copies=[];try{copies=JSON.parse(raw)||[];}catch{}
 copies.push({savedAt:new Date().toISOString(),progress:A.clean(state)});
 localStorage.setItem(key+':recovery-copies',JSON.stringify(copies.slice(-5)));
}
async function setSession(session){
 const next=session?.user||null;if(next?.id===user?.id&&engine)return;
 const current=++epoch;clearTimeout(timer);engine?.stop();engine=null;user=next;authError='';
 if(!user){accountKey=null;A.switchWorkspace(A.guestKey);setStatus('guest');return;}
 const key=A.guestKey+':account:'+user.id;accountKey=key;A.switchWorkspace(key);setStatus('connecting');
 const remote={
  async read(){const {data,error}=await client.from('hideout_progress').select('payload,revision,updated_at').eq('user_id',next.id).maybeSingle();if(error)throw error;return data;},
  async write(payload,revision){const {data,error}=await client.rpc('save_hideout_progress',{p_payload:payload,p_expected_revision:revision});if(error)throw error;return data[0];}
 };
 const readMeta=()=>{try{return JSON.parse(localStorage.getItem(key+':sync'));}catch{return null;}};
 engine=new S.Engine({remote,get:A.getState,exists:()=>localStorage.getItem(key)!==null,clean:A.clean,apply:A.apply,readMeta,writeMeta:m=>localStorage.setItem(key+':sync',JSON.stringify(m)),backup:p=>backup(key,p),status:s=>{if(current===epoch)setStatus(s);}});
 await engine.sync();if(current===epoch&&['new','conflict'].includes(status))showAccount();
}
function queueSync(){if(!engine)return;clearTimeout(timer);if(!['conflict','new'].includes(status))setStatus('pending');timer=setTimeout(()=>engine?.sync(),850);}
$('#account-menu').addEventListener('click',showAccount);$('#cloud-action').addEventListener('click',showAccount);
dialog.addEventListener('click',async event=>{
 const b=event.target.closest('button');if(!b||b.disabled)return;
 if(b.hasAttribute('data-account-close')){dialog.close();return;}
 b.disabled=true;authError='';
 try{
  if(b.hasAttribute('data-sync-now'))await engine?.sync();
  if(b.dataset.start){const payload=b.dataset.start==='fresh'?A.blank():(localStorage.getItem(accountKey)?A.getState():A.guest());await engine?.start(payload);}
  if(b.dataset.resolve)await engine?.resolve(b.dataset.resolve);
  if(b.hasAttribute('data-conflict-download'))A.download({device:A.getState(),cloud:engine.conflict?.payload},'hideout-conflict-copies.json');
  if(b.hasAttribute('data-account-backup'))A.download(A.getState(),'hideout-account-progress.json');
  if(b.hasAttribute('data-recovery-backup'))A.download(JSON.parse(localStorage.getItem(accountKey+':recovery-copies')||'[]'),'hideout-recovery-copies.json');
  if(b.hasAttribute('data-signout')){
   clearTimeout(timer);
   if(!keepDraftOnSignout&&engine?.meta.enabled&&!(await engine.flush())){
    keepDraftOnSignout=true;
    authError='Your latest account progress is saved on this device but is not synced. Resolve or retry above, or click Sign out again to keep the draft here and return to guest mode.';
   }else{
    const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;
    await setSession(null);keepDraftOnSignout=false;
   }
  }
  if(b.hasAttribute('data-github-signin')){const {error}=await client.auth.signInWithOAuth({provider:'github',options:{redirectTo:new URL('./',location.href).href}});if(error)throw error;}
 }catch(e){authError=e.message||'Could not complete that action. Your local progress is still here.';}
 finally{b.disabled=false;if(dialog.open)renderAccount();}
});
dialog.addEventListener('submit',async event=>{
 if(event.target.id!=='email-form')return;event.preventDefault();email=$('#sign-in-email').value.trim();const button=event.target.querySelector('button');button.disabled=true;authError='';
 try{const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:new URL('./',location.href).href,shouldCreateUser:true}});if(error)throw error;emailSent=true;}
 catch(e){authError=e.message||'Unable to send a sign-in link. Please try again.';}
 finally{button.disabled=false;renderAccount();}
});
window.addEventListener('hideout:changed',event=>{if(user&&event.detail.key===accountKey)queueSync();});
window.addEventListener('online',()=>engine?.sync());
window.addEventListener('focus',()=>{if(engine&&!dialog.open)engine.sync();});
setInterval(()=>{if(engine&&!document.hidden&&!dialog.open)engine.sync();},30000);
window.addEventListener('beforeunload',event=>{if(engine&&S.canonical(A.getState())!==engine.meta.base&&status!=='new'){event.preventDefault();event.returnValue='';}});
setStatus('guest');
if(configured){
 try{
  client=createClient(config.url,config.publishableKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'gzw-hideout-auth:'+new URL(config.url).hostname}});
  client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>setSession(session).catch(e=>{authError=e.message;setStatus('offline');}),0);});
  client.auth.getSession().then(({data,error})=>{if(error)throw error;return setSession(data.session);}).catch(e=>{authError=e.message;setStatus('guest');});
 }catch(e){authError=e.message;}
}
