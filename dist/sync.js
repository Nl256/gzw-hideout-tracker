(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HideoutSync=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function canonical(value){
  function sort(x){if(Array.isArray(x))return x.map(sort);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).filter(k=>k!=='history'&&k!=='updatedAt').sort().map(k=>[k,sort(x[k])]));return x;}
  return JSON.stringify(sort(value));
 }
 function decision(local,base,remote,exists=true){
  if(!exists)return 'download';
  if(local===remote)return 'same';
  if(local===base)return 'download';
  if(remote===base)return 'upload';
  return 'conflict';
 }
 class Engine{
  constructor(options){this.o=options;this.meta=options.readMeta()||{base:null,revision:0,enabled:false};this.alive=true;this.running=null;this.conflict=null;this.status='connecting';}
  emit(status){if(!this.alive)return;this.status=status;this.o.status(status);}
  stop(){this.alive=false;}
  async flush(){
   for(let attempt=0;attempt<3&&this.alive;attempt++){
    await this.sync();
    if(['offline','conflict','changed','new'].includes(this.status))return false;
    if(canonical(this.o.get())===this.meta.base)return true;
   }
   return false;
  }
  remember(payload,revision){this.meta={base:canonical(payload),revision,enabled:true};this.o.writeMeta(this.meta);}
  async sync(){
   if(!this.alive)return;
   if(this.running){this.again=true;return this.running;}
   this.running=this.run().catch(error=>{if(this.alive){this.error=error;this.emit(error.code==='40001'?'changed':'offline');}}).finally(()=>{this.running=null;if(this.again&&this.alive){this.again=false;queueMicrotask(()=>this.sync());}});
   return this.running;
  }
  async run(){
   this.emit('syncing');
   const row=await this.o.remote.read();if(!this.alive)return;
   const local=this.o.clean(this.o.get()),localText=canonical(local);
   if(!row){
    if(!this.meta.enabled){this.emit('new');return;}
    if(this.meta.revision>0){this.conflict={payload:null,revision:0};this.emit('conflict');return;}
    return this.upload(local,0);
   }
   const remote=this.o.clean(row.payload),remoteText=canonical(remote);
   const action=decision(localText,this.meta.base,remoteText,this.o.exists());
   if(action==='download'){
    this.o.backup(local);this.o.apply(remote);this.remember(remote,row.revision);this.conflict=null;this.emit('synced');
   }else if(action==='same'){
    this.remember(remote,row.revision);this.conflict=null;this.emit('synced');
   }else if(action==='upload')await this.upload(local,row.revision);
   else{this.conflict={payload:remote,revision:row.revision};this.emit('conflict');}
  }
  async upload(payload,revision){
   const row=await this.o.remote.write(payload,revision);if(!this.alive)return;
   this.remember(payload,row.revision);this.conflict=null;
   if(canonical(this.o.get())!==canonical(payload)){this.again=true;this.emit('pending');}else this.emit('synced');
  }
  async start(payload){
   if(!this.alive||this.running)return;
   this.o.apply(this.o.clean(payload));this.meta.enabled=true;this.o.writeMeta(this.meta);return this.sync();
  }
  async resolve(choice){
   if(!this.alive||this.running||!this.conflict)return;
   const seen=this.conflict;this.emit('syncing');
   this.running=(async()=>{
    const latest=await this.o.remote.read();if(!this.alive)return;
    if((latest?.revision||0)!==seen.revision){this.conflict=latest?{payload:this.o.clean(latest.payload),revision:latest.revision}:{payload:null,revision:0};this.emit('conflict');return;}
    if(choice==='cloud'&&latest){
     this.o.backup(this.o.get());const clean=this.o.clean(latest.payload);this.o.apply(clean);this.remember(clean,latest.revision);this.conflict=null;this.emit('synced');
    }else if(choice==='device'){
     if(latest)this.o.backup(latest.payload);
     await this.upload(this.o.clean(this.o.get()),latest?.revision||0);
    }
   })().catch(e=>{this.error=e;this.emit(e.code==='40001'?'changed':'offline');}).finally(()=>{this.running=null;if(this.again&&this.alive){this.again=false;queueMicrotask(()=>this.sync());}});
   return this.running;
  }
 }
 return {canonical,decision,Engine};
});
