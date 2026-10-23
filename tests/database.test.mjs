import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('database isolates accounts and rejects stale or anonymous writes',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create schema auth; grant usage on schema auth to anon,authenticated; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
  await db.exec(await readFile(new URL('../supabase/migrations/202610220001_progress.sql',import.meta.url),'utf8'));
  const alice='00000000-0000-4000-8000-000000000001',bob='00000000-0000-4000-8000-000000000002';
  await db.query('insert into auth.users(id) values($1),($2)',[alice,bob]);
  async function asUser(id,query,params=[],role='authenticated'){
   await db.exec(`begin; set local role ${role};`);
   try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id||'']);const result=await db.query(query,params);await db.exec('commit');return result;}catch(e){await db.exec('rollback');throw e;}
  }
  const payload={schemaVersion:1,profiles:[{id:'one'}]};
  assert.equal((await asUser(alice,'select * from public.save_hideout_progress($1,0)',[payload])).rows[0].revision,1);
  assert.equal((await asUser(bob,'select * from public.hideout_progress')).rows.length,0);
  assert.equal((await asUser(alice,'select * from public.hideout_progress')).rows.length,1);
  await assert.rejects(asUser(bob,'update public.hideout_progress set revision=99'),/permission denied/);
  await assert.rejects(asUser(bob,'insert into public.hideout_progress(user_id,payload) values($1,$2)',[alice,payload]),/permission denied/);
  await assert.rejects(asUser(null,'select * from public.save_hideout_progress($1,0)',[payload],'anon'),/permission denied/);
  await assert.rejects(asUser(alice,'select * from public.save_hideout_progress($1,0)',[payload]),/changed on another device/);
  assert.equal((await asUser(alice,'select * from public.save_hideout_progress($1,1)',[payload])).rows[0].revision,2);
  await assert.rejects(asUser(alice,'select * from public.save_hideout_progress($1,1)',[payload]),/changed on another device/);
  await assert.rejects(asUser(bob,'select * from public.save_hideout_progress($1,0)',[{schemaVersion:99,profiles:[]}]),/Invalid save payload/);
  assert.equal((await asUser(bob,'select * from public.save_hideout_progress($1,0)',[payload])).rows[0].revision,1);
  assert.equal((await asUser(alice,'select * from public.hideout_progress')).rows.length,1);
 }finally{await db.close();}
});
