import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Sparkles } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isConfigured, readableError } from '../services/supabase';
import { ErrorMessage, Loading, Logo } from '../components/ui';

export default function LoginPage() {
  const auth = useAuth(), navigate = useNavigate();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [showPin, setShowPin] = useState(false);
  if (auth.loading) return <Loading />;
  if (auth.profile) return <Navigate to="/" replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const values = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try { await auth.signIn(String(values.get('login')), String(values.get('pin'))); navigate('/'); }
    catch (issue) { setError(readableError(issue)); } finally { setBusy(false); }
  }
  return <main className="login-page"><div className="login-art" aria-hidden="true"><div className="moon-orbit"><span className="illustrated-moon" /></div><div className="login-art-copy"><span className="eyebrow">BHUWAN & POOJA</span><h1>Some stories<br />are just <em>ours.</em></h1><p>A little space for our plans, our stories,<br />and everything in between.</p><span className="tiny-stars">✧ &nbsp; ✦ &nbsp; ✧</span></div></div>
    <section className="login-panel"><Logo /><div className="login-form-wrap"><p className="eyebrow">OUR LITTLE CORNER OF THE WORLD</p><h2>Back to us.</h2><p className="muted">Your favourite moments are right here.</p>
      <form onSubmit={submit} className="editor-form" aria-describedby={error || auth.error ? 'login-error' : undefined}><label className="field"><span>Our names, your order</span><input name="login" placeholder="Your login name" autoComplete="username" required maxLength={100} autoCapitalize="none" spellCheck={false} aria-describedby={error || auth.error ? 'login-error' : undefined} /></label>
        <label className="field"><span>Your PIN</span><span className="password-input"><input name="pin" type={showPin ? 'text' : 'password'} inputMode="numeric" pattern="[0-9]+" autoComplete="current-password" placeholder="Your little key" required maxLength={128} /><button type="button" className="icon-button" aria-label={showPin ? 'Hide PIN' : 'Show PIN'} onClick={() => setShowPin(v => !v)}>{showPin ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        {(error || auth.error) && <ErrorMessage id="login-error" message={error || auth.error} />}
        <button className="button primary login-submit" disabled={busy || !isConfigured}>{busy ? 'Opening our little world…' : 'Come on in'}<ArrowRight size={18} /></button>
      </form><p className="login-privacy"><LockKeyhole size={13} />A private space. Just the two of you.</p>
      {!isConfigured && <div className="setup-note"><span className="eyebrow">ALMOST OURS</span><p>Sign-in will be ready once Supabase is connected. For now, take a little look around.</p><button className="button secondary" onClick={() => { auth.enterPreview(); navigate('/'); }}><Sparkles size={16} />Explore the sample preview<ArrowRight size={16} /></button></div>}
    </div><p className="login-footer">Made for our ordinary, extraordinary little life.</p></section>
  </main>;
}
