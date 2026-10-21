-- =====================================================================
-- Durkan Competency Portal: master database script
-- ---------------------------------------------------------------------
-- Run the WHOLE file in Supabase > SQL Editor > New query > Run.
-- It wipes the public schema and rebuilds everything from scratch,
-- so it is safe to re-run, but ALL portal data is deleted each time.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Wipe
-- ---------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop schema if exists public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables    to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  full_name        text,
  job_title        text,
  department       text,
  office           text,
  phone            text,
  line_manager_id  uuid references public.profiles(id) on delete set null,
  start_date       date,
  years_in_industry int,
  summary          text,
  role             text not null default 'staff' check (role in ('staff','senior','bid_team')),
  confirmed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint not_own_manager check (line_manager_id is null or line_manager_id <> id)
);

-- All tick-box lists live in one table, keyed by list_key.
create table public.lookup_values (
  id          bigint generated always as identity primary key,
  list_key    text not null,
  label       text not null,
  sort_order  int  not null default 0,
  active      boolean not null default true,
  unique (list_key, label)
);

create table public.clients (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  client_type text,
  created_by  uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

create table public.qualifications (
  id             bigint generated always as identity primary key,
  staff_id       uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  qual_type      text,
  title          text not null,
  body           text,
  grade          text,
  year_obtained  int,
  expiry_date    date,
  reference      text,
  created_at     timestamptz not null default now()
);

create table public.client_experience (
  id         bigint generated always as identity primary key,
  staff_id   uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  client_id  bigint not null references public.clients(id) on delete cascade,
  years      numeric(4,1),
  notes      text,
  created_at timestamptz not null default now(),
  unique (staff_id, client_id)
);

create table public.staff_experience (
  id              bigint generated always as identity primary key,
  staff_id        uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  project_name    text not null,
  client_id       bigint references public.clients(id) on delete set null,
  location        text,
  sector          text,
  building_type   text,
  work_types      text[] not null default '{}',
  contract_form   text,
  procurement     text,
  project_role    text,
  value_band      text,
  start_year      int,
  end_year        int,
  is_hrb          boolean not null default false,
  storeys         int,
  occupied        boolean not null default false,
  description     text,
  created_at      timestamptz not null default now()
);

create table public.gateway_experience (
  id               bigint generated always as identity primary key,
  staff_id         uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  project_name     text not null,
  client_id        bigint references public.clients(id) on delete set null,
  stage            text not null,
  dutyholder_role  text,
  height_band      text,
  outcome          text,
  submitted_on     date,
  description      text,
  created_at       timestamptz not null default now()
);

create table public.competency_categories (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  description text,
  is_bsa      boolean not null default false,
  sort_order  int not null default 0
);

create table public.competency_assessments (
  id               bigint generated always as identity primary key,
  staff_id         uuid not null references public.profiles(id) on delete cascade,
  category_id      bigint not null references public.competency_categories(id) on delete cascade,
  self_rating      int check (self_rating between 0 and 5),
  self_evidence    text,
  self_updated_at  timestamptz,
  manager_rating   int check (manager_rating between 0 and 5),
  manager_comment  text,
  reviewed_by      uuid references public.profiles(id) on delete set null,
  reviewed_at      timestamptz,
  unique (staff_id, category_id)
);

create index on public.staff_experience (staff_id);
create index on public.qualifications (staff_id);
create index on public.client_experience (staff_id);
create index on public.gateway_experience (staff_id);
create index on public.competency_assessments (staff_id);
create index on public.profiles (line_manager_id);

-- ---------------------------------------------------------------------
-- 2. Helper functions (security definer so RLS policies don't recurse)
-- ---------------------------------------------------------------------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_senior() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'senior' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.can_search() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('senior','bid_team') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.manages(staff uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = staff and line_manager_id = auth.uid())
$$;

create or replace function public.can_view_staff(staff uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select staff = auth.uid() or public.can_search() or public.manages(staff)
$$;

-- ---------------------------------------------------------------------
-- 3. Triggers
-- ---------------------------------------------------------------------
-- New sign-up -> profile row
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Staff can't promote themselves. Role changes only via the table editor / SQL editor.
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    raise exception 'Role can only be changed by an administrator';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile();

-- Competency rows: the person edits their own self-assessment only;
-- a reviewer (line manager or senior, never the person themself) edits the review fields only.
create or replace function public.guard_assessment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;  -- SQL editor / service role
  end if;

  if auth.uid() = new.staff_id then
    if tg_op = 'INSERT' then
      new.manager_rating := null; new.manager_comment := null;
      new.reviewed_by := null;    new.reviewed_at := null;
    else
      new.manager_rating := old.manager_rating; new.manager_comment := old.manager_comment;
      new.reviewed_by := old.reviewed_by;       new.reviewed_at := old.reviewed_at;
    end if;
    new.self_updated_at := now();
  else
    if not (public.manages(new.staff_id) or public.is_senior()) then
      raise exception 'Only the line manager or a senior can review this';
    end if;
    if tg_op = 'INSERT' then
      new.self_rating := null; new.self_evidence := null; new.self_updated_at := null;
    else
      new.self_rating := old.self_rating; new.self_evidence := old.self_evidence;
      new.self_updated_at := old.self_updated_at;
    end if;
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end $$;

create trigger assessments_guard
  before insert or update on public.competency_assessments
  for each row execute function public.guard_assessment();

-- ---------------------------------------------------------------------
-- 4. Row-level security
-- ---------------------------------------------------------------------
alter table public.profiles               enable row level security;
alter table public.lookup_values          enable row level security;
alter table public.clients                enable row level security;
alter table public.qualifications         enable row level security;
alter table public.client_experience      enable row level security;
alter table public.staff_experience       enable row level security;
alter table public.gateway_experience     enable row level security;
alter table public.competency_categories  enable row level security;
alter table public.competency_assessments enable row level security;

-- Profiles: everyone signed in can see names (needed to pick a line manager); you edit only your own.
create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Reference data
create policy lookups_select on public.lookup_values for select to authenticated using (true);
create policy categories_select on public.competency_categories for select to authenticated using (true);
create policy clients_select on public.clients for select to authenticated using (true);
create policy clients_insert on public.clients for insert to authenticated with check (true);

-- Personal evidence tables: you, your line manager, seniors and the bid team can read; only you can write.
do $$
declare t text;
begin
  foreach t in array array['qualifications','client_experience','staff_experience','gateway_experience'] loop
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (public.can_view_staff(staff_id))', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (staff_id = auth.uid())', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using (staff_id = auth.uid()) with check (staff_id = auth.uid())', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using (staff_id = auth.uid())', t);
  end loop;
end $$;

-- Competencies
create policy assess_select on public.competency_assessments for select to authenticated
  using (public.can_view_staff(staff_id));
create policy assess_insert on public.competency_assessments for insert to authenticated
  with check (staff_id = auth.uid()
              or (staff_id <> auth.uid() and (public.manages(staff_id) or public.is_senior())));
create policy assess_update on public.competency_assessments for update to authenticated
  using (staff_id = auth.uid()
         or (staff_id <> auth.uid() and (public.manages(staff_id) or public.is_senior())))
  with check (staff_id = auth.uid()
         or (staff_id <> auth.uid() and (public.manages(staff_id) or public.is_senior())));

-- ---------------------------------------------------------------------
-- 5. View for the dashboard
-- ---------------------------------------------------------------------
create view public.staff_overview with (security_invoker = on) as
select
  p.id, p.full_name, p.email, p.job_title, p.department, p.office, p.role,
  p.line_manager_id, m.full_name as line_manager_name, p.confirmed_at, p.updated_at,
  (select count(*) from public.qualifications q where q.staff_id = p.id)                         as qualifications,
  (select count(*) from public.client_experience c where c.staff_id = p.id)                      as clients,
  (select count(*) from public.staff_experience e where e.staff_id = p.id)                       as projects,
  (select count(*) from public.staff_experience e where e.staff_id = p.id and e.is_hrb)          as hrb_projects,
  (select count(*) from public.gateway_experience g where g.staff_id = p.id)                     as gateway_entries,
  (select count(*) from public.competency_assessments a where a.staff_id = p.id and a.self_rating > 0)       as competencies_rated,
  (select count(*) from public.competency_assessments a where a.staff_id = p.id and a.reviewed_at is not null) as competencies_reviewed
from public.profiles p
left join public.profiles m on m.id = p.line_manager_id;

-- ---------------------------------------------------------------------
-- 6. One-call lookup loader (avoids many round trips / 504s)
-- ---------------------------------------------------------------------
create or replace function public.get_all_lookups() returns json
language sql stable security invoker set search_path = public as $$
  select json_build_object(
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
  )
$$;

-- ---------------------------------------------------------------------
-- 7. Seed data
-- ---------------------------------------------------------------------
insert into public.lookup_values (list_key, label, sort_order)
select k, v, ord from (values
  ('department', array['Regen','Refurbishment','New Build','Technical','Building Safety','Quality','Design Management','Commercial','Pre-construction & Bids','Health & Safety','Digital Delivery','Operations','Other']),
  ('office',     array['Head office','Regional office','Site-based','Hybrid']),
  ('qual_type',  array['Degree','Postgraduate degree','HNC / HND','NVQ / SVQ','Professional membership','Chartership','Health & safety (SMSTS, SSSTS, NEBOSH)','Fire safety','CSCS / skills card','Short course / CPD','Other']),
  ('professional_body', array['CIOB','RICS','ICE','IStructE','CIBSE','RIBA','CIAT','IFE','IOSH','APM','CABE','Other']),
  ('sector',     array['Social housing – occupied refurbishment','Social housing – new build','Private residential','Build to rent','Student accommodation','Care / extra care','Education','Healthcare','Mixed use','Commercial','Other']),
  ('building_type', array['High-rise residential (18m+ or 7+ storeys)','Mid-rise residential (11m–18m)','Low-rise residential (under 11m)','Houses','Mixed use','Non-residential','Other']),
  ('work_type',  array['Fire safety remediation','Cladding / external wall remediation','Fire stopping & compartmentation','Window & door replacement','Roofing','Internal refurbishment / Decent Homes','Energy retrofit / decarbonisation','M&E upgrades','Structural works','New build','Estate regeneration','Planned maintenance','Other']),
  ('contract_form', array['JCT Design & Build','JCT Standard Building Contract','JCT Intermediate','NEC3 / NEC4 ECC','NEC Term Service','PPC2000 / TAC-1 / FAC-1','Framework call-off','Other']),
  ('procurement', array['Single-stage tender','Two-stage tender','Framework – direct award','Framework – mini-competition','Negotiated','Partnering','Other']),
  ('project_role', array['Project Director','Project Manager','Contracts Manager','Site Manager','Assistant Site Manager','Design Manager','Technical Manager','Quality Manager','Building Safety Manager','Commercial Manager / QS','Resident Liaison Officer','Bid Manager','Estimator','Health & Safety Advisor','Other']),
  ('value_band', array['Under £1m','£1m–£5m','£5m–£10m','£10m–£25m','£25m–£50m','£50m+']),
  ('dutyholder_role', array['Principal Contractor','Principal Designer','Contractor','Designer','Client','Supporting the Accountable Person','Building Safety Manager']),
  ('gateway_stage', array['Gateway 1 – planning','Gateway 2 – building control approval','Gateway 3 – completion certificate','Major change control','Notifiable change','Golden thread & handover','Mandatory occurrence reporting']),
  ('gateway_outcome', array['Approved','Approved with requirements','Rejected and resubmitted','In progress','Withdrawn']),
  ('height_band', array['Under 11m','11m–18m','18m+ (HRB)','30m+ (HRB)']),
  ('client_type', array['Local authority','Housing association','Private landlord','Developer','Education','Health','Other'])
) as t(k, labels)
cross join lateral unnest(labels) with ordinality as u(v, ord);

insert into public.competency_categories (name, description, is_bsa, sort_order) values
  ('Building Safety Act & the HRB regime', 'You understand the Building Safety Act 2022, the higher-risk building regime and how dutyholder duties apply to the work you do.', true, 1),
  ('Gateways & Building Safety Regulator engagement', 'You can prepare, contribute to or manage Gateway 2 and Gateway 3 applications and respond to Regulator queries.', true, 2),
  ('Fire safety & compartmentation', 'You understand fire strategies, compartmentation, fire stopping and how to inspect and evidence them.', true, 3),
  ('Golden thread & information management', 'You keep accurate, accessible building information and know what the golden thread needs to contain.', true, 4),
  ('Change control & occurrence reporting', 'You recognise major and notifiable changes, follow change control and know when and how to report mandatory occurrences.', true, 5),
  ('Principal Contractor duties (CDM & BSA)', 'You understand and carry out Principal Contractor duties under both CDM 2015 and the Building Regulations dutyholder regime.', true, 6),
  ('Building Regulations & technical standards', 'You apply the Approved Documents, British Standards and manufacturer guidance correctly to your work.', false, 7),
  ('Design management & coordination', 'You manage design information, coordinate designers and make sure what is built matches what was approved.', false, 8),
  ('Quality management & inspection', 'You plan and carry out inspections, test plans and record evidence that work is right first time.', false, 9),
  ('Health & safety', 'You plan and manage work safely, including RAMS, temporary works and supervision.', false, 10),
  ('Resident engagement & occupied works', 'You plan and deliver work in occupied homes with care, clear communication and respect for residents.', false, 11),
  ('Commercial & contract management', 'You understand the contract, manage change and protect the commercial position.', false, 12),
  ('Programme & project delivery', 'You plan, sequence and deliver work to programme, managing risk and subcontractors.', false, 13),
  ('Sustainability & retrofit', 'You understand energy retrofit, PAS 2035 and low-carbon approaches.', false, 14),
  ('Digital delivery (CDE & BIM)', 'You use the common data environment and digital tools to manage and share information.', false, 15),
  ('Leadership & people', 'You lead, coach and develop others and build effective teams.', false, 16);

-- Backfill profiles for anyone already in auth.users (only matters if you didn't start a new Supabase project)
insert into public.profiles (id, email, full_name)
select id, email, coalesce(raw_user_meta_data->>'full_name', split_part(email,'@',1)) from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 8. Grants (needed after a schema wipe)
-- ---------------------------------------------------------------------
grant all on all tables    in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
grant all on all functions in schema public to postgres, anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 9. After you've signed up in the portal, make yourself senior:
--    update public.profiles set role = 'senior' where email = 'you@durkan.co.uk';
-- ---------------------------------------------------------------------
