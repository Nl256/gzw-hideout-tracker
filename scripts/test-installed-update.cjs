const fs=require('node:fs'),fsp=fs.promises,path=require('node:path'),http=require('node:http'),{spawn}=require('node:child_process');
const {build,Platform,Arch}=require('../desktop/node_modules/electron-builder');
const project=path.resolve(__dirname,'..'),desktop=path.join(project,'desktop');
const root=path.join(project,'work','updater-smoke-'+Date.now()),installDir=path.join(root,'installed');
const run=(exe,args,options={})=>new Promise((resolve,reject)=>{const p=spawn(exe,args,{windowsHide:true,stdio:'inherit',...options});const timer=setTimeout(()=>{p.kill();reject(Error('Test installer timed out.'));},120000);p.once('error',error=>{clearTimeout(timer);reject(error);});p.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(Error(`Process exited with ${code}`));});});
(async()=>{
 if(process.platform!=='win32')throw Error('Installed updater test needs Windows.');
 await fsp.mkdir(root,{recursive:true});
 const served=path.join(root,'1.0.1');
 const server=http.createServer((req,res)=>{
  const filename=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).slice(1);
  if(!['latest.yml','update-smoke.exe','update-smoke.exe.blockmap'].includes(filename)){res.writeHead(404);res.end();return;}
  const file=path.join(served,filename);try{res.setHeader('Content-Length',fs.statSync(file).size);fs.createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const feed=`http://127.0.0.1:${server.address().port}/`;
  const appId='local.gzw.hideout.update-test.'+path.basename(root).split('-').at(-1);
  for(const version of ['1.0.0','1.0.1']){
   console.log(`Building isolated update-test version ${version}.`);
   await build({projectDir:desktop,targets:Platform.WINDOWS.createTarget('nsis',Arch.x64),publish:'never',config:{
    appId,productName:'GZWUpdateSmoke',executableName:'GZWUpdateSmoke',npmRebuild:false,
    extraMetadata:{name:'gzw-update-smoke',version,main:'tests/update-smoke-main.cjs',updateTestRoot:root},
    files:['tests/update-smoke-main.cjs','app/updates.cjs','package.json'],
    directories:{output:path.join(root,version)},
    ...(process.env.ELECTRON_TEST_DIST?{electronDist:process.env.ELECTRON_TEST_DIST}:{}),
    win:{target:[{target:'nsis',arch:['x64']}],artifactName:'update-smoke.exe'},
    nsis:{oneClick:true,perMachine:false,allowElevation:false,createDesktopShortcut:false,createStartMenuShortcut:false,runAfterFinish:true,deleteAppDataOnUninstall:false},
    publish:[{provider:'generic',url:feed}]
   }});
  }
  console.log('Installing isolated version 1.0.0 and updating internally to 1.0.1.');
  await run(path.join(root,'1.0.0','update-smoke.exe'),['/S','/D='+installDir]);
  const initialApp=spawn(path.join(installDir,'GZWUpdateSmoke.exe'),[],{windowsHide:true,stdio:'ignore'});initialApp.on('error',error=>fs.writeFileSync(path.join(root,'failed.txt'),String(error)));initialApp.unref();
  const deadline=Date.now()+120000;
  while(!fs.existsSync(path.join(root,'result.json'))){
   if(fs.existsSync(path.join(root,'failed.txt')))throw Error(fs.readFileSync(path.join(root,'failed.txt'),'utf8'));
   if(Date.now()>deadline)throw Error('Timed out waiting for installed update restart. See '+root);
   await new Promise(resolve=>setTimeout(resolve,500));
  }
  const result=JSON.parse(fs.readFileSync(path.join(root,'result.json'),'utf8'));
  if(result.version!=='1.0.1'||!result.restarted||result.saved?.guestWood!==7||result.saved?.accountDraft!==11)throw Error('Invalid installed update result.');
  await fsp.writeFile(path.join(project,'work','installed-update-result.json'),JSON.stringify({...result,root},null,2));
  console.log('PASS: downloaded, installed and reopened the newer app; guest progress and an account draft survived.');
 }finally{
  server.close();
  // Only the isolated test app is removed; keep test evidence and user-data fixtures.
  const uninstaller=path.resolve(installDir,'Uninstall GZWUpdateSmoke.exe');
  if(!uninstaller.startsWith(path.resolve(root)+path.sep))throw Error('Unsafe test cleanup target.');
  if(fs.existsSync(uninstaller))await run(uninstaller,['/S']);
 }
})().then(()=>process.exit(0),error=>{console.error(error);process.exit(1);});
