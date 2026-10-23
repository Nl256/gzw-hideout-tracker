'use strict';
const http=require('node:http');
const ORIGIN='https://iptkvqddczvrxuxqoeil.supabase.co';
const REDIRECT='http://127.0.0.1:47835/auth/callback';
function validAuthorize(value){
 try{const u=new URL(value),allowed=new Set(['provider','redirect_to','code_challenge','code_challenge_method','skip_http_redirect']);return [...u.searchParams.keys()].every(k=>allowed.has(k)&&u.searchParams.getAll(k).length===1)&&!u.hash&&u.origin===ORIGIN&&u.pathname==='/auth/v1/authorize'&&!u.username&&!u.password&&u.searchParams.get('provider')==='github'&&u.searchParams.get('redirect_to')===REDIRECT&&u.searchParams.get('code_challenge_method')==='s256'&&/^[A-Za-z0-9_-]{43}$/.test(u.searchParams.get('code_challenge'));}catch{return false;}
}
function createLogin({onResult,timeoutMs=300000,port=47835}){
 let server=null,timer=null,active=false,boundPort=port;
 const close=()=>{active=false;clearTimeout(timer);server?.close();server?.closeIdleConnections();server=null;};
 async function prepare(){
  close();
  server=http.createServer((req,res)=>{
   res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
   let u;try{if(req.url.length>4096)throw Error('Long callback');u=new URL(req.url,'http://127.0.0.1:'+boundPort);}catch{res.writeHead(400);res.end();return;}
   if(req.method!=='GET'||req.headers.host!=='127.0.0.1:'+boundPort||u.pathname!=='/auth/callback'||!active){res.writeHead(404);res.end();return;}
   const code=u.searchParams.get('code'),error=u.searchParams.get('error');
   if(!error&&(!code||!/^[A-Za-z0-9_-]{10,2048}$/.test(code))){res.writeHead(400);res.end('Invalid sign-in callback. Return to the tracker and try again.');return;}
   active=false;
   res.setHeader('Content-Type','text/html; charset=utf-8');
   res.end('<!doctype html><meta charset="utf-8"><title>GZW Hideout Tracker</title><style>body{background:#10140f;color:#e7e8dc;font:20px system-ui;max-width:600px;margin:15vh auto;padding:24px}h1{color:#c5df72}</style><h1>Return to your hideout.</h1><p>The tracker is finishing sign-in. You can close this browser tab.</p>');
   onResult(error?{error:'GitHub sign-in was cancelled or could not complete. Please try again.'}:{code,flowId:u.searchParams.get('sb_flow_id')||undefined});close();
  });
  await new Promise((resolve,reject)=>{server.once('error',()=>{close();reject(Error('The sign-in port is busy. Close another tracker sign-in window and try again.'));});server.listen(port,'127.0.0.1',resolve);});
  boundPort=server.address().port;
  active=true;timer=setTimeout(()=>{close();onResult({error:'Sign-in timed out. Please try again.'});},timeoutMs);timer.unref();
  return 'http://127.0.0.1:'+boundPort+'/auth/callback';
 }
 return {prepare,close,isActive:()=>active};
}
module.exports={createLogin,validAuthorize,REDIRECT,ORIGIN};
