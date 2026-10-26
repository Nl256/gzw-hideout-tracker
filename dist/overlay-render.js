(() => {
 'use strict';
 const number=value=>Number(value).toLocaleString('en-US');
 function mount(host,{floating=false}={}){
  host.classList.add('ho-widget');
  host.innerHTML='<header class="ho-heading"><span class="ho-mark" aria-hidden="true">H</span><div><div class="ho-title">HIDEOUT</div><div class="ho-subtitle">NEXT SUPPLY RUN</div></div><span class="ho-live">LIVE LIST</span></header><div class="ho-content"><div class="ho-summary"><strong data-units>0</strong><span>items to collect</span><small data-goals></small></div><div class="ho-total-track"><div class="ho-total-fill"></div></div><ul class="ho-list"></ul><div class="ho-empty" hidden></div><div class="ho-warning" hidden>Some requirements are unconfirmed. Check your plan.</div><footer class="ho-footer"><span data-cash></span><span data-page></span></footer></div><div class="ho-disconnected" role="status">Waiting for your tracker…</div>';
  const find=selector=>host.querySelector(selector);
  let data=null,connected=false,page=0,fingerprint='',lastPageAt=Date.now();
  function render(){
   find('.ho-content').hidden=!connected;find('.ho-disconnected').hidden=connected;find('.ho-live').hidden=!connected;
   if(!connected||!data)return;
   const options=data.settings;
   host.style.setProperty('--ho-opacity',String(options.opacity/100));host.style.setProperty('--ho-scale',String(options.scale/100));
   find('[data-units]').textContent=number(data.units);find('[data-goals]').textContent=`${data.goals} goal${data.goals===1?'':'s'}`;
   find('.ho-total-fill').style.width=(data.total?100*data.collected/data.total:0)+'%';
   const visible=data.items.filter(item=>!options.onlyMissing||item.need>0);
   const count=floating?Math.max(1,visible.length):options.rows,pages=Math.max(1,Math.ceil(visible.length/count));page%=pages;
   find('.ho-list').style.minHeight=!floating&&pages>1?(options.rows*60*options.scale/100+8)+'px':'';
   const rows=visible.slice(page*count,(page+1)*count).map(item=>{
    const row=document.createElement('li');row.className='ho-row'+(item.need?'':' covered');
    const img=document.createElement('img');img.alt='';img.src=`assets/items/${item.id}.svg`;img.addEventListener('error',()=>{img.src='icon.svg';},{once:true});
    const identity=document.createElement('span');identity.className='ho-item';
    const name=document.createElement('span');name.className='ho-name';name.textContent=item.name;
    const have=document.createElement('span');have.className='ho-have';have.textContent=`${number(item.have)} / ${number(item.required)} in stash`;
    identity.append(name,have);
    const need=document.createElement('span');need.className='ho-need';
    const amount=document.createElement('strong');amount.textContent=item.need?number(item.need):'✓';
    const label=document.createElement('span');label.textContent=item.need?'NEED':'MET';need.append(amount,label);
    row.append(img,identity,need);return row;
   });
   find('.ho-list').replaceChildren(...rows);
   const empty=find('.ho-empty');empty.hidden=visible.length>0;
   empty.replaceChildren();const title=document.createElement('strong');title.textContent=data.items.length?'Materials covered.':'Your next run starts here.';
   empty.append(title,document.createTextNode(data.items.length?'Your tracked stash covers this list. Check cash and in-game prerequisites before building.':'Choose upgrade goals or personal reserves in the tracker.'));
   const cash=find('[data-cash]');cash.textContent=options.showCash&&data.cash.required?`Cash needed: $${number(data.cash.need)}`:'GZW · OPERATIONS DESK';
   find('[data-page]').textContent=pages>1?`${page+1} / ${pages}${options.rotate?' · AUTO':''}`:`${visible.length} material${visible.length===1?'':'s'}`;
   find('.ho-warning').hidden=!data.incomplete;
  }
  const timer=setInterval(()=>{if(connected&&data?.settings.rotate&&!floating&&Date.now()-lastPageAt>=8000){page++;lastPageAt=Date.now();render();}},1000);
  function update(envelope){
   let next=null;try{if(envelope?.snapshot)next=window.HideoutOverlayModel.sanitize(envelope.snapshot);}catch{}
   connected=envelope?.connected===true&&!!next;
   const signature=JSON.stringify([connected,next]);
   if(signature===fingerprint)return;fingerprint=signature;
   if(JSON.stringify(next?.items.map(item=>item.id))!==JSON.stringify(data?.items.map(item=>item.id))||JSON.stringify(next?.settings)!==JSON.stringify(data?.settings)){page=0;lastPageAt=Date.now();}
   data=next;render();
  }
  function disconnect(message='Tracker disconnected. Open the tracker to reconnect.'){connected=false;fingerprint='';find('.ho-disconnected').textContent=message;render();}
  return {update,disconnect,destroy:()=>clearInterval(timer)};
 }
 window.HideoutOverlayView={mount};
})();
