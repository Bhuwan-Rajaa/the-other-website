import { database } from './supabase';
import { audioFileInfo } from '../utils/audio';
import type { VoiceNote } from '../types';

export async function uploadVoiceNote(memoryId: string, file: File, title: string, duration: number | null) {
  const { contentType, extension } = audioFileInfo(file);
  const id = crypto.randomUUID(), path = `memories/${memoryId}/${id}.${extension}`;
  const client = database();
  const { error: uploadError } = await client.storage.from('memory-audio').upload(path, file, { contentType, upsert: false });
  if (uploadError) throw new Error('Couldn’t upload this voice note. Check your connection and that the voice-note update is installed.');
  const { data, error } = await client.rpc('append_memory_voice_note', {
    memory_id: memoryId, note_id: id, object_path: path,
    note_title: title.trim() || 'A little note for us', duration_seconds: duration,
  });
  if (error) {
    // An interrupted response might follow a successful attachment. Only remove
    // the uploaded object if a subsequent read confirms it is unreferenced.
    const check = await client.from('memories').select('voice_notes').eq('id', memoryId).single();
    if (!check.error && !check.data.voice_notes.some((note: VoiceNote) => note.id === id)) {
      await client.storage.from('memory-audio').remove([path]);
    } else if (!check.error) { return check.data.voice_notes.find((note: VoiceNote) => note.id === id) as VoiceNote; }
    throw new Error('Couldn’t finish saving this voice note. Refresh the memory to check whether it was saved before retrying.');
  }
  return data as VoiceNote;
}

export async function deleteVoiceNote(memoryId: string, note: VoiceNote) {
  const client = database();
  const { error: storageError } = await client.storage.from('memory-audio').remove([note.path]);
  if (storageError) throw new Error('Couldn’t remove the recording. Your voice note was kept; please retry.');
  const { error } = await client.rpc('remove_memory_voice_note', { memory_id: memoryId, note_id: note.id });
  if (error) throw new Error('The recording was removed, but its entry couldn’t be cleared. Please retry removing it.');
}
