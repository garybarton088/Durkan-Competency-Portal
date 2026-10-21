# Durkan Regen Competency Portal

Staff competency, experience and Building Safety Act evidence for Durkan Regen.
Staff fill in their own profile, line managers and seniors review competency ratings,
and the bid team searches the data to staff tenders.

**Stack:** Next.js 14 (App Router, plain JS) · Supabase (auth, Postgres, row-level security) · Vercel.

## Pages

| Path | Who | What |
|---|---|---|
| `/login` | Everyone | Sign in, sign up, forgotten password |
| `/` | Signed in | Welcome, why we're doing this, what to do |
| `/staff` | Signed in | Tabbed profile: Basic details, Qualifications, Clients, Project experience, Competencies, HRB & Gateway, Review & confirm |
| `/verify` | Line managers, seniors | Review direct reports (seniors: anyone except themselves) |
| `/dashboard` | Senior, bid team | Coverage and compliance |
| `/search` | Senior, bid team | Tender search |
| `/report/[id]` | The person, their line manager, senior, bid team | Printable report |

## Set-up

1. **Supabase:** create a project. Open SQL Editor, paste all of `supabase/schema.sql` and run it.
   The script wipes and rebuilds the `public` schema, so it is safe to re-run but deletes portal data.
2. **Supabase > Authentication > URL Configuration:** set *Site URL* to the live Vercel address and add
   `https://<your-domain>/auth/callback` to *Redirect URLs*.
3. **Vercel:** import this repo (Root Directory blank, framework Next.js) and add two environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: the project URL, ending `.supabase.co` and nothing after it
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the anon / publishable key
4. Sign up in the portal, then make yourself senior in the SQL editor:
   `update public.profiles set role = 'senior' where email = 'you@durkan.co.uk';`

## Roles

`profiles.role` is `staff` (default), `senior` or `bid_team`. Change it in the Supabase table editor
or SQL editor. Users can't change their own role.

## Security rules (enforced in the database)

- Everyone signed in can see names and job titles (to pick a line manager).
- Evidence (qualifications, clients, projects, gateway, competencies) is visible to the person,
  their line manager, seniors and the bid team. Only the person can edit their own evidence.
- Competency reviews: the line manager or a senior can set the reviewed rating and comment.
  Nobody can review their own entries, and reviewers can't change the self-assessment.

## Data model

- `profiles`, `lookup_values` (all tick-box lists, keyed by `list_key`), `clients`
- `qualifications`, `client_experience`, `staff_experience`, `gateway_experience`
- `competency_categories`, `competency_assessments`
- View `staff_overview`; RPC `get_all_lookups()` returns all lists, clients, categories and people in one call.

To add or rename a tick-box option, edit `lookup_values` in the table editor. No code change needed.
