-- Durkan Competency Register — COMPLETE schema
-- Run this ONCE in a fresh Supabase project's SQL Editor. It creates
-- everything: tables, seed data, permissions, and the lookup function.

-- ============================================================
-- 0. BASE PRIVILEGES
-- Supabase normally sets these up automatically on a new project.
-- Included here so this script is safe to run even after a full
-- "drop schema public cascade" reset.
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('staff','senior','bid_team')),
  job_title text default '',
  department text default '',
  business_division text check (business_division in ('Group','Regen','Homes')),
  start_date date,
  cscs_card_type text,
  cscs_card_number text,
  cscs_expiry_date date,
  profile_confirmed_at timestamptz,
  line_manager_id uuid references profiles(id),
  currently_on_hrb boolean not null default false,
  current_hrb_project text default '',
  current_hrb_outline text default '',
  bsa_relevant boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. LOOKUP TABLES (all tick-box categories)
-- ============================================================
create table if not exists project_types (id serial primary key, name text unique not null, sort_order int not null default 0);
create table if not exists value_bands (id serial primary key, name text unique not null, sort_order int not null default 0);
create table if not exists build_types (id serial primary key, name text unique not null, sort_order int not null default 0);
create table if not exists client_types (id serial primary key, name text unique not null, sort_order int not null default 0);
create table if not exists procurement_types (id serial primary key, name text unique not null, sort_order int not null default 0);
create table if not exists contract_types (id serial primary key, name text unique not null, sort_order int not null default 0);
create table if not exists bim_types (id serial primary key, name text unique not null, sort_order int not null default 0);
create table if not exists frame_types (id serial primary key, name text unique not null, sort_order int not null default 0);
create table if not exists refurb_types (id serial primary key, name text unique not null, sort_order int not null default 0);
create table if not exists residential_types (id serial primary key, name text unique not null, sort_order int not null default 0);
create table if not exists scale_bands (id serial primary key, name text unique not null, sort_order int not null default 0);
create table if not exists constraint_types (id serial primary key, name text unique not null, sort_order int not null default 0);
create table if not exists accreditation_types (id serial primary key, name text unique not null, sort_order int not null default 0);
create table if not exists material_types (id serial primary key, name text unique not null, sort_order int not null default 0);
create table if not exists sustainability_types (id serial primary key, name text unique not null, sort_order int not null default 0);
create table if not exists mmc_types (id serial primary key, name text unique not null, sort_order int not null default 0);

create table if not exists clients (
  id serial primary key,
  name text unique not null,
  category text not null check (category in ('housing_association', 'local_authority')),
  sort_order int not null default 0
);

insert into project_types (name, sort_order) values
  ('Residential', 1), ('Education', 2), ('Healthcare', 3), ('Commercial / offices', 4),
  ('Retail', 5), ('Leisure', 6), ('Industrial / logistics', 7), ('Infrastructure', 8),
  ('Mixed-use', 9), ('Public sector', 10)
on conflict (name) do nothing;

insert into value_bands (name, sort_order) values
  ('Under £1m', 1), ('£1m - £5m', 2), ('£5m - £15m', 3), ('£15m - £50m', 4), ('£50m+', 5)
on conflict (name) do nothing;

insert into build_types (name, sort_order) values
  ('New build', 1), ('Refurbishment', 2), ('Fit-out', 3), ('Retrofit / energy upgrade', 4),
  ('Modular / MMC', 5), ('Heritage / listed building', 6),
  ('High-rise / HRB (new build)', 7), ('High-rise / HRB (regeneration)', 8)
on conflict (name) do nothing;

insert into client_types (name, sort_order) values
  ('Local authorities', 1), ('Housing associations', 2), ('Private clients', 3), ('Other public sector', 4)
on conflict (name) do nothing;

insert into procurement_types (name, sort_order) values
  ('Single-stage tender', 1), ('Negotiated', 2), ('PCSA', 3), ('Two-stage tender', 4)
on conflict (name) do nothing;

insert into contract_types (name, sort_order) values
  ('JCT', 1), ('NEC3', 2), ('NEC4', 3), ('Design & Build', 4),
  ('Traditional / lump sum', 5), ('Management contract', 6), ('Framework', 7)
