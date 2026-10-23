const test=require('node:test'),assert=require('node:assert/strict');
const {createLogin,validAuthorize,ORIGIN,REDIRECT}=require('../app/oauth.cjs');
const authorize=()=>{const u=new URL(ORIGIN+'/auth/v1/authorize');u.search=new URLSearchParams({provider:'github',redirect_to:REDIRECT,code_challenge_method:'s256',code_challenge:'a'.repeat(43)});return u;};
test('only this project GitHub PKCE flow can open in the system browser',()=>{
 assert.equal(validAuthorize(authorize()),true);
 for(const change of [u=>u.hostname='evil.test',u=>u.username='attacker',u=>u.pathname='/untrusted',u=>u.searchParams.set('redirect_to','https://evil.test'),u=>u.searchParams.set('provider','google'),u=>u.searchParams.delete('code_challenge'),u=>u.searchParams.set('scopes','repo'),u=>u.searchParams.append('provider','google')]){const u=authorize();change(u);assert.equal(validAuthorize(u),false);}
});
test('loopback accepts one callback, ignores invalid routes and never reflects the auth code',async()=>{
 let result;const login=createLogin({onResult:r=>result=r,port:0});const url=await login.prepare();
 try{
  assert.equal((await fetch(url.replace('/auth/callback','/wrong')+'?code=0123456789')).status,404);assert.equal(result,undefined);
  assert.equal((await fetch(url+'?code=short')).status,400);assert.equal(login.isActive(),true);
  const response=await fetch(url+'?code=0123456789-abcdef');assert.equal(response.status,200);assert.equal((await response.text()).includes('0123456789-abcdef'),false);
  assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(result.code,'0123456789-abcdef');assert.equal(login.isActive(),false);
 }finally{login.close();}
});
test('cancellation and timeouts leave no active listener',async()=>{
 let result;const login=createLogin({onResult:r=>result=r,port:0,timeoutMs:20});await login.prepare();await new Promise(r=>setTimeout(r,50));assert.equal(login.isActive(),false);assert.match(result.error,/timed out/);await login.prepare();login.close();assert.equal(login.isActive(),false);
});
