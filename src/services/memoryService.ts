import type { Memory, MemoryInput, Photo, Role } from '../types';
import { database } from './supabase';

export async function getMemories(options: { start?: string; end?: string; completed?: boolean; search?: string; upcoming?: boolean; limit?: number } = {}) {
  let query = database().from('memories').select('*');
  if (options.start) query = query.gte('event_date', options.start);
  if (options.end) query = query.lt('event_date', options.end);
  if (options.completed) query = query.eq('status', 'completed');
  if (options.upcoming) query = query.in('status', ['planned', 'confirmed']);
  if (options.search) query = query.ilike('title', `%${options.search.replace(/[%_\\]/g, '')}%`);
  const { data, error } = await query.order('event_date', { ascending: Boolean(options.upcoming) }).order('start_time', { ascending: true }).order('id').limit(options.limit ?? 150);
  if (error) throw new Error('Couldn’t load your memories. Please try again.');
  return data as Memory[];
}
export async function getMemory(id: string) {
  const { data, error } = await database().from('memories').select('*').eq('id', id).single();
  if (error) throw new Error('This memory couldn’t be found or loaded.');
  return data as Memory;
}
export async function saveMemory(input: MemoryInput, userId: string, id?: string) {
  const query = id ? database().from('memories').update(input).eq('id', id) : database().from('memories').insert({ ...input, created_by: userId });
  const { data, error } = await query.select().single();
  if (error) throw new Error('Couldn’t save this memory. Check your connection and try again.');
  return data as Memory;
}
export async function savePov(id: string, role: Role, pov: string, rating: number | null) {
  const { data, error } = await database().from('memories').update({ [`${role}_pov`]: pov.trim() || null, [`${role}_rating`]: rating }).eq('id', id).select().single();
  if (error) throw new Error('Couldn’t save your side of the story. Please try again.');
  return data as Memory;
}
export async function addPhoto(id: string, photo: Photo) {
  const { error } = await database().rpc('append_memory_photo', { memory_id: id, photo });
  if (error) throw new Error('Couldn’t attach the photo to this memory. Please try again.');
}
export async function captionPhoto(id: string, path: string, caption: string) {
  const { error } = await database().rpc('caption_memory_photo', { memory_id: id, object_path: path, new_caption: caption });
  if (error) throw new Error('Couldn’t save the photo caption.');
}
export async function deleteMemory(memory: Memory) {
  if (memory.photos.length) {
    const { error } = await database().storage.from('memory-photos').remove(memory.photos.map(p => p.path));
    if (error) throw new Error('Couldn’t remove the photos. The memory was kept; please retry.');
  }
  const { error } = await database().from('memories').delete().eq('id', memory.id);
  if (error) throw new Error('Photos were removed, but the memory couldn’t be deleted. Please retry deleting it.');
}