on conflict (name) do nothing;

insert into bim_types (name, sort_order) values
  ('ISO 19650', 1), ('BIM Level 2', 2), ('Common data environment (CDE)', 3),
  ('BIM authoring (Revit, Navisworks etc.)', 4), ('Digital twin / Level 3 BIM', 5)
on conflict (name) do nothing;

insert into frame_types (name, sort_order) values
  ('Concrete frame', 1), ('Pre-cast columns / walls', 2), ('Slip / jump cores', 3), ('Post-tensioned concrete', 4),
  ('Timber frame', 5), ('Steel frame', 6), ('Light gauge frame', 7), ('Traditional', 8),
  ('Volumetric modular', 9), ('CLT', 10)
on conflict (name) do nothing;

insert into refurb_types (name, sort_order) values
  ('Planned maintenance (internals)', 1), ('Planned maintenance (externals)', 2),
  ('Cladding refurbishment / renewal / replacement', 3), ('M&E refurbishment', 4), ('Concrete repairs', 5),
  ('Fire remedials (fire stopping, doors etc.)', 6), ('Reactive maintenance', 7), ('Retrofit (EWI etc.)', 8)
on conflict (name) do nothing;

insert into residential_types (name, sort_order) values
  ('Housing', 1), ('PRS / BTR', 2), ('Shared ownership', 3), ('Affordable', 4), ('Wheelchair', 5),
  ('Care home', 6), ('Extra care', 7), ('Refurbishment', 8), ('Library', 9)
on conflict (name) do nothing;

insert into scale_bands (name, sort_order) values
  ('0-50 units', 1), ('50-100 units', 2), ('100-150 units', 3), ('150-250 units', 4), ('250+ units', 5)
on conflict (name) do nothing;

insert into constraint_types (name, sort_order) values
  ('Network Rail', 1), ('London Underground', 2), ('TfL', 3), ('Canal & River Trust', 4),
  ('Port of London Authority', 5), ('Environment Agency', 6), ('Historic England', 7), ('MOLAS', 8)
on conflict (name) do nothing;

insert into accreditation_types (name, sort_order) values
  ('NHBC', 1), ('LABC', 2), ('Premier Guarantee', 3), ('Home Quality Mark', 4),
  ('Secure by Design', 5), ('Building for Life', 6), ('Residents in Place', 7), ('Party Wall Awards', 8)
on conflict (name) do nothing;

insert into material_types (name, sort_order) values
  ('Panelised cladding', 1), ('Green roofs', 2), ('Brown roofs', 3), ('Blue roofs', 4)
on conflict (name) do nothing;

insert into sustainability_types (name, sort_order) values
  ('Code for Sustainable Homes Level 4', 1), ('Code for Sustainable Homes Level 5', 2), ('Code for Sustainable Homes Level 6', 3),
  ('PassivHaus', 4), ('MVHR / MEV', 5), ('Biomass boilers', 6), ('Air source heat pumps', 7), ('Ground source heat', 8),
  ('Solar thermal', 9), ('PV panels', 10), ('Gas boilers', 11), ('District heating', 12),
  ('BREEAM Good', 13), ('BREEAM Very Good', 14), ('BREEAM Excellent', 15), ('SBEM', 16), ('Retrofit / PAS2035', 17)
on conflict (name) do nothing;

insert into mmc_types (name, sort_order) values
  ('SIPS', 1), ('Bathroom pods', 2), ('Thin joint', 3), ('Utility pods', 4), ('Pre-fab plant rooms', 5)
on conflict (name) do nothing;

