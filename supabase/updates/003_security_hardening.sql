-- Update 003: security hardening (OWASP review, 29 Oct 2026).
-- Run once in Supabase > SQL Editor (dropdown next to Run must say Primary database). Safe to re-run.
-- No portal data is changed or deleted.
--
-- 1. Tighter database permissions: the signed-out (anon) role gets nothing, and nobody
--    signed in can TRUNCATE tables (TRUNCATE ignores row-level security).
-- 2. Profiles: full profiles (phone, start date, summary...) are visible only to the person,
--    their line manager, seniors and the bid team. Everyone else sees name, job title and
--    department only, through get_all_lookups(), which the line-manager picker needs.
-- 3. Users can't change the email shown on their profile; client "created_by" can't be faked.
-- 4. Audit log: every insert, update and delete on personal data is recorded (who, when,
--    before and after). Only seniors can read it; nobody can edit or delete it from the portal.

-- ---------------------------------------------------------------------
-- 1. Permissions
-- ---------------------------------------------------------------------
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon, public;
grant  execute on all functions in schema public to authenticated, service_role;
revoke truncate, references, trigger on all tables in schema public from authenticated;

alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public revoke execute on functions from public;

-- ---------------------------------------------------------------------
-- 2. Profile visibility
-- ---------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (public.can_view_staff(id));

-- Directory (names, job titles, departments, line managers) for every signed-in user.
create or replace function public.get_all_lookups() returns json
language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else json_build_object(
    'lists', coalesce((
      select json_object_agg(list_key, items) from (
        select list_key, json_agg(label order by sort_order, label) as items
        from public.lookup_values where active group by list_key
      ) s), '{}'::json),
    'clients', coalesce((
      select json_agg(json_build_object('id', id, 'name', name, 'client_type', client_type) order by name)
      from public.clients), '[]'::json),
    'categories', coalesce((
      select json_agg(json_build_object('id', id, 'name', name, 'description', description, 'is_bsa', is_bsa) order by sort_order)
      from public.competency_categories), '[]'::json),
    'people', coalesce((
      select json_agg(json_build_object('id', id, 'full_name', full_name, 'job_title', job_title,
                                        'department', department, 'line_manager_id', line_manager_id) order by full_name)
      from public.profiles), '[]'::json)
  ) end
$$;
revoke execute on function public.get_all_lookups() from anon, public;
grant  execute on function public.get_all_lookups() to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. Locked fields
-- ---------------------------------------------------------------------
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if new.role is distinct from old.role then
      raise exception 'Role can only be changed by an administrator';
    end if;
    new.id    := old.id;
    new.email := old.email;   -- comes from the sign-up account, not editable
  end if;
  new.updated_at := now();
  return new;
end $$;

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients for insert to authenticated
  with check (created_by = auth.uid());

-- ---------------------------------------------------------------------
-- 4. Audit log
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       uuid,          -- null = change made in the SQL / table editor
  table_name  text not null,
  row_id      text,
  action      text not null, -- INSERT, UPDATE, DELETE
  old_data    jsonb,
  new_data    jsonb
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);
create index if not exists audit_log_row_idx on public.audit_log (table_name, row_id);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select to authenticated using (public.is_senior());

create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
begin
  insert into public.audit_log (actor, table_name, row_id, action, old_data, new_data)
  values (auth.uid(), tg_table_name, coalesce(n->>'id', o->>'id'), tg_op, o, n);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','qualifications','client_experience','staff_experience',
                           'gateway_experience','competency_assessments','clients'] loop
    execute format('drop trigger if exists %1$s_audit on public.%1$s', t);
    execute format('create trigger %1$s_audit after insert or update or delete on public.%1$s
                    for each row execute function public.audit_row()', t);
  end loop;
end $$;

revoke execute on function public.audit_row() from anon, public, authenticated;

-- Retention: to clear entries older than two years, run
--   delete from public.audit_log where at < now() - interval '2 years';
