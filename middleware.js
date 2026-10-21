import { NextResponse } from 'next/server';
import { makeServerClient } from '@/lib/supabase/server';

const PUBLIC_PATHS = ['/login', '/auth'];

export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = makeServerClient({
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    }
  });

  // Env vars missing: let pages load so they can show a clear setup message.
  if (!supabase) return response;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (user && path === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Skip Next internals and any URL with a file extension (logos, favicon, etc.)
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)']
};
