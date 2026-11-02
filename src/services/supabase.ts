import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const isConfigured = Boolean(url && key);
export const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}) : null;
export function database() {
  if (!supabase) throw new Error('Connect Supabase to save your stories. See README.md for setup.');
  if (!navigator.onLine) throw new Error('You appear to be offline. Reconnect and try again; your changes have not been saved.');
  return supabase;
}
export function readableError(error: unknown) {
  if (!navigator.onLine) return 'You appear to be offline. Reconnect and try again; your changes have not been saved.';
  if (error instanceof Error && /fetch|network/i.test(error.message)) return 'We couldn’t connect. Check your connection and try again.';
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
