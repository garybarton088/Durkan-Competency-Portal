'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePortal } from './PortalProvider';
import { SCALE } from '@/lib/constants';

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <div className="small muted" style={{ marginTop: 4 }}>{hint}</div>}
    </label>
  );
}

export function Select({ value, onChange, options = [], placeholder = 'Select…', ...rest }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} {...rest}>
      <option value="">{placeholder}</option>
      {options.map((o) => {
        const v = typeof o === 'object' ? o.value : o;
        const l = typeof o === 'object' ? o.label : o;
        return (
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </select>
  );
}

export function Chips({ options = [], value = [], onChange }) {
  const set = new Set(value || []);
  return (
    <div className="chips">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          className={'chip' + (set.has(o) ? ' on' : '')}
          onClick={() => {
            const next = new Set(set);
            next.has(o) ? next.delete(o) : next.add(o);
            onChange([...next]);
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function ScalePicker({ value, onChange, disabled }) {
  const current = SCALE.find((s) => s.value === (value ?? 0)) || SCALE[0];
  return (
    <div>
      <div className="scale">
        {SCALE.map((s) => (
          <button
            type="button"
            key={s.value}
            disabled={disabled}
            className={(value ?? 0) === s.value ? 'on' : ''}
            onClick={() => onChange && onChange(s.value)}
            title={s.desc}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="small muted" style={{ margin: '6px 0 0' }}>{current.desc}</p>
    </div>
  );
}

// Client selector with "add a new client" inline
export function ClientPicker({ value, onChange }) {
  const { supabase, lookups, list, reloadLookups } = usePortal();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [err, setErr] = useState('');

  async function add() {
    const clean = name.trim();
    if (!clean) return;
    setErr('');
    const existing = (lookups.clients || []).find((c) => c.name.toLowerCase() === clean.toLowerCase());
    if (existing) {
      onChange(existing.id);
      setAdding(false);
      setName('');
      return;
    }
    const { data, error } = await supabase.from('clients').insert({ name: clean, client_type: type || null }).select().single();
    if (error) return setErr(error.message);
    await reloadLookups();
    onChange(data.id);
    setAdding(false);
    setName('');
    setType('');
  }

  if (adding) {
    return (
      <div className="stack">
        <input type="text" placeholder="Client name, e.g. Clarion Housing" value={name} onChange={(e) => setName(e.target.value)} />
        <Select value={type} onChange={setType} options={list('client_type')} placeholder="Client type (optional)" />
        <div className="row">
          <button type="button" className="btn small" onClick={add}>Add client</button>
          <button type="button" className="btn small secondary" onClick={() => setAdding(false)}>Cancel</button>
        </div>
        {err && <div className="notice err">{err}</div>}
      </div>
    );
  }

  return (
    <div className="row" style={{ flexWrap: 'nowrap' }}>
      <Select
        value={value ? String(value) : ''}
        onChange={(v) => onChange(v ? Number(v) : null)}
        options={(lookups.clients || []).map((c) => ({ value: String(c.id), label: c.name }))}
        placeholder="Select client…"
      />
      <button type="button" className="btn small secondary" style={{ whiteSpace: 'nowrap' }} onClick={() => setAdding(true)}>
        + New
      </button>
    </div>
  );
}

export function Loading({ text = 'Loading…' }) {
  return <p className="muted">{text}</p>;
}

// Wraps pages that need a signed-in user (and optionally a role)
export function Guard({ children, allow }) {
  const { loading, user, profile, configured, error } = usePortal();
  if (!configured) return <ConfigMissing />;
  if (loading) return <Loading />;
  if (!user) {
    return (
      <p>
        Please <Link href="/login">sign in</Link>.
      </p>
    );
  }
  if (!profile) {
    return (
      <div className="notice err">
        Your profile record wasn&apos;t found{error ? ` (${error})` : ''}. Ask an administrator to check the database set-up.
      </div>
    );
  }
  if (allow && !allow(profile)) {
    return <div className="notice warn">You don&apos;t have access to this page.</div>;
  }
  return children;
}

export function ConfigMissing() {
  return (
    <div className="notice err">
      The portal isn&apos;t connected to its database. In Vercel, add the environment variables
      <b> NEXT_PUBLIC_SUPABASE_URL</b> and <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b>, then redeploy.
    </div>
  );
}
