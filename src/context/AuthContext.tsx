import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '../types';
import { config } from '../config';
import { database, isConfigured, supabase } from '../services/supabase';

const previewProfile: Profile = { id: 'preview-a', display_name: 'Bhuwan', role: 'person_a' };
interface AuthState {
  profile: Profile | null; loading: boolean; preview: boolean; error: string;
  signIn: (login: string, pin: string) => Promise<void>;
  signOut: () => Promise<void>; enterPreview: () => void; switchPreview: () => void;
}
const AuthContext = createContext<AuthState>(null!);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isConfigured);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session || !supabase) return;
    let cancelled = false;
    setLoading(true);
    supabase.from('profiles').select('id,display_name,role').eq('id', session.user.id).single().then(({ data, error: issue }) => {
      if (cancelled) return;
      if (issue || !data || !['person_a', 'person_b'].includes(data.role)) {
        setError('This account could not be verified. Check your connection and sign in again.');
        setProfile(null);
      } else { setProfile(data as Profile); setError(''); }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [session]);
  async function signIn(login: string, pin: string) {
    setError('');
    const account = config.accounts.find(a => a.login.toLowerCase() === login.trim().toLowerCase());
    if (!account) throw new Error('The login name or PIN is incorrect.');
    const { error: issue } = await database().auth.signInWithPassword({ email: account.email, password: pin });
    if (issue) throw new Error(issue.status === 429 ? 'Too many attempts. Wait a moment before trying again.' : 'The login name or PIN is incorrect.');
    setPreview(false);
  }
  async function signOut() {
    if (!preview && supabase) {
      const { error: issue } = await supabase.auth.signOut();
      if (issue) throw new Error('Couldn’t sign out. Check your connection and try again.');
    }
    setPreview(false); setProfile(null); setSession(null); setError('');
  }
  return <AuthContext.Provider value={{ profile, loading, preview, error, signIn, signOut,
    enterPreview: () => { setPreview(true); setProfile(previewProfile); setLoading(false); },
    switchPreview: () => setProfile(p => p?.role === 'person_a' ? { id: 'preview-b', display_name: 'Pooja', role: 'person_b' } : previewProfile),
  }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
