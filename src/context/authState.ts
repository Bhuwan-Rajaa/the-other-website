import type { Profile } from '../types.ts';

export interface AuthSnapshot {
  userId: string | null;
  profile: Profile | null;
  loading: boolean;
  error: string;
  preview: boolean;
  verification: number;
}
export type AuthAction =
  | { type: 'session'; userId: string | null }
  | { type: 'verified'; userId: string; verification: number; profile: Profile | null }
  | { type: 'preview'; profile: Profile }
  | { type: 'clear-error' }
  | { type: 'logout' };

export function initialAuthState(configured: boolean): AuthSnapshot {
  return { userId: null, profile: null, loading: configured, error: '', preview: false, verification: 0 };
}

export function authReducer(state: AuthSnapshot, action: AuthAction): AuthSnapshot {
  switch (action.type) {
    case 'session': {
      if (action.userId === state.userId && !state.preview) {
        // SIGNED_IN can repeat on tab focus. Token refreshes also keep the same
        // account: neither should replace a verified page with a loading screen.
        if (action.userId && (state.profile || state.loading)) return state;
        if (!action.userId && !state.loading) return state;
      }
      return { ...state, userId: action.userId, profile: null, loading: Boolean(action.userId),
        error: '', preview: false, verification: state.verification + 1 };
    }
    case 'verified': {
      // An old profile request must not restore an account after logout or an
      // account change, including signing back into the same account quickly.
      if (state.preview || action.userId !== state.userId || action.verification !== state.verification) return state;
      const profile = action.profile?.id === state.userId && ['person_a', 'person_b'].includes(action.profile.role)
        ? action.profile : null;
      return { ...state, profile, loading: false,
        error: profile ? '' : 'This account could not be verified. Check your connection and sign in again.' };
    }
    case 'preview':
      return { ...state, userId: null, profile: action.profile, preview: true, loading: false, error: '', verification: state.verification + 1 };
    case 'clear-error':
      return state.error ? { ...state, error: '' } : state;
    case 'logout':
      return { ...initialAuthState(false), verification: state.verification + 1 };
  }
}
