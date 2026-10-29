'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePortal } from '@/components/PortalProvider';
import { ConfigMissing } from '@/components/ui';
import { friendlyError } from '@/lib/errors';

export default function LoginPage() {
  const { supabase, configured, reloadProfile } = usePortal();
  const router = useRouter();
  const [mode, setMode] = useState('signin'); // signin | signup | reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('error') === 'link') {
      setMsg({ type: 'err', text: 'That email link has expired or was already used. Sign in, or request a new link.' });
    }
  }, []);

  if (!configured) {
    return (
      <div className="login-wrap">
        <div className="login-card"><ConfigMissing /></div>
      </div>
    );
  }

  const redirectTo = () => `${window.location.origin}/auth/callback`;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        await reloadProfile();
        router.replace('/');
        router.refresh();
      } else if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please enter your full name.');
        if (!/@durkan\.co\.uk$/i.test(email.trim())) throw new Error('Please use your Durkan email address (ending @durkan.co.uk).');
        if (password.length < 8) throw new Error('Use a password of at least 8 characters.');
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: redirectTo() }
        });
        if (error) throw error;
        if (data.session) {
          await reloadProfile();
          router.replace('/');
          router.refresh();
        } else {
          setMsg({ type: 'ok', text: 'Check your email and click the confirmation link to finish signing up.' });
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectTo() });
        if (error) throw error;
        setMsg({ type: 'ok', text: 'If that email has an account, a sign-in link is on its way.' });
      }
    } catch (err) {
      const text = /database error saving new user/i.test(err.message || '')
        ? 'Please use your Durkan email address (ending @durkan.co.uk).'
        : friendlyError(err) || 'Something went wrong.';
      setMsg({ type: 'err', text });
    }
    setBusy(false);
  }

  return (
    <div className="login-wrap">
      <div className="login-card card">
        <img src="/durkan-regen-logo.png" alt="Durkan Regen" />
        <h1 style={{ textAlign: 'center', fontSize: 22 }}>Competency Portal</h1>
        <p className="muted small" style={{ textAlign: 'center' }}>
          {mode === 'signin' && 'Sign in with your work email.'}
          {mode === 'signup' && 'Create your account with your Durkan email address.'}
          {mode === 'reset' && "We'll email you a link to sign in and set a new password."}
        </p>
        <form onSubmit={submit} className="stack">
          {mode === 'signup' && (
            <label className="field">
              <span>Full name</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
          )}
          <label className="field">
            <span>Work email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          {mode !== 'reset' && (
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
              />
            </label>
          )}
          <button className="btn" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send link'}
          </button>
        </form>
        {mode === 'signup' && (
          <p className="small muted" style={{ marginTop: 12, textAlign: 'center' }}>
            Before you create an account, please read the <a href="/privacy" target="_blank" rel="noreferrer">privacy notice</a>.
            It explains what&apos;s recorded, who can see it and how long it&apos;s kept.
          </p>
        )}
        {msg && <div className={'notice ' + (msg.type === 'err' ? 'err' : '')} style={{ marginTop: 14 }}>{msg.text}</div>}
        <div className="row small" style={{ justifyContent: 'center', marginTop: 16, gap: 16 }}>
          {mode !== 'signin' && <button className="linkbtn" onClick={() => setMode('signin')}>Sign in</button>}
          {mode !== 'signup' && <button className="linkbtn" onClick={() => setMode('signup')}>Create an account</button>}
          {mode !== 'reset' && <button className="linkbtn" onClick={() => setMode('reset')}>Forgot password?</button>}
        </div>
      </div>
    </div>
  );
}
