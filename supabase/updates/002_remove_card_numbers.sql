-- Update 002: remove the membership / card number field (not needed, so not kept).
-- Run once in Supabase > SQL Editor (make sure the dropdown next to Run says Primary database, not Logs).
alter table public.qualifications drop column if exists reference;
