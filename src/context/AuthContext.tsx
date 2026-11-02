import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import type { Profile } from '../types';
import { config } from '../config';
import { database, isConfigured, supabase } from '../services/supabase';
import { authReducer, initialAuthState } from './authState';

const previewProfile: Profile = { id: 'preview-a', display_name: 'Bhuwan', role: 'person_a' };
interface AuthContextValue {
  profile: Profile | null; loading: boolean; preview: boolean; error: string;
  signIn: (login: string, pin: string) => Promise<void>;
  signOut: () => Promise<void>; enterPreview: () => void; switchPreview: () => void;
}
const AuthContext = createContext<AuthContextValue>(null!);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, isConfigured, initialAuthState);
  const { profile, loading, preview, error, userId, verification } = state;
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      // The Supabase client owns token updates. UI verification follows account
      // identity, not each new session object emitted on focus or token refresh.
      dispatch({ type: 'session', userId: next?.user.id || null });
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!userId || preview || !supabase) return;
    let cancelled = false;
    Promise.resolve(supabase.from('profiles').select('id,display_name,role').eq('id', userId).single()).then(({ data, error: issue }) => {
      if (cancelled) return;
      dispatch({ type: 'verified', userId, verification, profile: issue ? null : data as Profile | null });
    }).catch(() => {
      if (!cancelled) dispatch({ type: 'verified', userId, verification, profile: null });
    });
    return () => { cancelled = true; };
  }, [userId, verification, preview]);
  async function signIn(login: string, pin: string) {
    dispatch({ type: 'clear-error' });
    const account = config.accounts.find(a => a.login.toLowerCase() === login.trim().toLowerCase());
    if (!account) throw new Error('The login name or PIN is incorrect.');
    const { error: issue } = await database().auth.signInWithPassword({ email: account.email, password: pin });
    if (issue) throw new Error(issue.status === 429 ? 'Too many attempts. Wait a moment before trying again.' : 'The login name or PIN is incorrect.');
  }
  async function signOut() {
    if (!preview && supabase) {
      const { error: issue } = await supabase.auth.signOut();
      if (issue) throw new Error('Couldn’t sign out. Check your connection and try again.');
    }
    dispatch({ type: 'logout' });
  }
  return <AuthContext.Provider value={{ profile, loading, preview, error, signIn, signOut,
    enterPreview: () => dispatch({ type: 'preview', profile: previewProfile }),
    switchPreview: () => dispatch({ type: 'preview', profile: profile?.role === 'person_a' ? { id: 'preview-b', display_name: 'Pooja', role: 'person_b' } : previewProfile }),
  }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
