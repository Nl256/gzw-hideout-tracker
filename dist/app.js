(() => {
 'use strict';
 let D=window.HIDEOUT_DATA;
 const C=window.HideoutCore,KEY='gzw-hideout-operations:v1';
 const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const desktop=new URLSearchParams(location.search).get('desktop')==='1';
 const bundledIcons=window.HideoutBundledIcons||new Set(D.items.map(i=>i.id));
 const icon=(id,extra='')=>`<img class="item-icon ${extra}" src="${bundledIcons.has(id)?'assets/items/'+esc(id)+'.svg':'https://nl256.github.io/gzw-hideout-tracker/assets/items/'+esc(id)+'.svg'}" width="48" height="48" alt="" decoding="async">`;
 const fmt=n=>Number(n||0).toLocaleString('en-US'),money=n=>'$'+fmt(n);
 const uid=()=>globalThis.crypto?.randomUUID?.()||'operator-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 const itemById=new Map(D.items.map(i=>[i.id,i])),stationById=new Map(D.stations.map(s=>[s.id,s]));
 let categories=[...new Set(D.items.map(i=>i.category))],rooms=[...new Set(D.stations.map(s=>s.room))];
 let state,initial=true,storageAvailable=true,recovery=null,activeKey=KEY;
 try{const raw=localStorage.getItem(KEY);if(raw){try{state=C.validateImport(JSON.parse(raw),D);initial=false;}catch(error){recovery=raw;$('#storage-warning').hidden=false;$('#storage-warning').textContent='Saved progress could not be read. Your original data is preserved. Open Backups to download a recovery copy before starting again.';}}}catch{storageAvailable=false;}
 if(!state){state=C.newState(uid());state.profiles[0].goals={'laboratory-heat-source':1,'workshop-micro-electronics':1,'workshop-storage-equipment':1};}
 let view='desk',selected='wood',deskSearch='',inventorySearch='',needed=true,sort='needed',room='all',category='all',ownedOnly=false,toastTimer,pendingImport=null;
 const inspectedTiers={};
 const profile=()=>state.profiles.find(p=>p.id===state.activeProfileId)||state.profiles[0];
 const activePlan=()=>C.plan(profile(),D);
 const conflictsFor=(id,level)=>D.conflicts.filter(c=>c.stationId===id&&c.level===level);
 function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>{$('#toast').hidden=true;},3600);}
 function save(notify=true){
  state.updatedAt=new Date().toISOString();
  try{if(recovery){localStorage.setItem(activeKey+':recovery',recovery);}localStorage.setItem(activeKey,JSON.stringify(state));storageAvailable=true;$('#save-status').textContent=desktop?'Saved on this PC':'Saved on this device';$('#save-status').classList.remove('failed');}
  catch{$('#save-status').textContent='Unable to save';$('#save-status').classList.add('failed');storageAvailable=false;$('#storage-warning').hidden=false;$('#storage-warning').textContent='Local storage is unavailable or full. Your current changes are in memory. Export a backup before closing this page.';}
  if(notify)window.dispatchEvent(new CustomEvent('hideout:changed',{detail:{key:activeKey}}));
 }
 function change(label,fn){C.remember(profile(),label);fn(profile());save();render();}
 function setView(next){if(!['desk','upgrades','inventory','sources'].includes(next))return;view=next;render();}
 function restoreInput(type,id){const target=$(`[data-${type}="${id}"]`);target?.focus();}
 function table(items,inventory=false){
  if(!items.length)return `<div class="empty"><h3>${inventory?'No materials found':Object.keys(profile().goals).length?'Nothing left in this view':'Choose your next upgrade'}</h3><p>${inventory?'Try another search or category.':Object.keys(profile().goals).length?'Your filters may be hiding covered items. Materials covered does not verify power, capability, or recipe unlocks.':'Pick a station in Hideout upgrades to build a shared shopping list.'}</p>${!inventory?'<button class="button secondary" data-open-upgrades>Open hideout upgrades</button>':''}</div>`;
  const p=profile(),plan=activePlan();
  return `<table class="material-table"><thead><tr><th scope="col">Material</th><th scope="col">In stash</th><th scope="col" class="target-col">${inventory?'Personal reserve':'Required'}</th><th scope="col">Need</th></tr></thead><tbody>${items.map(i=>{
   const cash=i.id==='us-dollars',have=cash?p.cash:(p.stash[i.id]||0),target=cash?plan.money:(plan.totals[i.id]||0),missing=cash?plan.moneyMissing:(plan.missing[i.id]||0);
   return `<tr class="${selected===i.id?'selected':''}"><td><div class="item-identity">${icon(i.id)}<div><button class="item-name" data-select-item="${esc(i.id)}" aria-pressed="${selected===i.id}">${esc(i.name)}</button><span class="item-category">${esc(cash?'Shared cash balance':i.category)}${i.usedInStationUpgrades&&inventory?' · Upgrade ingredient':''}</span></div></div></td><td>${cash?`<input class="cash-table-input" data-cash type="number" min="0" max="999999999" value="${have}" aria-label="US Dollars in stash">`:`<div class="stepper"><button data-qty="${esc(i.id)}" data-delta="-1" aria-label="Remove one ${esc(i.name)}" ${have===0?'disabled':''}>−</button><input data-stock="${esc(i.id)}" type="number" min="0" max="999999" inputmode="numeric" value="${have}" aria-label="${esc(i.name)} in stash"><button data-qty="${esc(i.id)}" data-delta="1" aria-label="Add one ${esc(i.name)}">+</button></div>`}</td><td class="target-col">${inventory&&!cash?`<input class="reserve-input" data-reserve="${esc(i.id)}" type="number" min="0" max="999999" value="${p.wishlist?.[i.id]||0}" aria-label="${esc(i.name)} personal reserve target">`:cash?money(target):fmt(target)}</td><td>${missing>0?`<span class="need-count">${cash?money(missing):fmt(missing)}</span>`:`<span class="met">${target?'Met':'—'}</span>`}</td></tr>`;
  }).join('')}</tbody></table>`;
 }
 function renderHeader(){
  const p=profile(),plan=activePlan();document.documentElement.dataset.theme=state.theme;
  $('#operator-select').innerHTML=state.profiles.map(p=>`<option value="${esc(p.id)}" ${p.id===state.activeProfileId?'selected':''}>${esc(p.name)} · ${esc(p.mode)}</option>`).join('');
  $('#operator-caption').textContent=`${p.name} · ${p.faction} · ${p.mode}`;
  $('#units-needed').textContent=fmt(plan.units);$('#goals-count').textContent=Object.keys(p.goals).length;
  $('#built-count').textContent=D.stations.reduce((n,s)=>n+s.levels.filter(t=>t.level<=(p.built[s.id]||0)).length,0);
  $('#station-count').textContent=D.stations.length;$('#item-count').textContent=D.items.length;
  $('#data-caption').textContent=`Catalogue ${D.checkedOn} · Auto-updates on · ${D.conflicts.length} flagged differences`;
  $$('.view').forEach(el=>{el.hidden=el.id!==view+'-view';});
  $$('.view-tabs [data-view]').forEach(b=>{if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  $('#undo').disabled=!p.history.length;$('#undo').textContent=p.history.length?`↶ Undo: ${p.history.at(-1).label}`:'↶ Undo last change';
 }
 function renderDesk(){
  const p=profile(),plan=activePlan();
  const goals=D.stations.filter(s=>p.goals[s.id]);
  $('#goal-list').innerHTML=goals.map(s=>{
   const cost=C.plan(p,D,{[s.id]:p.goals[s.id]});
   return `<div class="goal"><div class="goal-head"><div><button class="goal-name" data-inspect-station="${esc(s.id)}">${esc(s.name)}</button><div class="goal-room">${esc(s.room)}</div></div><button class="text-button" data-remove-goal="${esc(s.id)}" aria-label="Unpin ${esc(s.name)}">×</button></div><div class="goal-stats" style="margin-top:12px"><span>${p.built[s.id]?'Lv. '+p.built[s.id]:'Unbuilt'} → Lv. ${p.goals[s.id]}</span><span>${cost.total} units${cost.money?' + '+money(cost.money):''}</span></div></div>`;
  }).join('')||'<div class="empty compact"><h3>No upgrade goals yet.</h3><p>Select your next stations to get started.</p><button class="button secondary" data-open-upgrades>Choose upgrades</button></div>';
  $('#cash-input').value=p.cash;$('#cash-summary').textContent=plan.money?`${money(plan.money)} planned · ${money(plan.moneyMissing)} still needed`:'No cash needed for selected upgrades.';
  const flagged=plan.steps.flatMap(s=>conflictsFor(s.stationId,s.level));
  $('#plan-warning').hidden=!flagged.length&&!plan.gaps.length;
  $('#plan-warning').innerHTML=`${plan.gaps.length?`${plan.gaps.length} tier(s) have incomplete requirements. `:''}${flagged.length?`${flagged.length} selected tier(s) have conflicting community reports. `:''}<button class="text-button" data-view="sources">Review data notes ↗</button>`;
  let items=Object.keys(plan.totals).map(id=>itemById.get(id)).filter(Boolean).filter(i=>(!needed||plan.missing[i.id]>0)&&i.name.toLowerCase().includes(deskSearch.toLowerCase()));
  items.sort((a,b)=>(sort==='needed'?(plan.missing[b.id]-plan.missing[a.id]):0)||a.name.localeCompare(b.name));
  $('#supply-table').innerHTML=table(items);
  renderDetail(plan);
 }
 function renderDetail(plan=activePlan()){
  const i=itemById.get(selected);if(!i){$('#item-detail').hidden=true;return;}$('#item-detail').hidden=false;
  const p=profile(),uses=plan.uses[selected]||[],allUses=D.stations.flatMap(s=>s.levels.filter(t=>t.items[selected]).map(t=>({s,t}))),sources=[...new Set(allUses.map(u=>u.t.sourceUrl))];
  $('#item-detail').innerHTML=`<div class="detail-heading"><div class="item-identity">${icon(i.id,'detail-icon')}<h3>${esc(i.name)}</h3></div><span class="small-muted">${uses.length} use${uses.length===1?'':'s'} in your plan</span></div><div class="uses">${uses.length?uses.map(u=>`<button class="use-chip" ${u.stationId?`data-inspect-station="${esc(u.stationId)}"`:'data-view="inventory"'}>${esc(u.stationName)}${u.level?' · Lv. '+u.level:''} × ${u.quantity}</button>`).join(''):`<span class="small-muted">${allUses.length?`Used in ${allUses.length} listed station tier(s). Add an upgrade to your plan to include it.`:'No station upgrade uses this item in the catalogue. Track a personal reserve in All materials.'}</span>`}</div><p class="item-math">${fmt(plan.totals[selected])} required · ${fmt(p.stash[selected])} in stash · ${fmt(plan.missing[selected])} still needed</p><p class="detail-sources">Community-reported requirements · <a href="${esc(sources[0]||i.sourceUrl)}" target="_blank" rel="noopener noreferrer">View source ↗</a></p>`;
 }
 function renderUpgrades(){
  const p=profile();
  $('#upgrade-catalog').innerHTML=rooms.filter(r=>room==='all'||room===r).map(r=>`<section class="room-section"><div class="room-title">${esc(r)} <span>${D.stations.filter(s=>s.room===r).length} stations</span></div><div class="station-grid">${D.stations.filter(s=>s.room===r).map(s=>{
   const built=p.built[s.id]||0,next=s.levels.find(t=>t.level>built),t=s.levels.find(t=>t.level===(inspectedTiers[s.id]||p.goals[s.id]||next?.level))||s.levels.at(-1),flags=conflictsFor(s.id,t.level);
   return `<article class="station-card ${p.goals[s.id]?'planned':''}" id="station-${esc(s.id)}"><div class="station-heading"><h3>${esc(s.name)}</h3><span class="tier-badge">${p.goals[s.id]?'Planned':next?'In progress':'All listed tiers built'}</span></div><div class="station-controls"><label>Built in game<select data-built="${esc(s.id)}"><option value="0">Not built</option>${s.levels.map(t=>`<option value="${t.level}" ${built===t.level?'selected':''}>Level ${t.level}</option>`).join('')}</select></label><label>Plan through<select data-goal-level="${esc(s.id)}"><option value="0">Not tracked</option>${s.levels.filter(t=>t.level>built).map(t=>`<option value="${t.level}" ${p.goals[s.id]===t.level?'selected':''}>Level ${t.level}</option>`).join('')}</select></label></div><label class="tier-picker">Inspect recipe<select data-inspect-tier="${esc(s.id)}">${s.levels.map(level=>`<option value="${level.level}" ${level.level===t.level?'selected':''}>Lv. ${level.level} · ${esc(level.name)}</option>`).join('')}</select></label><div class="station-tier-title">${esc(t.provides||t.name)}</div><ul class="recipe-items">${Object.entries(t.items).map(([id,n])=>`<li><button data-show-inventory="${esc(id)}">${icon(id,'recipe-icon')}<span>${esc(itemById.get(id)?.name||id)}</span></button><strong>× ${n}</strong></li>`).join('')}${t.money?`<li><span class="recipe-cash">${icon('us-dollars','recipe-icon')}US Dollars</span><strong>${money(t.money)}</strong></li>`:''}</ul><div class="prereqs">${t.previousLevel?'Requires previous station level '+t.previousLevel+'. ':''}${t.requirements.length?t.requirements.map(q=>`${esc(q.name)} ${q.amount} ${esc(q.unit)}`).join(' · '):'No additional capability requirement listed.'}</div>${flags.length?`<p class="station-meta"><span class="warning-text">⚑ Community sources disagree on this tier.</span> <button class="text-button" data-view="sources">Details</button></p>`:''}<div class="station-actions">${next?`<button class="button secondary" data-complete="${esc(s.id)}" data-level="${next.level}">Complete Lv. ${next.level}</button>`:'<span class="small-muted">Listed progression complete</span>'}<a href="${esc(t.sourceUrl)}" target="_blank" rel="noopener noreferrer">Recipe source ↗</a></div></article>`;
  }).join('')}</div></section>`).join('');
 }
 function renderInventory(){
  const p=profile();let items=D.items.filter(i=>(category==='all'||i.category===category)&&(!ownedOnly||(i.id==='us-dollars'?p.cash:p.stash[i.id])>0)&&i.name.toLowerCase().includes(inventorySearch.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));
  $('#inventory-table').innerHTML=table(items,true);
 }
 function renderSources(){
  $('#sources-content').innerHTML=`<div class="source-layout"><section class="panel source-panel"><p class="eyebrow">DATA SNAPSHOT / ${esc(D.checkedOn)}</p><h2 style="margin-top:8px">Full currently listed community catalogue.</h2><div class="coverage-grid"><div><strong>${D.stations.length}</strong><span>stations</span></div><div><strong>${D.stations.reduce((n,s)=>n+s.levels.length,0)}</strong><span>upgrade recipes</span></div><div><strong>${D.items.length-1} + cash</strong><span>tracked materials</span></div><div><strong>${D.conflicts.length}</strong><span>flagged differences</span></div></div><p>This tracker includes every station tier and all material entries visible in GZW Hideout as of ${esc(D.checkedOn)}. Quantities are community-reported and have not been independently verified in-game. Published catalogue corrections arrive automatically on launch, when you return, and every five minutes while open. Changes must first be reviewed and published to this tracker; it does not read your game installation. Retired entries are retained to protect saved progress.</p><p>The catalogue includes building, crafting, and production ingredients. Shopping lists calculate selected station upgrades and your personal reserves. Crafting recipe chains are not included.</p><h3>How calculations work</h3><ul><li>Planning a later tier includes the station’s earlier unbuilt tiers. Your stash is deducted once from the combined total.</li><li>Power and capability requirements are shown beside each recipe. They are not treated as ingredients or automatically added as other station goals.</li><li>“Met” means a material quantity is covered. Check in-game prerequisites before building.</li><li>Personal reserves are additional quantities to keep after your planned upgrades.</li><li>Set “Built in game” to match existing progress. “Complete” can deduct tracked resources if you choose.</li><li>The source does not separately identify reusable tools. Resource spending follows the listed recipe quantities.</li></ul></section><section class="panel source-panel"><h2>Three reports need checking.</h2>${D.conflicts.map(c=>`<div class="source-link"><h3>${esc(stationById.get(c.stationId)?.name)} · Level ${c.level}</h3><p>${esc(c.note)}</p><small><a href="${esc(c.sourceUrl)}" target="_blank" rel="noopener noreferrer">Database</a> · <a href="${esc(c.alternateSourceUrl)}" target="_blank" rel="noopener noreferrer">Community spreadsheet</a></small></div>`).join('')}<p>Ventilation follows the database’s explicit level 1 → level 3 chain. The tracker does not invent a level 2 recipe.</p></section><section class="panel source-panel"><h2>Sources</h2><p>Item icons are original illustrations created for this tracker, not official in-game artwork. All 73 entries have a local icon. Fonts and icons are included for offline use in the desktop app.</p>${D.sources.map(s=>`<div class="source-link"><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a><small>${esc(s.scope)}</small></div>`).join('')}<div class="modal-actions"><a class="button secondary" href="catalog.json" download="gzw-hideout-catalogue-2026-10-22.json">Download catalogue</a></div></section><section class="panel source-panel"><h2>Your progress stays with you.</h2><p>${desktop?'Progress is saved on this PC in the GZW Hideout Tracker app folder. It survives closing the app and replacing the executable. Optional GitHub sign-in shares the same private cloud save as the website. Edits save automatically; other devices check for changes every five seconds. Guest progress stays separate. Export a backup whenever you want a portable copy.':'Guest progress is saved only in this browser. Optional sign-in adds private cloud saves that can follow you between devices. Guest and account progress are kept separately. Sign out to return to your guest save. Clearing browser data can remove local and unsynced progress; keep an exported backup.'}</p><p>Backups contain your operators, tracked quantities, completed stations, goals, and personal reserves. Importing a backup adds operator copies and preserves your existing progress.</p><div class="modal-actions"><button class="button secondary" data-open-backups>Open backups</button></div></section></div>`;
 }
 function render(){renderHeader();renderDesk();if(view==='upgrades')renderUpgrades();if(view==='inventory')renderInventory();if(view==='sources')renderSources();}
 function modal(content){$('#modal-content').innerHTML=content;if(!$('#modal').open)$('#modal').showModal();}
 const header=title=>`<div class="modal-header"><h2>${title}</h2><button class="icon-button" data-close-modal aria-label="Close dialog">×</button></div>`;
 function close(){ $('#modal').close();pendingImport=null; }
 function profileDialog(){modal(`<div class="modal-body">${header('Your operators')}<p class="modal-copy">Each operator has a separate stash and hideout plan.</p>${state.profiles.map(p=>`<div class="profile-row"><div><strong>${esc(p.name)}</strong><small>${esc(p.faction)} · ${esc(p.mode)}${p.id===state.activeProfileId?' · Active':''}</small></div><div class="toolbar-actions"><button class="button secondary" data-edit-profile="${esc(p.id)}">Edit</button><button class="text-button" data-delete-profile="${esc(p.id)}" ${state.profiles.length===1?'disabled':''}>Delete</button></div></div>`).join('')}<div class="modal-actions"><button class="button" data-new-profile ${state.profiles.length>=20?'disabled':''}>Add operator</button></div></div>`);}
 function editProfile(id=null){const p=id?state.profiles.find(p=>p.id===id):null;modal(`<div class="modal-body">${header(p?'Edit operator':'Add operator')}<form id="profile-form" data-profile-id="${esc(id||'')}"><div class="modal-form"><label class="field">Operator name<input id="profile-name" maxlength="60" required value="${esc(p?.name||'')}" placeholder="Operator name" autocomplete="off"></label><div class="fields-row"><label class="field">Faction<select id="profile-faction">${['Crimson Shield','Mithras','Lamang'].map(f=>`<option ${p?.faction===f?'selected':''}>${f}</option>`).join('')}</select></label><label class="field">Game mode<select id="profile-mode">${['PvE','PvEvP'].map(m=>`<option ${p?.mode===m?'selected':''}>${m}</option>`).join('')}</select></label></div></div><div class="modal-actions"><button type="button" class="button secondary" data-manage-profiles>Cancel</button><button class="button" type="submit">${p?'Save changes':'Create operator'}</button></div></form></div>`);}
 function deleteProfile(id){const p=state.profiles.find(p=>p.id===id);if(!p||state.profiles.length===1)return;modal(`<div class="modal-body">${header('Delete operator?')}<p class="modal-copy">Remove ${esc(p.name)} and their saved tracker progress from ${desktop?'this app':'this browser'}? Export a backup first if you want to keep a copy.</p><div class="modal-actions"><button class="button secondary" data-manage-profiles>Keep operator</button><button class="button danger" data-confirm-delete="${esc(id)}">Delete operator</button></div></div>`);}
 function completeDialog(id,level){const s=stationById.get(id),p=profile(),cost=C.plan(p,D,{[id]:level}),canSpend=!cost.units&&!cost.moneyMissing&&!cost.gaps.length;modal(`<div class="modal-body">${header('Complete upgrade')}<p class="modal-copy">Mark <strong>${esc(s.name)} · level ${level}</strong> as built in game.</p><div class="notice" style="margin-top:15px">${cost.total} material units${cost.money?' + '+money(cost.money):''}${cost.units?` · ${cost.units} units missing from tracked stash`:''}${cost.moneyMissing?' · '+money(cost.moneyMissing)+' cash missing':''}</div><label class="check-label"><input id="spend-on-build" type="checkbox" ${canSpend?'':'disabled'}>Deduct materials and cash from my tracked stash</label><p class="small-muted" style="margin-top:10px">${canSpend?'Leave unchecked if you have already adjusted your stash.':'Your tracked stash cannot cover this upgrade. You can still mark it built to match your actual game progress.'} Confirm power and capability requirements in game.</p><div class="modal-actions"><button class="button secondary" data-close-modal>Cancel</button><button class="button" data-confirm-complete="${esc(id)}" data-level="${level}">Mark built</button></div></div>`);}
 function setBuiltDialog(id,level){const s=stationById.get(id);modal(`<div class="modal-body">${header('Match your in-game progress')}<p class="modal-copy">Set <strong>${esc(s.name)}</strong> to <strong>${level?'level '+level:'not built'}</strong>? This updates completed tiers and leaves stash quantities unchanged.</p><div class="modal-actions"><button class="button secondary" data-close-modal>Cancel</button><button class="button" data-confirm-built="${esc(id)}" data-level="${level}">Update progress</button></div></div>`);}
 function download(data,name,type='application/json'){const url=URL.createObjectURL(new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
 function backups(){modal(`<div class="modal-body">${header('Keep a copy of your progress.')}<p class="modal-copy">${desktop?'Saved automatically on this PC. To bring your website progress here, export a backup on the website and import it below.':'Your current workspace saves automatically on this device. Sign in for cloud sync, or use backups to move progress between browsers and the desktop app.'}</p><div class="backup-options"><button class="backup-option" data-export><strong>Export all operators ↓</strong><small>Download stash counts, goals, completed tiers, and reserves.</small></button><button class="backup-option" data-import><strong>Import a backup ↑</strong><small>Adds imported operators as new copies. Existing progress is preserved.</small></button>${recovery?'<button class="backup-option" data-recovery><strong>Download recovery data ↓</strong><small>Keep a copy of the original saved data that could not be read.</small></button>':''}</div><p id="import-error" class="form-error" role="alert"></p></div>`);}
 function inspectStation(id){room=stationById.get(id).room;$('#room-filter').value=room;setView('upgrades');requestAnimationFrame(()=>$('#station-'+id)?.scrollIntoView({block:'center',behavior:'smooth'}));}
 function quantity(id,value){if(!C.integer(value)){toast('Use a whole number between 0 and 999,999.');render();return;}if(value===(profile().stash[id]||0))return;change(`Update ${itemById.get(id).name}`,p=>{p.stash[id]=value;});}
 function doUndo(){const label=C.undo(profile());if(label){save();render();toast(`Undid: ${label}`);}}
 document.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.view){setView(b.dataset.view);return;}
  if(b.hasAttribute('data-open-upgrades')){setView('upgrades');return;}
  if(b.dataset.qty){selected=b.dataset.qty;quantity(selected,Math.max(0,(profile().stash[selected]||0)+Number(b.dataset.delta)));const next=Array.from(document.querySelectorAll(`[data-qty="${selected}"]`)).find(el=>el.dataset.delta===b.dataset.delta&&el.offsetParent!==null);next?.focus();return;}
  if(b.dataset.selectItem){selected=b.dataset.selectItem;if(view==='inventory'){if(selected==='us-dollars'){toast('Cash is shared with the balance in Supply list.');return;}setView('desk');$('#item-detail').scrollIntoView({block:'nearest'});}else{renderDesk();$(`[data-select-item="${selected}"]`)?.focus();}return;}
  if(b.dataset.showInventory){inventorySearch=itemById.get(b.dataset.showInventory).name;$('#inventory-search').value=inventorySearch;category='all';$('#category-filter').value='all';ownedOnly=false;$('#owned-only').checked=false;setView('inventory');return;}
  if(b.dataset.removeGoal){change('Unpin upgrade',p=>delete p.goals[b.dataset.removeGoal]);return;}
  if(b.dataset.inspectStation){inspectStation(b.dataset.inspectStation);return;}
  if(b.hasAttribute('data-close-modal')){close();return;}
  if(b.id==='manage-profile'||b.hasAttribute('data-manage-profiles')){profileDialog();return;}
  if(b.hasAttribute('data-new-profile')){editProfile();return;}
  if(b.dataset.editProfile){editProfile(b.dataset.editProfile);return;}
  if(b.dataset.deleteProfile){deleteProfile(b.dataset.deleteProfile);return;}
  if(b.dataset.confirmDelete){state.profiles=state.profiles.filter(p=>p.id!==b.dataset.confirmDelete);if(state.activeProfileId===b.dataset.confirmDelete)state.activeProfileId=state.profiles[0].id;save();render();profileDialog();return;}
  if(b.dataset.complete){completeDialog(b.dataset.complete,Number(b.dataset.level));return;}
  if(b.dataset.confirmComplete){try{C.build(profile(),D,b.dataset.confirmComplete,Number(b.dataset.level),$('#spend-on-build').checked);save();close();render();toast('Upgrade completed. Your plan is updated.');}catch(e){toast(e.message);}return;}
  if(b.dataset.confirmBuilt){change('Set built level',p=>{p.built[b.dataset.confirmBuilt]=Number(b.dataset.level);if((p.goals[b.dataset.confirmBuilt]||0)<=Number(b.dataset.level))delete p.goals[b.dataset.confirmBuilt];});close();return;}
  if(b.id==='undo'){doUndo();return;}
  if(b.id==='track-next'){change('Track next tiers',p=>{D.stations.forEach(s=>{const next=s.levels.find(t=>t.level>(p.built[s.id]||0));if(next)p.goals[s.id]=next.level;});});toast('The next unbuilt tier of each station is in your plan.');return;}
  if(b.id==='clear-plan'){change('Clear upgrade plan',p=>{p.goals={};});return;}
  if(b.id==='theme-toggle'){state.theme=state.theme==='dark'?'light':'dark';save();render();return;}
  if(b.id==='backup-menu'||b.hasAttribute('data-open-backups')){backups();return;}
  if(b.hasAttribute('data-export')){download({...state,profiles:state.profiles.map(p=>({...p,history:[]})),catalogueDate:D.checkedOn},`hideout-progress-${new Date().toISOString().slice(0,10)}.json`);toast('Backup downloaded.');return;}
  if(b.hasAttribute('data-recovery')){download(recovery,'hideout-recovery.json');return;}
  if(b.hasAttribute('data-import')){$('#import-file').value='';$('#import-file').click();return;}
  if(b.hasAttribute('data-confirm-import')&&pendingImport){const incoming=pendingImport.profiles.map(p=>({...p,id:uid(),name:state.profiles.some(existing=>existing.name===p.name)?(p.name.slice(0,49)+' (imported)'):p.name,history:[]}));state.profiles.push(...incoming);state.activeProfileId=incoming[0].id;save();close();render();toast(`Imported ${incoming.length} operator${incoming.length===1?'':'s'} as new copies.`);return;}
 });
 document.addEventListener('change',event=>{
  const el=event.target;
  if(el.dataset.stock){quantity(el.dataset.stock,Number(el.value));restoreInput('stock',el.dataset.stock);}
  if(el.dataset.reserve){if(!C.integer(el.value)){toast('Use a whole number between 0 and 999,999.');renderInventory();return;}change('Update personal reserve',p=>{p.wishlist[el.dataset.reserve]=Number(el.value);});restoreInput('reserve',el.dataset.reserve);}
  if(el.id==='cash-input'||el.hasAttribute('data-cash')){if(!C.integer(el.value,999999999)){toast('Enter a valid whole-dollar cash amount.');render();return;}change('Update cash',p=>{p.cash=Number(el.value);});}
  if(el.dataset.goalLevel){change('Update upgrade goal',p=>{const value=Number(el.value);if(value)p.goals[el.dataset.goalLevel]=value;else delete p.goals[el.dataset.goalLevel];});}
  if(el.dataset.built){const value=Number(el.value);renderUpgrades();if(value!==(profile().built[el.dataset.built]||0))setBuiltDialog(el.dataset.built,value);}
  if(el.dataset.inspectTier){inspectedTiers[el.dataset.inspectTier]=Number(el.value);renderUpgrades();}
  if(el.id==='operator-select'){state.activeProfileId=el.value;save();render();toast('Operator switched.');}
  if(el.id==='needed-only'){needed=el.checked;renderDesk();}
  if(el.id==='desk-sort'){sort=el.value;renderDesk();}
  if(el.id==='room-filter'){room=el.value;renderUpgrades();}
  if(el.id==='category-filter'){category=el.value;renderInventory();}
  if(el.id==='owned-only'){ownedOnly=el.checked;renderInventory();}
 });
 $('#desk-search').addEventListener('input',event=>{deskSearch=event.target.value;renderDesk();});
 $('#inventory-search').addEventListener('input',event=>{inventorySearch=event.target.value;renderInventory();});
 document.addEventListener('submit',event=>{
  if(event.target.id!=='profile-form')return;event.preventDefault();const name=$('#profile-name').value.trim();if(!name){$('#profile-name').focus();return;}
  const id=event.target.dataset.profileId;if(id){const p=state.profiles.find(p=>p.id===id);p.name=name;p.faction=$('#profile-faction').value;p.mode=$('#profile-mode').value;}else{const p=C.newProfile(uid(),name,$('#profile-faction').value,$('#profile-mode').value);state.profiles.push(p);state.activeProfileId=p.id;}
  save();close();render();toast('Operator saved.');
 });
 $('#import-file').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{if(file.size>2000000)throw Error('Backup is too large. Choose a file under 2 MB.');const imported=C.validateImport(JSON.parse(await file.text()),D);if(state.profiles.length+imported.profiles.length>20)throw Error('Import would exceed 20 operator profiles. Export or remove unused profiles first.');pendingImport=imported;modal(`<div class="modal-body">${header('Import progress')}<p class="modal-copy">Add ${imported.profiles.length} operator${imported.profiles.length===1?'':'s'} from this backup as new copies? Your current progress will be preserved.</p><ul>${imported.profiles.map(p=>`<li>${esc(p.name)} · ${esc(p.mode)}</li>`).join('')}</ul><div class="modal-actions"><button class="button secondary" data-close-modal>Cancel</button><button class="button" data-confirm-import>Add imported operators</button></div></div>`);}catch(e){backups();$('#import-error').textContent=e instanceof SyntaxError?'This file is not valid JSON. Choose a HIDEOUT backup.':e.message;}
 });
 window.addEventListener('storage',event=>{if(event.key!==activeKey||!event.newValue)return;try{const next=C.validateImport(JSON.parse(event.newValue),D);state=next;close();render();toast('Progress updated from another tab.');window.dispatchEvent(new CustomEvent('hideout:changed',{detail:{key:activeKey}}));}catch{toast('Could not load a change from another tab. Your current session is unchanged.');}});
 document.addEventListener('keydown',event=>{if(['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName)||$('#modal').open)return;if(event.key==='/'&&view!=='sources'&&view!=='upgrades'){event.preventDefault();$(view==='inventory'?'#inventory-search':'#desk-search').focus();}if((event.ctrlKey||event.metaKey)&&event.key==='z'){event.preventDefault();doUndo();}});
 $('#room-filter').insertAdjacentHTML('beforeend',rooms.map(r=>`<option>${esc(r)}</option>`).join(''));
 $('#category-filter').insertAdjacentHTML('beforeend',categories.map(c=>`<option value="${esc(c)}">${esc(c.charAt(0).toUpperCase()+c.slice(1))}</option>`).join(''));
 if(initial&&!recovery)save();
 if(!storageAvailable){$('#storage-warning').hidden=false;$('#storage-warning').textContent='Browser storage is unavailable. Export a backup before closing this page.';$('#save-status').textContent='Unable to save';$('#save-status').classList.add('failed');}
 window.HideoutApp={
  guestKey:KEY, getKey:()=>activeKey, getState:()=>C.clone(state), clean:raw=>C.validateImport(raw,D),
  guest:()=>{try{return C.validateImport(JSON.parse(localStorage.getItem(KEY)),D);}catch{return C.newState(uid());}},
  blank:()=>C.newState(uid()),
  switchWorkspace(key){
   activeKey=key;state=null;recovery=null;
   try{
    const raw=localStorage.getItem(key);recovery=localStorage.getItem(key+':recovery');
    if(raw){try{state=C.validateImport(JSON.parse(raw),D);}catch{recovery=raw;localStorage.setItem(key+':recovery',raw);toast('This workspace could not be read. Download its recovery copy from Backups.');}}
   }catch{toast('Local storage is unavailable. Export a backup before closing.');}
   if(!state)state=C.newState(uid());
   selected='wood';close();render();$('#save-status').textContent=key===KEY?'Guest · saved here':'Account · saved here';
  },
  apply(raw){state=C.validateImport(raw,D);save(false);close();render();},
  setCatalogue(next){
   C.validateImport(state,next);D=next;itemById.clear();stationById.clear();
   D.items.forEach(i=>itemById.set(i.id,i));D.stations.forEach(s=>stationById.set(s.id,s));
   categories=[...new Set(D.items.map(i=>i.category))];rooms=[...new Set(D.stations.map(s=>s.room))];
   if(!categories.includes(category))category='all';if(!rooms.includes(room))room='all';
   $('#room-filter').innerHTML='<option value="all">All rooms</option>'+rooms.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('');$('#room-filter').value=room;
   $('#category-filter').innerHTML='<option value="all">All categories</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');$('#category-filter').value=category;
   render();
  },
  download, toast
 };
 document.addEventListener('error',event=>{const img=event.target;if(img.tagName==='IMG'&&img.classList.contains('item-icon')&&!img.dataset.fallback){img.dataset.fallback='1';img.src='icon.svg';}},true);
 render();
})();
