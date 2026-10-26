'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {randomBytes,timingSafeEqual}=require('node:crypto');
const DEFAULT_PORT=47836;
function createOverlayServer({uiRoot,port=DEFAULT_PORT,token=randomBytes(32).toString('hex'),getSnapshot}){
 if(!/^[a-f0-9]{64}$/.test(token))throw Error('Invalid overlay key.');
 let server=null,starting=null;
 const status=()=>({enabled:!!server?.listening,url:server?.listening?`http://127.0.0.1:${server.address().port}/overlay.html?token=${token}`:null});
 const validToken=input=>typeof input==='string'&&/^[a-f0-9]{64}$/.test(input)&&timingSafeEqual(Buffer.from(input),Buffer.from(token));
 async function handle(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  const fail=(code,message)=>{res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8'});res.end(message);};
  const expected=`127.0.0.1:${server?.address()?.port}`;
  if(req.headers.host!==expected||req.socket.remoteAddress!=='127.0.0.1')return fail(403,'Local overlay only.');
  if(req.method!=='GET')return fail(405,'Read-only overlay.');
  if(req.headers.origin&&req.headers.origin!==`http://${expected}`)return fail(403,'Origin not allowed.');
  if(req.headers['sec-fetch-site']==='cross-site')return fail(403,'Origin not allowed.');
  let url;try{url=new URL(req.url,`http://${expected}`);}catch{return fail(400,'Invalid request.');}
  if(url.pathname==='/overlay.html'||url.pathname==='/snapshot'){
   if(!validToken(url.searchParams.get('token')))return fail(403,'Open Stream & floating list in the tracker and copy your OBS link again.');
   if(url.pathname==='/snapshot'){
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});return res.end(JSON.stringify(getSnapshot()));
   }
  }
  const fixed=new Map([['/overlay.html','text/html; charset=utf-8'],['/overlay-view.js','text/javascript; charset=utf-8'],['/overlay-render.js','text/javascript; charset=utf-8'],['/overlay.css','text/css; charset=utf-8'],['/overlay-model.js','text/javascript; charset=utf-8'],['/icon.svg','image/svg+xml']]);
  let type=fixed.get(url.pathname);
  if(/^\/assets\/items\/[a-z0-9][a-z0-9-]{0,79}\.svg$/.test(url.pathname))type='image/svg+xml';
  if(/^\/assets\/fonts\/[a-zA-Z0-9_-]+\.woff2$/.test(url.pathname))type='font/woff2';
  if(!type)return fail(404,'Not found.');
  try{const bytes=await fs.promises.readFile(path.join(uiRoot,url.pathname.slice(1)));res.writeHead(200,{'Content-Type':type});res.end(bytes);}catch{fail(404,'Not found.');}
 }
 function start(){
  if(server?.listening)return Promise.resolve(status());if(starting)return starting;
  starting=new Promise((resolve,reject)=>{
   server=http.createServer((req,res)=>handle(req,res).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end('Overlay unavailable.');}));
   server.requestTimeout=5000;server.headersTimeout=5000;
   const failed=error=>{server=null;reject(new Error(error.code==='EADDRINUSE'?'The OBS connection is already in use. Close the other tracker copy and try again.':'Could not start the local OBS connection.'));};
   server.once('error',failed);
   server.listen(port,'127.0.0.1',()=>{server.removeListener('error',failed);server.on('error',()=>{});resolve(status());});
  }).finally(()=>{starting=null;});return starting;
 }
 async function stop(){if(starting)await starting.catch(()=>{});const active=server;server=null;if(active)await new Promise(resolve=>{active.close(resolve);active.closeAllConnections();});return status();}
 return {start,stop,status};
}
module.exports={createOverlayServer,DEFAULT_PORT};
