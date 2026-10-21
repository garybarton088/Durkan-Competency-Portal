-- Update 001: only @durkan.co.uk email addresses can create an account.
-- Run once in Supabase > SQL Editor. Safe to re-run. Existing accounts are not affected.

drop trigger if exists enforce_email_domain on auth.users;

create or replace function public.allowed_email(addr text) returns boolean
language sql immutable as $$
  select lower(split_part(coalesce(addr, ''), '@', 2)) = any (array['durkan.co.uk'])
$$;

create or replace function public.enforce_email_domain() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.allowed_email(new.email) then
    raise exception 'Only Durkan email addresses (@durkan.co.uk) can register for the competency portal';
  end if;
  return new;
end $$;

create trigger enforce_email_domain
  before insert or update of email on auth.users
  for each row execute function public.enforce_email_domain();
