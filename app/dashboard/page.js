'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/components/PortalProvider';
import { Guard, Select } from '@/components/ui';
import { canSearch, fmtDate, ROLES } from '@/lib/constants';
import { friendlyError } from '@/lib/errors';

export default function DashboardPage() {
  return (
    <Guard allow={canSearch}>
      <Dashboard />
    </Guard>
  );
}

function Dashboard() {
  const { supabase, list, lookups } = usePortal();
  const [rows, setRows] = useState(null);
  const [assess, setAssess] = useState([]);
  const [dept, setDept] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const [o, a] = await Promise.all([
        supabase.from('staff_overview').select('*').order('full_name'),
        supabase.from('competency_assessments').select('staff_id, category_id, self_rating, manager_rating, reviewed_at')
      ]);
      if (o.error) setErr(friendlyError(o.error));
      setRows(o.data || []);
      setAssess(a.data || []);
    })();
  }, [supabase]);

  const filtered = useMemo(() => (rows || []).filter((r) => !dept || r.department === dept), [rows, dept]);
  const ids = useMemo(() => new Set(filtered.map((r) => r.id)), [filtered]);
  const cats = lookups.categories || [];

  if (!rows) return <p className="muted">Loading…</p>;

  const n = filtered.length || 1;
  const confirmed = filtered.filter((r) => r.confirmed_at).length;
  const stale = filtered.filter((r) => r.confirmed_at && Date.now() - new Date(r.confirmed_at) > 183 * 864e5).length;
  const withHrb = filtered.filter((r) => r.hrb_projects > 0).length;
  const withGw = filtered.filter((r) => r.gateway_entries > 0).length;
  const totalRated = filtered.reduce((s, r) => s + Number(r.competencies_rated || 0), 0);
  const totalReviewed = filtered.reduce((s, r) => s + Number(r.competencies_reviewed || 0), 0);

  // Coverage: people at "Solid & dependable" (3) or above, using the reviewed rating where there is one
  const coverage = cats.map((c) => {
    const rel = assess.filter((a) => a.category_id === c.id && ids.has(a.staff_id));
    const strong = rel.filter((a) => (a.reviewed_at ? a.manager_rating : a.self_rating) >= 3).length;
    const verified = rel.filter((a) => a.reviewed_at && a.manager_rating >= 3).length;
    return { ...c, strong, verified };
  });

  return (
    <>
      <div className="spread">
        <h1>Dashboard</h1>
        <div style={{ minWidth: 240 }}>
          <Select value={dept} onChange={setDept} options={list('department')} placeholder="All departments" />
        </div>
      </div>
      {err && <div className="notice err">{err}</div>}

      <div className="grid grid-4" style={{ margin: '12px 0 28px' }}>
        <Stat n={filtered.length} l="People signed up" />
        <Stat n={`${Math.round((confirmed / n) * 100)}%`} l={`Profiles confirmed (${confirmed})`} />
        <Stat n={stale} l="Confirmed over 6 months ago" />
        <Stat n={withHrb} l="People with HRB project experience" />
        <Stat n={withGw} l="People with Gateway experience" />
        <Stat n={totalRated ? `${Math.round((totalReviewed / totalRated) * 100)}%` : '—'} l="Self-ratings reviewed" />
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h2>Competency coverage</h2>
          <p className="small muted">People rated “Solid &amp; dependable” or above. The darker bar shows ratings confirmed by a reviewer.</p>
          {coverage.map((c) => (
            <div key={c.id} style={{ marginBottom: 12 }}>
              <div className="spread small">
                <span>
                  {c.name} {c.is_bsa && <span className="tag navy">BSA</span>}
                </span>
                <b>
                  {c.strong} <span className="muted">({c.verified} verified)</span>
                </b>
              </div>
              <div className="bar" style={{ position: 'relative' }}>
                <i style={{ width: `${(c.strong / n) * 100}%`, opacity: 0.45 }} />
                <i style={{ width: `${(c.verified / n) * 100}%`, position: 'absolute', top: 0, left: 0 }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Who needs a nudge</h2>
          <p className="small muted">Not yet confirmed, or not yet told us who their line manager is.</p>
          {filtered.filter((r) => !r.confirmed_at || !r.line_manager_id).slice(0, 25).map((r) => (
            <div key={r.id} className="spread small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span><b>{r.full_name}</b> <span className="muted">{r.email}</span></span>
              <span>
                {!r.line_manager_id && <span className="tag amber">No manager</span>}{' '}
                {!r.confirmed_at && <span className="tag">Not confirmed</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      <h2 style={{ marginTop: 32 }}>Everyone</h2>
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th><th>Department</th><th>Line manager</th><th>Quals</th><th>Projects</th><th>HRB</th><th>Gateway</th>
              <th>Rated</th><th>Reviewed</th><th>Confirmed</th><th>Access</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/report/${r.id}`}><b>{r.full_name}</b></Link><div className="small muted">{r.job_title}</div></td>
                <td>{r.department}</td>
                <td>{r.line_manager_name || <span className="tag amber">None</span>}</td>
                <td>{r.qualifications}</td>
                <td>{r.projects}</td>
                <td>{r.hrb_projects}</td>
                <td>{r.gateway_entries}</td>
                <td>{r.competencies_rated}/{cats.length}</td>
                <td>{r.competencies_reviewed}</td>
                <td>{r.confirmed_at ? fmtDate(r.confirmed_at) : '—'}</td>
                <td>{ROLES[r.role] || r.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Stat({ n, l }) {
  return (
    <div className="stat">
      <div className="n">{n}</div>
      <div className="l">{l}</div>
    </div>
  );
}
