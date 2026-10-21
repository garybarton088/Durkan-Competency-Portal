'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/components/PortalProvider';
import { Guard, Field, Select } from '@/components/ui';
import { canSearch, scaleLabel, SCALE } from '@/lib/constants';

export default function SearchPage() {
  return (
    <Guard allow={canSearch}>
      <Search />
    </Guard>
  );
}

const EMPTY = {
  text: '', department: null, sector: null, building_type: null, work_type: null, project_role: null,
  client_id: null, contract_form: null, hrb: false, occupied: false, gateway_stage: null, dutyholder_role: null,
  category_id: null, min_rating: 3, verified_only: false
};

function Search() {
  const { supabase, list, lookups } = usePortal();
  const [data, setData] = useState(null);
  const [f, setF] = useState(EMPTY);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    (async () => {
      const [p, e, g, c, a, q] = await Promise.all([
        supabase.from('staff_overview').select('*').order('full_name'),
        supabase.from('staff_experience').select('*'),
        supabase.from('gateway_experience').select('*'),
        supabase.from('client_experience').select('*'),
        supabase.from('competency_assessments').select('*'),
        supabase.from('qualifications').select('*')
      ]);
      setData({
        people: p.data || [],
        projects: e.data || [],
        gateway: g.data || [],
        clients: c.data || [],
        assess: a.data || [],
        quals: q.data || []
      });
    })();
  }, [supabase]);

  const clientName = (id) => (lookups.clients || []).find((c) => c.id === id)?.name || '';

  const results = useMemo(() => {
    if (!data) return [];
    const by = (arr) => {
      const m = {};
      arr.forEach((r) => (m[r.staff_id] = m[r.staff_id] || []).push(r));
      return m;
    };
    const P = by(data.projects), G = by(data.gateway), C = by(data.clients), A = by(data.assess), Q = by(data.quals);
    const text = f.text.trim().toLowerCase();
    const projectFilters = f.sector || f.building_type || f.work_type || f.project_role || f.contract_form || f.hrb || f.occupied;

    return data.people
      .map((person) => {
        const projects = P[person.id] || [];
        const gateway = G[person.id] || [];
        const clients = C[person.id] || [];
        const assess = A[person.id] || [];
        const quals = Q[person.id] || [];

        if (f.department && person.department !== f.department) return null;

        let matchedProjects = projects.filter(
          (p) =>
            (!f.sector || p.sector === f.sector) &&
            (!f.building_type || p.building_type === f.building_type) &&
            (!f.work_type || (p.work_types || []).includes(f.work_type)) &&
            (!f.project_role || p.project_role === f.project_role) &&
            (!f.contract_form || p.contract_form === f.contract_form) &&
            (!f.hrb || p.is_hrb) &&
            (!f.occupied || p.occupied) &&
            (!f.client_id || p.client_id === f.client_id)
        );
        if (projectFilters && !matchedProjects.length) return null;

        if (f.client_id) {
          const known = clients.some((c) => c.client_id === f.client_id) || matchedProjects.length || gateway.some((g) => g.client_id === f.client_id);
          if (!known) return null;
        }

        const matchedGateway = gateway.filter(
          (g) => (!f.gateway_stage || g.stage === f.gateway_stage) && (!f.dutyholder_role || g.dutyholder_role === f.dutyholder_role)
        );
        if ((f.gateway_stage || f.dutyholder_role) && !matchedGateway.length) return null;

        let comp = null;
        if (f.category_id) {
          comp = assess.find((a) => a.category_id === f.category_id);
          const r = comp ? (f.verified_only ? (comp.reviewed_at ? comp.manager_rating : null) : comp.reviewed_at ? comp.manager_rating : comp.self_rating) : null;
          if (r == null || r < f.min_rating) return null;
        }

        if (text) {
          const hay = [
            person.full_name, person.job_title, person.department,
            ...projects.map((p) => `${p.project_name} ${p.description || ''} ${p.location || ''} ${clientName(p.client_id)}`),
            ...gateway.map((g) => `${g.project_name} ${g.description || ''}`),
            ...quals.map((q) => `${q.title} ${q.body || ''}`),
            ...clients.map((c) => clientName(c.client_id))
          ].join(' ').toLowerCase();
          if (!text.split(/\s+/).every((w) => hay.includes(w))) return null;
          if (!projectFilters) {
            matchedProjects = projects.filter((p) => `${p.project_name} ${p.description || ''} ${clientName(p.client_id)}`.toLowerCase().includes(text));
          }
        }

        const score = matchedProjects.length * 2 + (matchedGateway.length || 0) * 3 + Number(person.hrb_projects || 0) + (comp?.manager_rating || comp?.self_rating || 0);
        return { person, matchedProjects, matchedGateway, comp, quals, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
  }, [data, f, lookups.clients]);

  const anyFilter = JSON.stringify(f) !== JSON.stringify(EMPTY);
  const clientOptions = (lookups.clients || []).map((c) => ({ value: String(c.id), label: c.name }));
  const catOptions = (lookups.categories || []).map((c) => ({ value: String(c.id), label: c.name }));

  return (
    <>
      <h1>Tender search</h1>
      <p className="muted">Find the right people for a bid. Combine filters. Results are ranked by how much relevant experience each person has.</p>

      <div className="card soft" style={{ marginBottom: 20 }}>
        <div className="grid grid-4">
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Keywords">
              <input type="search" value={f.text} onChange={(e) => set('text', e.target.value)} placeholder="Name, project, client, qualification, e.g. “cladding Southwark”" />
            </Field>
          </div>
          <Field label="Department"><Select value={f.department} onChange={(v) => set('department', v)} options={list('department')} placeholder="Any" /></Field>
          <Field label="Client"><Select value={f.client_id ? String(f.client_id) : ''} onChange={(v) => set('client_id', v ? Number(v) : null)} options={clientOptions} placeholder="Any" /></Field>
          <Field label="Sector"><Select value={f.sector} onChange={(v) => set('sector', v)} options={list('sector')} placeholder="Any" /></Field>
          <Field label="Building type"><Select value={f.building_type} onChange={(v) => set('building_type', v)} options={list('building_type')} placeholder="Any" /></Field>
          <Field label="Type of work"><Select value={f.work_type} onChange={(v) => set('work_type', v)} options={list('work_type')} placeholder="Any" /></Field>
          <Field label="Role on project"><Select value={f.project_role} onChange={(v) => set('project_role', v)} options={list('project_role')} placeholder="Any" /></Field>
          <Field label="Form of contract"><Select value={f.contract_form} onChange={(v) => set('contract_form', v)} options={list('contract_form')} placeholder="Any" /></Field>
          <Field label="Gateway / BSA activity"><Select value={f.gateway_stage} onChange={(v) => set('gateway_stage', v)} options={list('gateway_stage')} placeholder="Any" /></Field>
          <Field label="Dutyholder role"><Select value={f.dutyholder_role} onChange={(v) => set('dutyholder_role', v)} options={list('dutyholder_role')} placeholder="Any" /></Field>
          <Field label="Competency area"><Select value={f.category_id ? String(f.category_id) : ''} onChange={(v) => set('category_id', v ? Number(v) : null)} options={catOptions} placeholder="Any" /></Field>
          <Field label="…rated at least">
            <Select
              value={String(f.min_rating)}
              onChange={(v) => set('min_rating', Number(v || 1))}
              options={SCALE.filter((s) => s.value > 0).map((s) => ({ value: String(s.value), label: s.label }))}
              placeholder="Any"
              disabled={!f.category_id}
            />
          </Field>
          <div className="stack" style={{ alignSelf: 'end' }}>
            <label className="check"><input type="checkbox" checked={f.hrb} onChange={(e) => set('hrb', e.target.checked)} /> HRB projects only</label>
            <label className="check"><input type="checkbox" checked={f.occupied} onChange={(e) => set('occupied', e.target.checked)} /> Occupied works</label>
            <label className="check"><input type="checkbox" checked={f.verified_only} disabled={!f.category_id} onChange={(e) => set('verified_only', e.target.checked)} /> Reviewed ratings only</label>
          </div>
        </div>
        {anyFilter && <button className="linkbtn small" style={{ marginTop: 12 }} onClick={() => setF(EMPTY)}>Clear all filters</button>}
      </div>

      {!data ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <p className="small muted"><b>{results.length}</b> {results.length === 1 ? 'person matches' : 'people match'}</p>
          <div className="stack">
            {results.map(({ person, matchedProjects, matchedGateway, comp }) => (
              <div className="card" key={person.id}>
                <div className="spread">
                  <div>
                    <h3 style={{ margin: 0 }}>{person.full_name}</h3>
                    <span className="small muted">{[person.job_title, person.department].filter(Boolean).join(' · ')}</span>
                  </div>
                  <div className="row">
                    {person.hrb_projects > 0 && <span className="tag navy">{person.hrb_projects} HRB</span>}
                    {person.gateway_entries > 0 && <span className="tag navy">{person.gateway_entries} Gateway</span>}
                    <span className="tag">{person.projects} projects</span>
                    {comp && <span className="tag teal">{scaleLabel(comp.reviewed_at ? comp.manager_rating : comp.self_rating)}{comp.reviewed_at ? ' ✓' : ''}</span>}
                    <Link className="btn small secondary" href={`/report/${person.id}`}>Report</Link>
                  </div>
                </div>
                {(anyFilter ? matchedProjects : []).slice(0, 4).map((p) => (
                  <div key={p.id} className="small" style={{ marginTop: 8 }}>
                    <b>{p.project_name}</b>
                    <span className="muted"> · {[clientName(p.client_id), p.project_role, p.value_band, p.is_hrb && 'HRB'].filter(Boolean).join(' · ')}</span>
                  </div>
                ))}
                {(f.gateway_stage || f.dutyholder_role ? matchedGateway : []).slice(0, 3).map((g) => (
                  <div key={g.id} className="small" style={{ marginTop: 8 }}>
                    <b>{g.project_name}</b> <span className="muted">· {g.stage} · {g.dutyholder_role}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
