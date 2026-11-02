import type { Milestone } from '../types';
import { database } from './supabase';

export async function getMilestones() {
  const { data, error } = await database().from('milestones').select('*').order('milestone_date');
  if (error) throw new Error('Couldn’t load milestones. Please try again.');
  return data as Milestone[];
}
export async function saveMilestone(input: Omit<Milestone, 'id'>, id?: string) {
  const query = id ? database().from('milestones').update(input).eq('id', id) : database().from('milestones').insert(input);
  const { data, error } = await query.select().single();
  if (error) throw new Error('Couldn’t save this milestone. Please try again.');
  return data as Milestone;
}
export async function deleteMilestone(milestone: Milestone) {
  if (milestone.photo_path) {
    const { error } = await database().storage.from('memory-photos').remove([milestone.photo_path]);
    if (error) throw new Error('Couldn’t remove the milestone photo. Please try again.');
  }
  const { error } = await database().from('milestones').delete().eq('id', milestone.id);
  if (error) throw new Error('Couldn’t delete this milestone. Please retry.');
}
