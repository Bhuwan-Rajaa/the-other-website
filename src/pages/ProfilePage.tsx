import { useState } from 'react';
import { ArrowRight, Heart, LockKeyhole, LogOut, MoonStar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { config } from '../config';
import { readableError } from '../services/supabase';
import { dateLabel } from '../utils/dates';
import { ErrorMessage } from '../components/ui';

export default function ProfilePage() {
  const { profile, preview, switchPreview, signOut } = useAuth();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function logout() { setBusy(true); setError(''); try { await signOut(); } catch (issue) { setError(readableError(issue)); } finally { setBusy(false); } }
  return <div><div className="page-heading"><div><p className="eyebrow">YOUR LITTLE CORNER</p><h1>Hello, <em>{profile?.display_name}.</em></h1><p>One half of our favourite story.</p></div></div><div className="profile-grid"><section className="profile-card"><span className={`avatar profile-avatar ${profile?.role}`}>{profile?.display_name[0]}</span><h2>{profile?.display_name}</h2><p>{profile?.role === 'person_a' ? 'BhuwanPooja' : 'PoojaBhuwan'}</p><span className="profile-private"><LockKeyhole size={13} />{preview ? 'Sample preview' : 'Our private space'}</span>{preview && <button className="button secondary" onClick={switchPreview}>View as {profile?.role === 'person_a' ? 'Pooja' : 'Bhuwan'}<ArrowRight size={15} /></button>}<button className="button secondary" onClick={logout} disabled={busy}><LogOut size={16} />{busy ? 'Signing out…' : preview ? 'Leave preview' : 'Sign out'}</button>{error && <ErrorMessage message={error} />}</section>
      <section className="profile-details"><h2>A few things about us</h2><dl><div><dt><Heart size={16} />Our beginning</dt><dd>{dateLabel(config.relationshipStart)}</dd></div><div><dt><Heart size={16} />The day we met</dt><dd>{dateLabel(config.metDate)}</dd></div><div><dt><MoonStar size={16} />Our timezone</dt><dd>{config.timezone}</dd></div><div><dt><LockKeyhole size={16} />Who’s here</dt><dd>Bhuwan & Pooja. Just us.</dd></div></dl><p className="field-help">Both sides of every story are shared. Each person edits their own reflection and availability.</p>{preview && <p className="preview-notice">This is an illustrative preview. Sample stories aren’t saved. Follow README.md to connect your private Supabase project.</p>}</section></div></div>;
}
