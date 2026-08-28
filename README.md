# Durkan Competency Register — clean setup

This is the complete, current version of the app in one package. Follow these
steps in order for a fresh, reliable setup.

## 1. Reset Supabase (reuse the same project)

1. Go to your existing Supabase project → SQL Editor → New query.
2. Paste in the entire contents of `supabase/schema.sql` from this package and click Run.
   It's safe to run even though some tables already exist — everything uses
   "if not exists" so nothing is deleted or duplicated.
3. Go to Table Editor → `profiles`, find your own row, and set `role` to `senior`
   (new signups always start as `staff`).

## 2. Start a brand new GitHub repository

1. Go to github.com → create a **new** repository (e.g. `durkan-competency-v2`).
   Leave it empty — no README, no .gitignore.
2. On the empty repo's page, click **"uploading an existing file"**.
3. In File Explorer on your computer, open the unzipped `durkan-app-final`
   folder, select **everything inside it** (Ctrl+A) — not the folder itself —
   and drag all of it into the browser's upload box.
4. Scroll down, make sure **"Commit directly to the main branch"** is selected
   (not "Create a new branch"), and click Commit.
5. Confirm on the repo's main page that you see `app`, `lib`, `public`,
   `supabase`, `package.json` etc. listed directly — not nested inside another
   folder. This matters: it avoids the "Root Directory" confusion from before.

## 3. Start a brand new Vercel project

1. In Vercel, click **Add New → Project**, find your new repository, click Import.
2. Leave build settings as default — don't set a Root Directory this time,
   since the files are at the repo's top level.
3. Expand **Environment Variables** and add exactly two, as **Config** type
   (not Secret — Config is correct for values that need to reach the browser):
   - `NEXT_PUBLIC_SUPABASE_URL` — from Supabase → Settings → API Settings →
     Project URL (just `https://xxxxx.supabase.co`, nothing after `.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase → Settings → API Keys →
     the anon/public/publishable key
4. Click Deploy.

## 4. Test

1. Open the live URL Vercel gives you.
2. Sign in with the account you already created (or make a new one).
3. Check "My profile" loads promptly with all the sections, and "Tender search"
   works if your account is senior/bid_team.

If anything is slow or times out this time, it's worth checking Supabase's
own Logs → API Gateway to see whether requests are arriving there quickly —
that was the key diagnostic that helped last time.