insert into clients (name, category, sort_order) values
  ('L&Q (London & Quadrant)', 'housing_association', 1),
  ('Peabody', 'housing_association', 2),
  ('Southern Housing', 'housing_association', 3),
  ('Clarion Housing Group', 'housing_association', 4),
  ('Notting Hill Genesis', 'housing_association', 5),
  ('Metropolitan Thames Valley (MTVH)', 'housing_association', 6),
  ('Sovereign Network Group', 'housing_association', 7),
  ('Hyde Group', 'housing_association', 8),
  ('A2Dominion', 'housing_association', 9),
  ('Network Homes', 'housing_association', 10),
  ('Riverside Group', 'housing_association', 11),
  ('Guinness Partnership', 'housing_association', 12),
  ('Home Group', 'housing_association', 13),
  ('Orbit Group', 'housing_association', 14),
  ('Paragon Asra Housing', 'housing_association', 15),
  ('Places for People', 'housing_association', 16),
  ('Sanctuary Housing', 'housing_association', 17),
  ('Origin Housing', 'housing_association', 18),
  ('Moat Homes', 'housing_association', 19),
  ('Vivid Homes', 'housing_association', 20),
  ('Radian', 'housing_association', 21),
  ('Abri Group', 'housing_association', 22),
  ('Watford Community Housing', 'housing_association', 23),
  ('Grand Union Housing Group', 'housing_association', 24)
on conflict (name) do nothing;

insert into clients (name, category, sort_order) values
  ('Barking and Dagenham', 'local_authority', 1),
  ('Barnet', 'local_authority', 2),
  ('Bexley', 'local_authority', 3),
  ('Brent', 'local_authority', 4),
  ('Bromley', 'local_authority', 5),
  ('Camden', 'local_authority', 6),
  ('City of London', 'local_authority', 7),
  ('Croydon', 'local_authority', 8),
  ('Ealing', 'local_authority', 9),
  ('Enfield', 'local_authority', 10),
  ('Greenwich', 'local_authority', 11),
  ('Hackney', 'local_authority', 12),
  ('Hammersmith and Fulham', 'local_authority', 13),
  ('Haringey', 'local_authority', 14),
  ('Harrow', 'local_authority', 15),
  ('Havering', 'local_authority', 16),
  ('Hillingdon', 'local_authority', 17),
  ('Hounslow', 'local_authority', 18),
  ('Islington', 'local_authority', 19),
  ('Kensington and Chelsea', 'local_authority', 20),
  ('Kingston upon Thames', 'local_authority', 21),
  ('Lambeth', 'local_authority', 22),
  ('Lewisham', 'local_authority', 23),
  ('Merton', 'local_authority', 24),
  ('Newham', 'local_authority', 25),
  ('Redbridge', 'local_authority', 26),
  ('Richmond upon Thames', 'local_authority', 27),
  ('Southwark', 'local_authority', 28),
  ('Sutton', 'local_authority', 29),
  ('Tower Hamlets', 'local_authority', 30),
  ('Waltham Forest', 'local_authority', 31),
  ('Wandsworth', 'local_authority', 32),
  ('Westminster', 'local_authority', 33)
on conflict (name) do nothing;

-- ============================================================
-- 3. STAFF EXPERIENCE (tick-box records) & QUALIFICATIONS
-- ============================================================
create table if not exists staff_experience (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles(id) on delete cascade,
  category text not null check (category in (
    'project_type','value_band','build_type','client_type','procurement_type','contract_type','bim_type',
    'frame_type','refurb_type','residential_type','scale_band','constraint_type','accreditation_type',
    'material_type','sustainability_type','mmc_type'
  )),
  item_id int not null,
  created_at timestamptz not null default now(),
  unique (staff_id, category, item_id)
);

create table if not exists qualifications (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  awarding_body text default '',
  date_obtained date,
  expiry_date date,
  certificate_ref text default '',
  qual_type text not null default 'academic' check (qual_type in ('academic', 'training', 'cpd')),
  created_at timestamptz not null default now()
);

