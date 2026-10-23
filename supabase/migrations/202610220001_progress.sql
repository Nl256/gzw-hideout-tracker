-- One private save per account. Guests never write to the database.
create table public.hideout_progress (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 1000000),
 revision bigint not null default 1 check (revision > 0),
 updated_at timestamptz not null default now()
);
alter table public.hideout_progress enable row level security;
revoke all on public.hideout_progress from anon, authenticated;
grant select on public.hideout_progress to authenticated;
create policy "Read own hideout progress" on public.hideout_progress for select to authenticated
 using ((select auth.uid()) = user_id);

-- Compare-and-swap prevents stale browsers from silently replacing newer saves.
-- No caller-supplied user ID: ownership always comes from the verified session.
create function public.save_hideout_progress(p_payload jsonb, p_expected_revision bigint)
returns table(revision bigint, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_revision bigint; v_updated timestamptz;
begin
 if v_user is null then raise exception 'Sign in required' using errcode = '42501'; end if;
 if p_expected_revision is null or p_expected_revision < 0 then raise exception 'Invalid revision' using errcode = '22023'; end if;
 if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 1000000
    or (p_payload->>'schemaVersion') is distinct from '1'
    or jsonb_typeof(p_payload->'profiles') is distinct from 'array' then
  raise exception 'Invalid save payload' using errcode = '22023';
 end if;
 if jsonb_array_length(p_payload->'profiles') not between 1 and 20 then raise exception 'Invalid operator count' using errcode = '22023'; end if;
 if p_expected_revision = 0 then
  insert into public.hideout_progress(user_id,payload) values(v_user,p_payload)
   on conflict(user_id) do nothing
   returning hideout_progress.revision,hideout_progress.updated_at into v_revision,v_updated;
 else
  update public.hideout_progress as p set payload=p_payload,revision=p.revision+1,updated_at=now()
   where p.user_id=v_user and p.revision=p_expected_revision
   returning p.revision,p.updated_at into v_revision,v_updated;
 end if;
 if v_revision is null then raise exception 'Cloud save changed on another device' using errcode = '40001'; end if;
 return query select v_revision,v_updated;
end;
$$;
revoke all on function public.save_hideout_progress(jsonb,bigint) from public,anon,authenticated;
grant execute on function public.save_hideout_progress(jsonb,bigint) to authenticated;
