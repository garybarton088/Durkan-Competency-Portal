'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePortal } from './PortalProvider';
import { canSearch } from '@/lib/constants';

export default function Header() {
  const { user, profile, supabase, lookups } = usePortal();
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith('/login')) return null;

  const isManager = (lookups.people || []).some((p) => p.line_manager_id && p.line_manager_id === user?.id);
  const links = [
    { href: '/', label: 'Home' },
    { href: '/staff', label: 'My profile' }
  ];
  if (profile?.role === 'senior' || isManager) links.push({ href: '/verify', label: 'Review' });
  if (canSearch(profile)) {
    links.push({ href: '/dashboard', label: 'Dashboard' });
    links.push({ href: '/search', label: 'Tender search' });
  }

  async function signOut() {
    await supabase?.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="site-header no-print">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Durkan Regen competency portal home">
          <img src="/durkan-regen-logo-white.png" alt="Durkan Regen" />
          <span className="brand-sub">Competency Portal</span>
        </Link>
        {user && (
          <nav className="nav">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={(l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)) ? 'active' : ''}
              >
                {l.label}
              </Link>
            ))}
            <button className="nav-signout" onClick={signOut}>
              Sign out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
