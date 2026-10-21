'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/components/PortalProvider';
import { Guard, Field, Select, ScalePicker } from '@/components/ui';
import EntryList from '@/components/EntryList';
import { scaleLabel, fmtDate } from '@/lib/constants';

const TABS = ['Basic details', 'Qualifications', 'Clients', 'Project experience', 'Competencies', 'HRB & Gateway', 'Review & confirm'];

export default function StaffPage() {
  return (
    <Guard>
      <StaffProfile />
    </Guard>
  );
}

function StaffProfile() {
  const [tab, setTab] = useState(0);
  const [tick, setTick] = useState(0); // bump to refresh the summary counts
  const bump = () => setTick((t) => t + 1);
  const counts = useCounts(tick);

  const badge = [null, counts.qualifications, counts.clients, counts.projects, counts.rated, counts.gateway, null];

  return (
    <>
      <div className="spread" style={{ marginBottom: 8 }}>
        <h1>My profile</h1>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map((t, i) => (
          <button key={t} className={'tab' + (tab === i ? ' on' : '')} onClick={() => setTab(i)} role="tab" aria-selected={tab === i}>
            {t}
            {badge[i] ? <span className="tag teal">{badge[i]}</span> : null}
          </button>
        ))}
      </div>

      {tab === 0 && <BasicDetails onSaved={bump} />}
      {tab === 1 && <Qualifications onChange={bump} />}
      {tab === 2 && <Clients onChange={bump} />}
      {tab === 3 && <Projects onChange={bump} />}
      {tab === 4 && <Competencies onChange={bump} />}
      {tab === 5 && <Gateway onChange={bump} />}
      {tab === 6 && <ReviewConfirm counts={counts} goTo={setTab} onConfirmed={bump} />}

      {tab < 6 && (
        <div className="row" style={{ marginTop: 28, justifyContent: 'space-between' }}>
          <button className="btn secondary" disabled={tab === 0} onClick={() => setTab(tab - 1)}>← Back</button>
          <button className="btn navy" onClick={() => setTab(tab + 1)}>Next: {TABS[tab + 1]} →</button>
        </div>
      )}
    </>
  );
}

function useCounts(tick) {
  const { supabase, user, lookups } = usePortal();
  const [c, setC] = useState({ qualifications: 0, clients: 0, projects: 0, hrb: 0, gateway: 0, rated: 0, reviewed: 0, categories: 0 });
  useEffect(() => {
    let live = true;
    (async () => {
      const head = (t, extra) => {
        let q = supabase.from(t).select('id', { count: 'exact', head: true }).eq('staff_id', user.id);
        return extra ? extra(q) : q;
      };
      const [q, cl, p, h, g, r, rv] = await Promise.all([
        head('qualifications'),
        head('client_experience'),
        head('staff_experience'),
        head('staff_experience', (x) => x.eq('is_hrb', true)),
        head('gateway_experience'),
        head('competency_assessments', (x) => x.gt('self_rating', 0)),
        head('competency_assessments', (x) => x.not('reviewed_at', 'is', null))
      ]);
      if (!live) return;
      setC({
        qualifications: q.count || 0,
        clients: cl.count || 0,
        projects: p.count || 0,
        hrb: h.count || 0,
        gateway: g.count || 0,
        rated: r.count || 0,
        reviewed: rv.count || 0,
        categories: (lookups.categories || []).length
      });
    })();
    return () => {
      live = false;
    };
  }, [supabase, user, tick, lookups.categories]);
  return c;
}

