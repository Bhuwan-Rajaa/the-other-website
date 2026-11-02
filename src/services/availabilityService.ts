import type { Availability } from '../types';
import { database } from './supabase';

export async function getAvailability(start: string, end: string) {
  const { data, error } = await database().from('availability').select('*').lt('start_at', end).gt('end_at', start).order('start_at');
  if (error) throw new Error('Couldn’t load availability. Please try again.');
  return data as Availability[];
}
export async function saveAvailability(input: Omit<Availability, 'id'>, id?: string) {
  const query = id ? database().from('availability').update(input).eq('id', id) : database().from('availability').insert(input);
  const { error } = await query;
  if (error) throw new Error('Couldn’t save your availability. Please try again.');
}
export async function deleteAvailability(id: string) {
  const { error } = await database().from('availability').delete().eq('id', id);
  if (error) throw new Error('Couldn’t remove this availability entry.');
}
