// Reads and tidies the two Supabase settings from Vercel's environment variables.
// Strips stray spaces/quotes and anything after ".co" (e.g. "/rest/v1/").

function clean(v) {
  return (v || '').trim().replace(/^["']+|["']+$/g, '').trim();
}

function cleanUrl(v) {
  let u = clean(v);
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try {
    const parsed = new URL(u);
    if (!parsed.hostname.includes('.')) return ''; // e.g. the key pasted into the URL box
    return parsed.origin; // protocol + host only
  } catch {
    return '';
  }
}

export const SUPABASE_URL = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_KEY = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const configProblem = !process.env.NEXT_PUBLIC_SUPABASE_URL
  ? 'NEXT_PUBLIC_SUPABASE_URL is missing.'
  : !SUPABASE_URL
  ? 'NEXT_PUBLIC_SUPABASE_URL is not a valid web address. It should look like https://abcdefgh.supabase.co'
  : !SUPABASE_KEY
  ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.'
  : null;
