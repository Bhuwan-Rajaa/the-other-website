import { database } from './supabase';
import type { Profile } from '../types';
export async function getProfiles() {
  const { data, error } = await database().from('profiles').select('id,display_name,role').order('role');
  if (error || data.length !== 2) throw new Error('Both profiles need to be configured before you can use the shared calendar.');
  return data as Profile[];
}