/* ---------------- Basic details ---------------- */
function BasicDetails({ onSaved }) {
  const { supabase, user, profile, list, lookups, reloadProfile, reloadLookups } = usePortal();
  const [f, setF] = useState(() => ({
    full_name: profile.full_name || '',
    job_title: profile.job_title || '',
    department: profile.department || null,
    office: profile.office || null,
    phone: profile.phone || '',
    line_manager_id: profile.line_manager_id || null,
    start_date: profile.start_date || '',
    years_in_industry: profile.years_in_industry ?? '',
    summary: profile.summary || ''
  }));
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const managers = (lookups.people || [])
    .filter((p) => p.id !== user.id)
    .map((p) => ({ value: p.id, label: p.full_name + (p.job_title ? ` (${p.job_title})` : '') }));

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: f.full_name.trim() || null,
        job_title: f.job_title.trim() || null,
        department: f.department,
        office: f.office,
        phone: f.phone.trim() || null,
        line_manager_id: f.line_manager_id,
        start_date: f.start_date || null,
        years_in_industry: f.years_in_industry === '' ? null : Number(f.years_in_industry),
        summary: f.summary.trim() || null
      })
      .eq('id', user.id);
    setSaving(false);
    if (error) return setMsg({ type: 'err', text: error.message });
    setMsg({ type: 'ok', text: 'Saved.' });
    await Promise.all([reloadProfile(), reloadLookups()]);
    onSaved();
  }

  return (
    <form onSubmit={save}>
      <div className="grid grid-2">
        <Field label="Full name"><input type="text" value={f.full_name} onChange={(e) => set('full_name', e.target.value)} /></Field>
        <Field label="Email"><input type="text" value={profile.email || ''} disabled /></Field>
        <Field label="Job title"><input type="text" value={f.job_title} onChange={(e) => set('job_title', e.target.value)} placeholder="e.g. Senior Site Manager" /></Field>
        <Field label="Department"><Select value={f.department} onChange={(v) => set('department', v)} options={list('department')} /></Field>
        <Field label="Base"><Select value={f.office} onChange={(v) => set('office', v)} options={list('office')} /></Field>
        <Field label="Phone"><input type="text" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Line manager" hint="Your line manager reviews your competency ratings. If they're not listed, they need to sign up first.">
          <Select value={f.line_manager_id} onChange={(v) => set('line_manager_id', v)} options={managers} placeholder="Select your line manager…" />
        </Field>
        <Field label="Date joined Durkan"><input type="date" value={f.start_date || ''} onChange={(e) => set('start_date', e.target.value)} /></Field>
        <Field label="Years in the industry"><input type="number" min="0" value={f.years_in_industry} onChange={(e) => set('years_in_industry', e.target.value)} /></Field>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Professional summary" hint="Two or three sentences the bid team could drop into a CV.">
            <textarea value={f.summary} onChange={(e) => set('summary', e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save details'}</button>
        {msg && <span className={msg.type === 'err' ? 'notice err' : 'tag teal'}>{msg.text}</span>}
      </div>
      <ChangePassword />
    </form>
  );
}

function ChangePassword() {
  const { supabase } = usePortal();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState(null);
  async function go() {
    if (pw.length < 8) return setMsg({ type: 'err', text: 'Use at least 8 characters.' });
    const { error } = await supabase.auth.updateUser({ password: pw });
    setMsg(error ? { type: 'err', text: error.message } : { type: 'ok', text: 'Password updated.' });
    if (!error) setPw('');
  }
  return (
    <div style={{ marginTop: 28 }}>
      {!open ? (
        <button type="button" className="linkbtn small" onClick={() => setOpen(true)}>Change my password</button>
      ) : (
        <div className="row">
          <input type="password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} style={{ maxWidth: 260 }} />
          <button type="button" className="btn small" onClick={go}>Update password</button>
          {msg && <span className={msg.type === 'err' ? 'notice err' : 'tag teal'}>{msg.text}</span>}
        </div>
      )}
    </div>
  );
}

/* ---------------- Qualifications ---------------- */
function Qualifications({ onChange }) {
  return (
    <>
      <p className="muted">Degrees, professional memberships, health &amp; safety tickets, fire safety courses and skills cards.</p>
      <EntryList
        table="qualifications"
        addLabel="Add qualification"
        onChange={onChange}
        fields={[
          { name: 'qual_type', label: 'Type', type: 'select', list: 'qual_type' },
          { name: 'title', label: 'Qualification / membership', required: true, placeholder: 'e.g. BSc Construction Management, MCIOB, SMSTS' },
          { name: 'body', label: 'Awarding or professional body', type: 'select', list: 'professional_body' },
          { name: 'grade', label: 'Grade / level', placeholder: 'e.g. 2:1, Chartered, Level 6' },
          { name: 'year_obtained', label: 'Year obtained', type: 'number' },
          { name: 'expiry_date', label: 'Expiry date (if any)', type: 'date' },
          { name: 'reference', label: 'Membership or card number' }
        ]}
        title={(r) => r.title}
        meta={(r) => [
          ['Type', r.qual_type],
          ['Body', r.body],
          ['Grade', r.grade],
          ['Year', r.year_obtained],
          ['Expires', fmtDate(r.expiry_date)]
        ]}
      />
    </>
  );
}

/* ---------------- Clients ---------------- */
function Clients({ onChange }) {
  return (
    <>
      <p className="muted">The clients you have worked for, at Durkan or before. If a client isn&apos;t listed, use “+ New” to add it.</p>
      <EntryList
        table="client_experience"
        addLabel="Add client"
        onChange={onChange}
        fields={[
          { name: 'client_id', label: 'Client', type: 'client', required: true },
          { name: 'years', label: 'Years working with them', type: 'number' },
          { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Frameworks, key contacts, types of scheme' }
        ]}
        title={(r, { clientName }) => clientName(r.client_id) || 'Client'}
        meta={(r) => [['Years', r.years], ['Notes', r.notes]]}
      />
    </>
  );
}

/* ---------------- Projects ---------------- */
function Projects({ onChange }) {
  return (
    <>
      <p className="muted">
        Add the projects that best show your experience, starting with the most recent. Tick <b>Higher-risk building</b> for
        anything 18m or more, or 7 or more storeys, with at least two homes.
      </p>
      <EntryList
        table="staff_experience"
        addLabel="Add project"
        onChange={onChange}
        orderBy="end_year"
        fields={[
          { name: 'project_name', label: 'Project name', required: true },
          { name: 'client_id', label: 'Client', type: 'client' },
          { name: 'location', label: 'Location / borough' },
          { name: 'project_role', label: 'Your role', type: 'select', list: 'project_role' },
          { name: 'sector', label: 'Sector', type: 'select', list: 'sector' },
          { name: 'building_type', label: 'Building type', type: 'select', list: 'building_type' },
          { name: 'contract_form', label: 'Form of contract', type: 'select', list: 'contract_form' },
          { name: 'procurement', label: 'Procurement route', type: 'select', list: 'procurement' },
          { name: 'value_band', label: 'Contract value', type: 'select', list: 'value_band' },
          { name: 'storeys', label: 'Storeys', type: 'number' },
          { name: 'start_year', label: 'Start year', type: 'number' },
          { name: 'end_year', label: 'End year (blank if ongoing)', type: 'number' },
          { name: 'work_types', label: 'Type of work (pick all that apply)', type: 'multi', list: 'work_type' },
          { name: 'is_hrb', label: 'Higher-risk building (18m+ or 7+ storeys)', type: 'checkbox' },
          { name: 'occupied', label: 'Residents in occupation during the works', type: 'checkbox' },
          { name: 'description', label: 'What you did', type: 'textarea', placeholder: 'Your responsibilities and achievements on this project' }
        ]}
        title={(r) => (
          <>
            {r.project_name} {r.is_hrb && <span className="tag navy">HRB</span>} {r.occupied && <span className="tag">Occupied</span>}
          </>
        )}
        meta={(r, { clientName }) => [
          ['Client', clientName(r.client_id)],
          ['Role', r.project_role],
          ['Value', r.value_band],
          ['Years', r.start_year ? `${r.start_year}–${r.end_year || 'now'}` : null],
          ['Storeys', r.storeys],
          ['Contract', r.contract_form],
          ['Work', r.work_types]
        ]}
      />
    </>
  );
}

/* ---------------- Competencies ---------------- */
function Competencies({ onChange }) {
  const { supabase, user, lookups } = usePortal();
  const [rows, setRows] = useState({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('competency_assessments').select('*').eq('staff_id', user.id);
    const map = {};
    (data || []).forEach((r) => (map[r.category_id] = r));
    setRows(map);
    setLoaded(true);
  }, [supabase, user]);

  useEffect(() => {
    load();
  }, [load]);

  const cats = lookups.categories || [];
  if (!loaded) return <p className="muted">Loading…</p>;

  return (
    <>
      <p className="muted">
        Rate yourself honestly in each area and give a short, specific example. Save each area as you go. Your line manager will
        review it. Areas marked <span className="tag navy">BSA</span> are what the Building Safety Regulator focuses on.
      </p>
      <div className="stack">
        {cats.map((c) => (
          <CompetencyCard key={c.id} cat={c} row={rows[c.id]} onSaved={() => { load(); onChange(); }} />
        ))}
      </div>
    </>
  );
}

function CompetencyCard({ cat, row, onSaved }) {
  const { supabase, user } = usePortal();
  const [rating, setRating] = useState(row?.self_rating ?? 0);
  const [evidence, setEvidence] = useState(row?.self_evidence || '');
  const [state, setState] = useState(null);
  const dirty = rating !== (row?.self_rating ?? 0) || evidence !== (row?.self_evidence || '');

  async function save() {
    setState('saving');
    const { error } = await supabase
      .from('competency_assessments')
      .upsert({ staff_id: user.id, category_id: cat.id, self_rating: rating, self_evidence: evidence.trim() || null }, { onConflict: 'staff_id,category_id' });
    if (error) return setState(error.message);
    setState('saved');
    onSaved();
  }

  return (
    <div className={'card ' + (cat.is_bsa ? 'bsa' : 'accent')}>
      <div className="spread">
        <h3 style={{ margin: 0 }}>
          {cat.name} {cat.is_bsa && <span className="tag navy">BSA</span>}
        </h3>
        {row?.reviewed_at ? (
          <span className="tag teal">Reviewed: {scaleLabel(row.manager_rating)}</span>
        ) : row?.self_rating ? (
          <span className="tag amber">Awaiting review</span>
        ) : null}
      </div>
      <p className="small muted">{cat.description}</p>
      <ScalePicker value={rating} onChange={setRating} />
      <div style={{ marginTop: 12 }}>
        <Field label="Your evidence">
          <textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="A short example: the project, what you did, and the outcome."
          />
        </Field>
      </div>
      {row?.reviewed_at && (
        <div className="notice" style={{ marginTop: 10 }}>
          <b>Reviewer comment ({fmtDate(row.reviewed_at)}):</b> {row.manager_comment || 'No comment.'}
        </div>
      )}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn small" onClick={save} disabled={!dirty || state === 'saving'}>
          {state === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {state === 'saved' && !dirty && <span className="tag teal">Saved</span>}
        {state && !['saving', 'saved'].includes(state) && <span className="notice err">{state}</span>}
      </div>
    </div>
  );
}

/* ---------------- HRB & Gateway ---------------- */
function Gateway({ onChange }) {
  return (
    <>
      <div className="notice" style={{ marginBottom: 16 }}>
        This is the most important evidence for Building Safety Act scrutiny. Record any work on Gateway applications, change
        control, golden thread information or mandatory occurrence reporting on higher-risk buildings, even if your part was small.
      </div>
      <EntryList
        table="gateway_experience"
        addLabel="Add HRB / Gateway experience"
        onChange={onChange}
        fields={[
          { name: 'project_name', label: 'Project / building', required: true },
          { name: 'client_id', label: 'Client', type: 'client' },
          { name: 'stage', label: 'Stage or activity', type: 'select', list: 'gateway_stage', required: true },
          { name: 'dutyholder_role', label: 'Durkan / your dutyholder role', type: 'select', list: 'dutyholder_role' },
          { name: 'height_band', label: 'Building height', type: 'select', list: 'height_band' },
          { name: 'outcome', label: 'Outcome', type: 'select', list: 'gateway_outcome' },
          { name: 'submitted_on', label: 'Date submitted / completed', type: 'date' },
          { name: 'description', label: 'Your involvement', type: 'textarea', placeholder: 'What you prepared, reviewed or managed, and any Regulator queries you dealt with' }
        ]}
        title={(r) => (
          <>
            {r.project_name} <span className="tag navy">{r.stage}</span>
          </>
        )}
        meta={(r, { clientName }) => [
          ['Client', clientName(r.client_id)],
          ['Role', r.dutyholder_role],
          ['Height', r.height_band],
          ['Outcome', r.outcome],
          ['Date', fmtDate(r.submitted_on)]
        ]}
      />
    </>
  );
}

/* ---------------- Review & confirm ---------------- */
function ReviewConfirm({ counts, goTo, onConfirmed }) {
  const { supabase, user, profile, reloadProfile } = usePortal();
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  const checks = [
    { t: 'Job title, department and line manager', done: !!(profile.job_title && profile.department && profile.line_manager_id), tab: 0 },
    { t: 'At least one qualification', done: counts.qualifications > 0, tab: 1 },
    { t: 'At least one client', done: counts.clients > 0, tab: 2 },
    { t: 'At least one project', done: counts.projects > 0, tab: 3 },
    { t: `Competencies rated (${counts.rated} of ${counts.categories})`, done: counts.categories > 0 && counts.rated >= counts.categories, tab: 4 },
    { t: 'HRB & Gateway experience (only if you have it)', done: counts.gateway > 0, optional: true, tab: 5 }
  ];

  async function confirm() {
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ confirmed_at: new Date().toISOString() }).eq('id', user.id);
    setBusy(false);
    if (!error) {
      setOk(true);
      await reloadProfile();
      onConfirmed();
    }
  }

  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }}>
      <div className="card">
        <h2>Checklist</h2>
        {checks.map((c) => (
          <div key={c.t} className="spread" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <span>
              {c.done ? '✅' : c.optional ? '➖' : '⬜'} {c.t}
            </span>
            {!c.done && <button className="linkbtn small" onClick={() => goTo(c.tab)}>Go</button>}
          </div>
        ))}
        <div className="grid grid-3" style={{ marginTop: 16 }}>
          <div className="stat"><div className="n">{counts.hrb}</div><div className="l">HRB projects</div></div>
          <div className="stat"><div className="n">{counts.gateway}</div><div className="l">Gateway entries</div></div>
          <div className="stat"><div className="n">{counts.reviewed}</div><div className="l">Areas reviewed</div></div>
        </div>
      </div>
      <div className="card soft">
        <h2>Confirm your profile</h2>
        <p className="small">
          By confirming, you&apos;re saying the information is accurate and up to date as far as you know. Please re-confirm
          whenever you finish a project or gain a qualification, and at least every six months.
        </p>
        <button className="btn" onClick={confirm} disabled={busy}>{busy ? 'Saving…' : 'I confirm this is accurate'}</button>
        {(ok || profile.confirmed_at) && (
          <p className="small" style={{ marginTop: 10 }}>Last confirmed: <b>{fmtDate(profile.confirmed_at)}</b></p>
        )}
        <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '18px 0' }} />
        <Link href={`/report/${user.id}`} className="btn secondary">View / print my report</Link>
      </div>
    </div>
  );
}