create table if not exists client_experience (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles(id) on delete cascade,
  client_id int references clients(id),
  other_client_name text default '',
  project_name text not null default '',
  is_durkan_job boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists gateway_experience (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles(id) on delete cascade,
  project_name text not null default '',
  gateway_stage text not null default 'Gateway 2' check (gateway_stage in ('Gateway 2', 'Gateway 3', 'Gateway 2 & 3')),
  outline text default '',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4. BSA COMPETENCY CATEGORIES & ASSESSMENTS
-- ============================================================
create table if not exists competency_categories (
  id text primary key,
  name text not null,
  description text not null default '',
  sort_order int not null default 0
);

insert into competency_categories (id, name, description, sort_order) values
  ('TDC', 'Technical & discipline competence', 'Your practical, hands-on expertise in your own discipline — the day-to-day craft of your role, whether that''s running a site, coordinating a design, or controlling costs.', 1),
  ('BFS', 'Building & fire safety', 'Your understanding of how buildings stay safe once built and occupied — fire strategy, structural integrity, and how a building physically behaves — with particular weight on higher-risk buildings (tall or complex schemes).', 2),
  ('BSA', 'Legal & regulatory (Building Safety Act)', 'Your practical knowledge of the Building Safety Act 2022 — what it requires at each Gateway checkpoint, and how to keep the paper trail (the Golden Thread) that shows a building was designed and built safely.', 3),
  ('HSW', 'Health & safety', 'Your role in keeping people safe — whether that''s day-to-day site safety, CDM 2015 duties, or making sure the work you plan, design or oversee is delivered without unnecessary risk.', 4),
  ('BEH', 'Behavioural & ethical', 'How you work with others — communicating clearly, collaborating well, and feeling able to speak up if something looks wrong.', 5),
  ('MGT', 'Management & assurance', 'If you manage a team: how you make sure the people under you are genuinely competent for what they''re doing, and step in if they''re not. Mainly relevant to Principal Contractor/Designer-type duty holders.', 6)
on conflict (id) do nothing;

create table if not exists competency_assessments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles(id) on delete cascade,
  category_id text not null references competency_categories(id),
  level int not null default 0 check (level between 0 and 5),
  evidence text default '',
  status text not null default 'self_assessed' check (status in ('self_assessed','pending_verification','verified')),
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  last_assessed date,
  expiry_date date,
  updated_at timestamptz not null default now(),
  unique (staff_id, category_id)
);

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table staff_experience enable row level security;
alter table qualifications enable row level security;
alter table competency_assessments enable row level security;
alter table project_types enable row level security;
alter table value_bands enable row level security;
alter table build_types enable row level security;
alter table client_types enable row level security;
alter table procurement_types enable row level security;
alter table contract_types enable row level security;
alter table bim_types enable row level security;
alter table frame_types enable row level security;
alter table refurb_types enable row level security;
alter table residential_types enable row level security;
alter table scale_bands enable row level security;
alter table constraint_types enable row level security;
alter table accreditation_types enable row level security;
alter table material_types enable row level security;
alter table sustainability_types enable row level security;
alter table mmc_types enable row level security;
alter table clients enable row level security;
alter table client_experience enable row level security;
alter table gateway_experience enable row level security;
alter table competency_categories enable row level security;

drop policy if exists "lookups readable by all logged in users" on project_types;
create policy "lookups readable by all logged in users" on project_types for select using (auth.role() = 'authenticated');
drop policy if exists "lookups readable by all logged in users" on value_bands;
create policy "lookups readable by all logged in users" on value_bands for select using (auth.role() = 'authenticated');
drop policy if exists "lookups readable by all logged in users" on build_types;
create policy "lookups readable by all logged in users" on build_types for select using (auth.role() = 'authenticated');
drop policy if exists "lookups readable by all logged in users" on client_types;
create policy "lookups readable by all logged in users" on client_types for select using (auth.role() = 'authenticated');
drop policy if exists "lookups readable by all logged in users" on procurement_types;
create policy "lookups readable by all logged in users" on procurement_types for select using (auth.role() = 'authenticated');
drop policy if exists "lookups readable by all logged in users" on contract_types;
create policy "lookups readable by all logged in users" on contract_types for select using (auth.role() = 'authenticated');
drop policy if exists "lookups readable by all logged in users" on bim_types;
create policy "lookups readable by all logged in users" on bim_types for select using (auth.role() = 'authenticated');
drop policy if exists "lookups readable by all logged in users" on frame_types;
create policy "lookups readable by all logged in users" on frame_types for select using (auth.role() = 'authenticated');
drop policy if exists "lookups readable by all logged in users" on refurb_types;
create policy "lookups readable by all logged in users" on refurb_types for select using (auth.role() = 'authenticated');
drop policy if exists "lookups readable by all logged in users" on residential_types;
create policy "lookups readable by all logged in users" on residential_types for select using (auth.role() = 'authenticated');
drop policy if exists "lookups readable by all logged in users" on scale_bands;
create policy "lookups readable by all logged in users" on scale_bands for select using (auth.role() = 'authenticated');
drop policy if exists "lookups readable by all logged in users" on constraint_types;
create policy "lookups readable by all logged in users" on constraint_types for select using (auth.role() = 'authenticated');
drop policy if exists "lookups readable by all logged in users" on accreditation_types;
create policy "lookups readable by all logged in users" on accreditation_types for select using (auth.role() = 'authenticated');
drop policy if exists "lookups readable by all logged in users" on material_types;
create policy "lookups readable by all logged in users" on material_types for select using (auth.role() = 'authenticated');
drop policy if exists "lookups readable by all logged in users" on sustainability_types;
create policy "lookups readable by all logged in users" on sustainability_types for select using (auth.role() = 'authenticated');
drop policy if exists "lookups readable by all logged in users" on mmc_types;
create policy "lookups readable by all logged in users" on mmc_types for select using (auth.role() = 'authenticated');
create policy "lookups readable by all logged in users" on clients for select using (auth.role() = 'authenticated');
drop policy if exists "categories readable by all logged in users" on competency_categories;
create policy "categories readable by all logged in users" on competency_categories for select using (auth.role() = 'authenticated');

drop policy if exists "profiles readable by all logged in users" on profiles;
create policy "profiles readable by all logged in users" on profiles for select using (auth.role() = 'authenticated');
drop policy if exists "users update own profile" on profiles;
create policy "users update own profile" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "senior can update any profile" on profiles;
create policy "senior can update any profile" on profiles for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'senior'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'senior'));

