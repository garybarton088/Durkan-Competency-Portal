'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePortal } from './PortalProvider';
import { Field, Select, Chips, ClientPicker } from './ui';
import { friendlyError } from '@/lib/errors';

const SENSITIVE_HINT = "Work details only. Please don't include health or other sensitive personal information about yourself or anyone else.";

/*
  Generic add / edit / delete list for the person's own entries.
  fields: [{ name, label, type: text|number|date|textarea|select|multi|checkbox|client, list, required, full, hint }]
*/
export default function EntryList({ table, fields, title, meta, orderBy = 'created_at', ascending = false, addLabel = 'Add', emptyText, onChange }) {
  const { supabase, user, list, lookups } = usePortal();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = closed; {} = new; {id,...} = editing
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from(table).select('*').eq('staff_id', user.id).order(orderBy, { ascending });
    if (error) setErr(friendlyError(error));
    setRows(data || []);
    setLoading(false);
  }, [supabase, user, table, orderBy, ascending]);

  useEffect(() => {
    load();
  }, [load]);

  const blank = () => {
    const f = {};
    fields.forEach((fd) => {
      f[fd.name] = fd.type === 'multi' ? [] : fd.type === 'checkbox' ? false : null;
    });
    return f;
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e) {
    e.preventDefault();
    setErr('');
    const missing = fields.filter((f) => f.required && (form[f.name] == null || form[f.name] === ''));
    if (missing.length) return setErr(`Please fill in: ${missing.map((m) => m.label).join(', ')}`);

    const payload = {};
    fields.forEach((f) => {
      let v = form[f.name];
      if (f.type === 'number') v = v === '' || v == null ? null : Number(v);
      if (v === '') v = null;
      payload[f.name] = v;
    });
    setSaving(true);
    const q = form.id
      ? supabase.from(table).update(payload).eq('id', form.id)
      : supabase.from(table).insert({ ...payload, staff_id: user.id });
    const { error } = await q;
    setSaving(false);
    if (error) return setErr(friendlyError(error));
    setForm(null);
    await load();
    onChange && onChange();
  }

  async function remove(row) {
    if (!window.confirm('Delete this entry?')) return;
    const { error } = await supabase.from(table).delete().eq('id', row.id);
    if (error) return setErr(friendlyError(error));
    await load();
    onChange && onChange();
  }

  const clientName = (id) => (lookups.clients || []).find((c) => c.id === id)?.name;

  function input(f) {
    const v = form[f.name];
    switch (f.type) {
      case 'textarea':
        return <textarea value={v || ''} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} />;
      case 'number':
        return <input type="number" value={v ?? ''} onChange={(e) => set(f.name, e.target.value)} />;
      case 'date':
        return <input type="date" value={v || ''} onChange={(e) => set(f.name, e.target.value)} />;
      case 'select':
        return <Select value={v} onChange={(x) => set(f.name, x)} options={list(f.list)} />;
      case 'multi':
        return <Chips options={list(f.list)} value={v || []} onChange={(x) => set(f.name, x)} />;
      case 'checkbox':
        return null;
      case 'client':
        return <ClientPicker value={v} onChange={(x) => set(f.name, x)} />;
      default:
        return <input type="text" value={v || ''} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} />;
    }
  }

  return (
    <div>
      {err && <div className="notice err" style={{ marginBottom: 12 }}>{err}</div>}

      {form ? (
        <form className="card soft" onSubmit={save} style={{ marginBottom: 18 }}>
          <div className="grid grid-2">
            {fields.map((f) =>
              f.type === 'checkbox' ? (
                <label key={f.name} className="check" style={{ gridColumn: f.full ? '1 / -1' : undefined }}>
                  <input type="checkbox" checked={!!form[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
                  {f.label}
                </label>
              ) : (
                <div key={f.name} style={{ gridColumn: f.full || f.type === 'multi' || f.type === 'textarea' ? '1 / -1' : undefined }}>
                  <Field label={f.label + (f.required ? ' *' : '')} hint={f.hint || (f.type === 'textarea' ? SENSITIVE_HINT : undefined)}>
                    {input(f)}
                  </Field>
                </div>
              )
            )}
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" disabled={saving}>{saving ? 'Saving…' : form.id ? 'Save changes' : 'Save entry'}</button>
            <button type="button" className="btn secondary" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn" onClick={() => setForm(blank())} style={{ marginBottom: 18 }}>+ {addLabel}</button>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted">{emptyText || 'Nothing added yet.'}</p>
      ) : (
        rows.map((r) => (
          <div className="entry" key={r.id}>
            <div className="spread">
              <h3>{title(r, { clientName })}</h3>
              <div className="row">
                <button className="btn small secondary" onClick={() => setForm({ ...blank(), ...r })}>Edit</button>
                <button className="btn small danger" onClick={() => remove(r)}>Delete</button>
              </div>
            </div>
            <div className="kv">
              {(meta ? meta(r, { clientName }) : [])
                .filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length))
                .map(([k, v]) => (
                  <span key={k}>
                    {k}: <b>{Array.isArray(v) ? v.join(', ') : String(v)}</b>
                  </span>
                ))}
            </div>
            {r.description && <p className="small" style={{ margin: '8px 0 0' }}>{r.description}</p>}
          </div>
        ))
      )}
    </div>
  );
}
