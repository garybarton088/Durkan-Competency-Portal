'use client';

import Link from 'next/link';
import { usePortal } from '@/components/PortalProvider';
import { Guard } from '@/components/ui';
import { canSearch, fmtDate } from '@/lib/constants';

export default function Home() {
  return (
    <Guard>
      <Welcome />
    </Guard>
  );
}

function Welcome() {
  const { profile } = usePortal();
  const first = (profile.full_name || '').split(' ')[0];

  return (
    <>
      <section className="hero">
        <div>
          <p className="tag teal" style={{ marginBottom: 12 }}>Building Safety Act evidence</p>
          <h1>Welcome{first ? `, ${first}` : ''}</h1>
          <p style={{ fontSize: 17 }}>
            This portal records the skills, knowledge, experience and behaviours of everyone in Durkan Regen. It gives us one
            reliable, up-to-date picture of who can do what, so we can prove competence to clients and the Building Safety
            Regulator, and put the right people on every bid.
          </p>
          <div className="row">
            <Link href="/staff" className="btn">{profile.confirmed_at ? 'Update my profile' : 'Start my profile'}</Link>
            {canSearch(profile) && <Link href="/search" className="btn secondary">Tender search</Link>}
          </div>
          {profile.confirmed_at && (
            <p className="small muted" style={{ marginTop: 10 }}>You last confirmed your profile on {fmtDate(profile.confirmed_at)}.</p>
          )}
        </div>
        <div className="card soft">
          <h3>Why we&apos;re doing this</h3>
          <p className="small">
            The Building Safety Act 2022 requires every dutyholder (client, Principal Designer, Principal Contractor, designer
            and contractor) to have, and be able to show, the skills, knowledge, experience and behaviours needed for their work.
            On higher-risk buildings, the Regulator checks this at the Gateways.
          </p>
          <p className="small" style={{ marginBottom: 0 }}>
            Clients now ask for this evidence in tenders too. Keeping it here means we answer quickly and accurately, and it helps
            us plan training and development for you.
          </p>
        </div>
      </section>

      <h2>What to do</h2>
      <p className="muted">Allow 30 minutes to an hour the first time. After that, a few minutes whenever something changes.</p>
      <div className="grid grid-3">
        {[
          ['1. Basic details', 'Your role, department and line manager. Your line manager reviews your ratings, so pick the right person.'],
          ['2. Qualifications & clients', 'Degrees, memberships, cards and tickets, plus the clients you have worked for.'],
          ['3. Project experience', 'The projects you have delivered. Flag any higher-risk buildings (18m+ or 7+ storeys).'],
          ['4. Competencies', 'Rate yourself honestly in each area and give a short example. Your line manager then reviews it.'],
          ['5. HRB & Gateway', 'Any Gateway, change control or golden thread work. This is what the Regulator looks at most closely.'],
          ['6. Review & confirm', 'Check everything and confirm it is accurate. You can print or save your own report.']
        ].map(([t, d]) => (
          <div className="card accent" key={t}>
            <h3>{t}</h3>
            <p className="small muted" style={{ margin: 0 }}>{d}</p>
          </div>
        ))}
      </div>

      <div className="notice" style={{ marginTop: 24 }}>
        Your information is visible only to you, your line manager, senior reviewers and the bid team. You can view or print your
        own report at any time. The <Link href="/privacy">privacy notice</Link> explains how it&apos;s used and kept.
      </div>
    </>
  );
}
