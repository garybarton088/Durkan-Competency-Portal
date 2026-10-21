'use client';

import { useEffect, useState } from 'react';
import { usePortal } from '@/components/PortalProvider';
import { Guard } from '@/components/ui';
import { canSearch, scaleLabel, fmtDate } from '@/lib/constants';

export default function ReportPage({ params }) {
  return (
    <Guard>
      <Report id={params.id} />
    </Guard>
  );
}

function Report({ id }) {
  const { supabase, user, profile: me, lookups } = usePortal();
  const [d, setD] = useState(null);

  useEffect(() => {
    (async () => {
      const [p, q, c, e, g, a] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('qualifications').select('*').eq('staff_id', id).order('year_obtained', { ascending: false }),
        supabase.from('client_experience').select('*').eq('staff_id', id),
        supabase.from('staff_experience').select('*').eq('staff_id', id).order('end_year', { ascending: false }),
        supabase.from('gateway_experience').select('*').eq('staff_id', id).order('submitted_on', { ascending: false }),
        supabase.from('competency_assessments').select('*').eq('staff_id', id)
      ]);
      setD({
        person: p.data,
        quals: q.data || [],
        clients: c.data || [],
        projects: e.data || [],
        gateway: g.data || [],
        assess: a.data || []
      });
    })();
  }, [supabase, id]);

  if (!d) return <p className="muted">Loading…</p>;
  const person = d.person;
  const allowed = person && (id === user.id || canSearch(me) || person.line_manager_id === user.id);
  if (!allowed) return <div className="notice warn">This report isn&apos;t available to you.</div>;

  const clientName = (cid) => (lookups.clients || []).find((c) => c.id === cid)?.name || '';
  const manager = (lookups.people || []).find((p) => p.id === person.line_manager_id);
  const reviewerName = (rid) => (lookups.people || []).find((p) => p.id === rid)?.full_name || '';
  const cats = lookups.categories || [];
  const assessFor = (cid) => d.assess.find((a) => a.category_id === cid);
  const hrbProjects = d.projects.filter((p) => p.is_hrb);

  const CompTable = ({ list }) => (
    <table className="tbl">
      <thead>
        <tr><th style={{ width: '34%' }}>Area</th><th>Self</th><th>Reviewed</th><th>Evidence</th></tr>
      </thead>
      <tbody>
        {list.map((c) => {
          const a = assessFor(c.id);
          return (
            <tr key={c.id}>
              <td><b>{c.name}</b></td>
              <td>{scaleLabel(a?.self_rating ?? 0)}</td>
              <td>
                {a?.reviewed_at ? (
                  <>
                    {scaleLabel(a.manager_rating)}
                    <div className="small muted">{reviewerName(a.reviewed_by)} · {fmtDate(a.reviewed_at)}</div>
                  </>
                ) : (
                  <span className="muted">Not yet</span>
                )}
              </td>
              <td className="small">
                {a?.self_evidence}
                {a?.manager_comment && <div className="muted" style={{ marginTop: 4 }}>Reviewer: {a.manager_comment}</div>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="report">
      <div className="row no-print" style={{ justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn" onClick={() => window.print()}>Print / save as PDF</button>
      </div>

      <div className="report-head">
        <div>
          <h1 style={{ marginBottom: 4 }}>{person.full_name}</h1>
          <div style={{ fontSize: 16 }}>{[person.job_title, person.department].filter(Boolean).join(' · ')}</div>
          <div className="small muted" style={{ marginTop: 6 }}>
            {[
              manager && `Line manager: ${manager.full_name}`,
              person.start_date && `Joined Durkan ${fmtDate(person.start_date)}`,
              person.years_in_industry != null && `${person.years_in_industry} years in the industry`
            ].filter(Boolean).join(' · ')}
          </div>
        </div>
        <img src="/durkan-regen-logo.png" alt="Durkan Regen" />
      </div>

      {person.summary && (
        <section>
          <h2>Summary</h2>
          <p>{person.summary}</p>
        </section>
      )}

      <section>
        <h2>Building Safety Act: HRB &amp; Gateway experience</h2>
        {d.gateway.length === 0 && hrbProjects.length === 0 && <p className="muted">None recorded.</p>}
        {d.gateway.length > 0 && (
          <table className="tbl" style={{ marginBottom: 12 }}>
            <thead><tr><th>Project</th><th>Stage / activity</th><th>Role</th><th>Height</th><th>Outcome</th><th>Date</th></tr></thead>
            <tbody>
              {d.gateway.map((g) => (
                <tr key={g.id}>
                  <td><b>{g.project_name}</b><div className="small muted">{clientName(g.client_id)}</div>{g.description && <div className="small">{g.description}</div>}</td>
                  <td>{g.stage}</td><td>{g.dutyholder_role}</td><td>{g.height_band}</td><td>{g.outcome}</td><td>{fmtDate(g.submitted_on)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {hrbProjects.length > 0 && (
          <p className="small">
            <b>Higher-risk building projects:</b> {hrbProjects.map((p) => p.project_name + (p.storeys ? ` (${p.storeys} storeys)` : '')).join('; ')}
          </p>
        )}
      </section>

      <section>
        <h2>Building Safety Act competencies</h2>
        <CompTable list={cats.filter((c) => c.is_bsa)} />
      </section>

      <section>
        <h2>Qualifications &amp; memberships</h2>
        {d.quals.length === 0 ? <p className="muted">None recorded.</p> : (
          <table className="tbl">
            <thead><tr><th>Qualification</th><th>Body</th><th>Grade</th><th>Year</th><th>Expires</th></tr></thead>
            <tbody>
              {d.quals.map((q) => (
                <tr key={q.id}><td><b>{q.title}</b><div className="small muted">{q.qual_type}</div></td><td>{q.body}</td><td>{q.grade}</td><td>{q.year_obtained}</td><td>{fmtDate(q.expiry_date)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Project experience</h2>
        {d.projects.length === 0 ? <p className="muted">None recorded.</p> : d.projects.map((p) => (
          <div className="entry" key={p.id}>
            <h3>{p.project_name} {p.is_hrb && <span className="tag navy">HRB</span>} {p.occupied && <span className="tag">Occupied</span>}</h3>
            <div className="kv">
              {[
                ['Client', clientName(p.client_id)], ['Role', p.project_role], ['Value', p.value_band],
                ['Years', p.start_year ? `${p.start_year}–${p.end_year || 'now'}` : ''], ['Sector', p.sector],
                ['Building', p.building_type], ['Storeys', p.storeys], ['Contract', p.contract_form],
                ['Work', (p.work_types || []).join(', ')]
              ].filter(([, v]) => v).map(([k, v]) => <span key={k}>{k}: <b>{v}</b></span>)}
            </div>
            {p.description && <p className="small" style={{ margin: '6px 0 0' }}>{p.description}</p>}
          </div>
        ))}
      </section>

      <section>
        <h2>Clients</h2>
        {d.clients.length === 0 ? <p className="muted">None recorded.</p> : (
          <p>{d.clients.map((c) => clientName(c.client_id) + (c.years ? ` (${c.years} yrs)` : '')).join(' · ')}</p>
        )}
      </section>

      <section>
        <h2>Other competencies</h2>
        <CompTable list={cats.filter((c) => !c.is_bsa)} />
      </section>

      <p className="small muted" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
        {person.confirmed_at ? `Confirmed accurate by ${person.full_name} on ${fmtDate(person.confirmed_at)}.` : 'Not yet confirmed by the individual.'}{' '}
        Printed {fmtDate(new Date())}. Durkan Regen competency portal.
      </p>
    </div>
  );
}
