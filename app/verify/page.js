'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/components/PortalProvider';
import { Guard, Field, ScalePicker } from '@/components/ui';
import { scaleLabel, fmtDate } from '@/lib/constants';
import { friendlyError } from '@/lib/errors';

export default function VerifyPage() {
  return (
    <Guard>
      <Verify />
    </Guard>
  );
}

function Verify() {
  const { supabase, user, profile, lookups } = usePortal();
  const [selected, setSelected] = useState(null);
  const [progress, setProgress] = useState({});

  const isSenior = profile.role === 'senior';
  const people = (lookups.people || []).filter(
    (p) => p.id !== user.id && (isSenior || p.line_manager_id === user.id)
  );
  const direct = people.filter((p) => p.line_manager_id === user.id);
  const others = people.filter((p) => p.line_manager_id !== user.id);

  const loadProgress = useCallback(async () => {
    const { data } = await supabase.from('competency_assessments').select('staff_id, self_rating, reviewed_at');
    const m = {};
    (data || []).forEach((r) => {
      if (r.staff_id === user.id) return;
      m[r.staff_id] = m[r.staff_id] || { rated: 0, toReview: 0 };
      if (r.self_rating > 0) m[r.staff_id].rated++;
      if (r.self_rating > 0 && !r.reviewed_at) m[r.staff_id].toReview++;
    });
    setProgress(m);
  }, [supabase, user]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  if (!people.length) {
    return (
      <>
        <h1>Review</h1>
        <p className="muted">
          No one has selected you as their line manager yet. Once they do, they&apos;ll appear here for you to review.
        </p>
      </>
    );
  }

  const person = people.find((p) => p.id === selected);

  return (
    <>
      <h1>Review competencies</h1>
      <p className="muted">
        Read each person&apos;s self-assessment and evidence, then record your own rating and a short comment. Save each area as you go.
        {isSenior && ' As a senior you can review anyone, but not your own entries.'}
      </p>
      <div className="grid review-grid">
        <div className="card" style={{ padding: 10 }}>
          <PeopleGroup title="My direct reports" list={direct} selected={selected} onSelect={setSelected} progress={progress} />
          {isSenior && <PeopleGroup title="Everyone else" list={others} selected={selected} onSelect={setSelected} progress={progress} />}
        </div>
        <div>
          {person ? (
            <PersonReview key={person.id} person={person} onSaved={loadProgress} />
          ) : (
            <p className="muted">Choose someone on the left.</p>
          )}
        </div>
      </div>
    </>
  );
}

function PeopleGroup({ title, list, selected, onSelect, progress }) {
  if (!list.length) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="small muted" style={{ fontWeight: 700, padding: '6px 8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
        {title}
      </div>
      {list.map((p) => {
        const pr = progress[p.id];
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="spread"
            style={{
              width: '100%', textAlign: 'left', border: 0, borderRadius: 8, padding: '8px 10px', cursor: 'pointer', font: 'inherit',
              background: selected === p.id ? 'var(--teal-soft)' : 'transparent'
            }}
          >
            <span>
              <b style={{ color: 'var(--navy)' }}>{p.full_name}</b>
              <br />
              <span className="small muted">{p.job_title || p.department || ''}</span>
            </span>
            {pr?.toReview ? <span className="tag amber">{pr.toReview} to review</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function PersonReview({ person, onSaved }) {
  const { supabase, lookups } = usePortal();
  const [rows, setRows] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('competency_assessments').select('*').eq('staff_id', person.id);
    const map = {};
    (data || []).forEach((r) => (map[r.category_id] = r));
    setRows(map);
  }, [supabase, person.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!rows) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="spread" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>{person.full_name}</h2>
          <span className="muted small">{person.job_title}</span>
        </div>
        <Link className="btn secondary small" href={`/report/${person.id}`}>Full report</Link>
      </div>
      <div className="stack">
        {(lookups.categories || []).map((c) => (
          <ReviewCard key={c.id} staffId={person.id} cat={c} row={rows[c.id]} onSaved={() => { load(); onSaved(); }} />
        ))}
      </div>
    </>
  );
}

function ReviewCard({ staffId, cat, row, onSaved }) {
  const { supabase } = usePortal();
  const [rating, setRating] = useState(row?.manager_rating ?? row?.self_rating ?? 0);
  const [comment, setComment] = useState(row?.manager_comment || '');
  const [state, setState] = useState(null);

  async function save() {
    setState('saving');
    const { error } = await supabase
      .from('competency_assessments')
      .upsert({ staff_id: staffId, category_id: cat.id, manager_rating: rating, manager_comment: comment.trim() || null }, { onConflict: 'staff_id,category_id' });
    if (error) return setState(friendlyError(error));
    setState('saved');
    onSaved();
  }

  return (
    <div className={'card ' + (cat.is_bsa ? 'bsa' : 'accent')}>
      <div className="spread">
        <h3 style={{ margin: 0 }}>
          {cat.name} {cat.is_bsa && <span className="tag navy">BSA</span>}
        </h3>
        {row?.reviewed_at ? <span className="tag teal">Reviewed {fmtDate(row.reviewed_at)}</span> : <span className="tag amber">Not reviewed</span>}
      </div>
      <div className="notice" style={{ margin: '10px 0', background: 'var(--panel)', color: 'var(--ink)' }}>
        <b>Self-assessment: {scaleLabel(row?.self_rating ?? 0)}</b>
        <div className="small" style={{ marginTop: 4 }}>{row?.self_evidence || <span className="muted">No evidence given.</span>}</div>
      </div>
      <Field label="Your rating"><ScalePicker value={rating} onChange={setRating} /></Field>
      <div style={{ marginTop: 10 }}>
        <Field label="Comment">
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Agree / disagree, and why. Any development needed?" />
        </Field>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn small" onClick={save} disabled={state === 'saving'}>{state === 'saving' ? 'Saving…' : 'Save review'}</button>
        {state === 'saved' && <span className="tag teal">Saved</span>}
        {state && !['saving', 'saved'].includes(state) && <span className="notice err">{state}</span>}
      </div>
    </div>
  );
}