drop policy if exists "read all experience" on staff_experience;
create policy "read all experience" on staff_experience for select using (auth.role() = 'authenticated');
drop policy if exists "manage own experience" on staff_experience;
create policy "manage own experience" on staff_experience for insert with check (staff_id = auth.uid());
drop policy if exists "delete own experience" on staff_experience;
create policy "delete own experience" on staff_experience for delete using (staff_id = auth.uid());

drop policy if exists "read all qualifications" on qualifications;
create policy "read all qualifications" on qualifications for select using (auth.role() = 'authenticated');
drop policy if exists "manage own qualifications" on qualifications;
create policy "manage own qualifications" on qualifications for insert with check (staff_id = auth.uid());
drop policy if exists "update own qualifications" on qualifications;
create policy "update own qualifications" on qualifications for update using (staff_id = auth.uid()) with check (staff_id = auth.uid());
drop policy if exists "delete own qualifications" on qualifications;
create policy "delete own qualifications" on qualifications for delete using (staff_id = auth.uid());

drop policy if exists "read all client experience" on client_experience;
create policy "read all client experience" on client_experience for select using (auth.role() = 'authenticated');
drop policy if exists "manage own client experience" on client_experience;
create policy "manage own client experience" on client_experience for insert with check (staff_id = auth.uid());
drop policy if exists "update own client experience" on client_experience;
create policy "update own client experience" on client_experience for update using (staff_id = auth.uid()) with check (staff_id = auth.uid());
drop policy if exists "delete own client experience" on client_experience;
create policy "delete own client experience" on client_experience for delete using (staff_id = auth.uid());

drop policy if exists "read all gateway experience" on gateway_experience;
create policy "read all gateway experience" on gateway_experience for select using (auth.role() = 'authenticated');
drop policy if exists "manage own gateway experience" on gateway_experience;
create policy "manage own gateway experience" on gateway_experience for insert with check (staff_id = auth.uid());
drop policy if exists "delete own gateway experience" on gateway_experience;
create policy "delete own gateway experience" on gateway_experience for delete using (staff_id = auth.uid());

drop policy if exists "read all assessments" on competency_assessments;
create policy "read all assessments" on competency_assessments for select using (auth.role() = 'authenticated');

