import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { makeServerClient } from '@/lib/supabase/server';

// Handles the link in Supabase confirmation / magic-link emails.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  const cookieStore = cookies();
  const supabase = makeServerClient({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
    }
  });

  if (supabase) {
    let error = null;
    if (code) {
      ({ error } = await supabase.auth.exchangeCodeForSession(code));
    } else if (tokenHash && type) {
      ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
    }
    if (!error && (code || tokenHash)) {
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link`);
}
