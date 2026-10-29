/** @type {import('next').NextConfig} */

// Security headers sent with every page (OWASP A02: security misconfiguration).
const supabaseOrigin = (() => {
  try {
    const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/^["']+|["']+$/g, '');
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.origin;
  } catch {
    return '';
  }
})();
const supabaseWs = supabaseOrigin.replace(/^https:/, 'wss:');
const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  // Next.js injects small inline scripts; dev mode also needs eval for hot reload.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests'
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' }
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  }
};

module.exports = nextConfig;
