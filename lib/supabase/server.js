import { createServerClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_KEY, supabaseConfigured } from './config';

// Builds a Supabase client that reads and writes auth cookies through the given adapter.
export function makeServerClient(cookieAdapter) {
  if (!supabaseConfigured) return null;
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, { cookies: cookieAdapter });
}