drop policy if exists "staff insert own assessment" on competency_assessments;
create policy "staff insert own assessment" on competency_assessments for insert
  with check (staff_id = auth.uid() and status <> 'verified');

drop policy if exists "staff update own assessment" on competency_assessments;
create policy "staff update own assessment" on competency_assessments for update
  using (staff_id = auth.uid())
  with check (staff_id = auth.uid() and status <> 'verified');

drop policy if exists "senior can verify any assessment" on competency_assessments;
create policy "senior can verify any assessment" on competency_assessments for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'senior'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'senior'));

drop policy if exists "manager can verify direct reports" on competency_assessments;
create policy "manager can verify direct reports" on competency_assessments for update
  using (exists (select 1 from profiles p where p.id = competency_assessments.staff_id and p.line_manager_id = auth.uid()))
  with check (exists (select 1 from profiles p where p.id = competency_assessments.staff_id and p.line_manager_id = auth.uid()));

-- ============================================================
-- 6. SEARCH VIEW (for the bid team's Tender Search page)
-- ============================================================
create or replace view staff_overview as
select
  p.id,
  p.full_name,
  p.job_title,
  p.business_division,
  p.department,
  p.bsa_relevant,
  p.profile_confirmed_at,
  coalesce(
    jsonb_object_agg(ca.category_id, jsonb_build_object('level', ca.level, 'status', ca.status))
      filter (where ca.category_id is not null),
    '{}'::jsonb
  ) as competencies
from profiles p
left join competency_assessments ca on ca.staff_id = p.id
group by p.id;

-- ============================================================
-- 7. ONE-CALL LOOKUP FUNCTION (keeps page loads fast)
-- ============================================================
create or replace function get_all_lookups()
returns json
language sql
stable
as $$
  select json_build_object(
    'projectTypes', (select coalesce(json_agg(row_to_json(t) order by t.sort_order), '[]') from project_types t),
    'valueBands', (select coalesce(json_agg(row_to_json(t) order by t.sort_order), '[]') from value_bands t),
    'buildTypes', (select coalesce(json_agg(row_to_json(t) order by t.sort_order), '[]') from build_types t),
    'clientTypes', (select coalesce(json_agg(row_to_json(t) order by t.sort_order), '[]') from client_types t),
    'procurementTypes', (select coalesce(json_agg(row_to_json(t) order by t.sort_order), '[]') from procurement_types t),
    'contractTypes', (select coalesce(json_agg(row_to_json(t) order by t.sort_order), '[]') from contract_types t),
    'bimTypes', (select coalesce(json_agg(row_to_json(t) order by t.sort_order), '[]') from bim_types t),
    'frameTypes', (select coalesce(json_agg(row_to_json(t) order by t.sort_order), '[]') from frame_types t),
    'refurbTypes', (select coalesce(json_agg(row_to_json(t) order by t.sort_order), '[]') from refurb_types t),
    'residentialTypes', (select coalesce(json_agg(row_to_json(t) order by t.sort_order), '[]') from residential_types t),
    'scaleBands', (select coalesce(json_agg(row_to_json(t) order by t.sort_order), '[]') from scale_bands t),
    'constraintTypes', (select coalesce(json_agg(row_to_json(t) order by t.sort_order), '[]') from constraint_types t),
    'accreditationTypes', (select coalesce(json_agg(row_to_json(t) order by t.sort_order), '[]') from accreditation_types t),
    'materialTypes', (select coalesce(json_agg(row_to_json(t) order by t.sort_order), '[]') from material_types t),
    'sustainabilityTypes', (select coalesce(json_agg(row_to_json(t) order by t.sort_order), '[]') from sustainability_types t),
    'mmcTypes', (select coalesce(json_agg(row_to_json(t) order by t.sort_order), '[]') from mmc_types t),
    'clients', (select coalesce(json_agg(row_to_json(t) order by t.category, t.sort_order), '[]') from clients t)
  );
$$;

grant execute on function get_all_lookups() to authenticated;

-- ============================================================
-- 8. TABLE-LEVEL GRANTS (must come after tables exist)
-- ============================================================
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;
