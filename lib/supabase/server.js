import { createServerClient } from '@supabase/ssr';

// Builds a Supabase client that reads and writes auth cookies through the given adapter.
export function makeServerClient(cookieAdapter) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url.replace(/\/+$/, ''), key, { cookies: cookieAdapter });
}
