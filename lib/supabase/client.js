import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_KEY, supabaseConfigured, configProblem } from './config';

let client;

export { supabaseConfigured, configProblem };

export function getSupabase() {
  // Only create the client in the browser; pages are pre-built on the server without one.
  if (!supabaseConfigured || typeof window === 'undefined') return null;
  if (!client) client = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}
