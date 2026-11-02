import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2, Upload, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { database, readableError } from '../services/supabase';
import { deleteVoiceNote, uploadVoiceNote } from '../services/voiceNoteService';
import { acceptedAudio, audioFileInfo, durationLabel, MAX_VOICE_NOTES } from '../utils/audio';
import { VoiceRecorder, type RecordingState } from '../utils/voiceRecorder';
import { dateLabel, localDate } from '../utils/dates';
import type { Memory, VoiceNote } from '../types';
import { ErrorMessage, PreviewNotice, Sheet } from './ui';

interface Draft { file: File; duration: number | null }
export function VoiceNotes({ memory }: { memory: Memory }) {
  const { preview } = useAuth(), { changed } = useWorkspace();
  const notes = memory.voice_notes || [];
  const controller = useRef<VoiceRecorder | null>(null), uploadInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<RecordingState>('idle'), [elapsed, setElapsed] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null), [draftUrl, setDraftUrl] = useState('');
  const [title, setTitle] = useState(''), [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const active = status !== 'idle';
  const atLimit = notes.length >= MAX_VOICE_NOTES;
  useEffect(() => {
    const recorder = new VoiceRecorder({
      onState: setStatus, onElapsed: setElapsed, onError: setError,
      onComplete: (file, duration) => { setDraft({ file, duration }); setTitle('A little note for us'); },
    });
    controller.current = recorder;
    return () => { recorder.dispose(); controller.current = null; };
  }, []);
  useEffect(() => {
    if (!draft) { setDraftUrl(''); return; }
    const url = URL.createObjectURL(draft.file); setDraftUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft]);

  function selectFile(file?: File) {
    if (!file || preview || active || saving || atLimit) return;
    try {
      audioFileInfo(file);
      setError(''); setDraft({ file, duration: null });
      setTitle(file.name.replace(/\.[^.]+$/, '').slice(0, 160) || 'A little note for us');
    } catch (issue) { setError(readableError(issue)); }
  }
  async function save() {
    if (!draft || preview || saving || active || atLimit) return;
    setSaving(true); setError('');
    try {
      await uploadVoiceNote(memory.id, draft.file, title, draft.duration);
      setDraft(null); setTitle(''); changed('A little voice, kept with our story.');
    } catch (issue) { setError(readableError(issue)); } finally { setSaving(false); }
  }
  return <section className="voice-section" aria-labelledby="voice-heading">
    <div className="section-heading"><div><p className="eyebrow">SOME MEMORIES SOUND LIKE YOU</p><h2 id="voice-heading">Hear this moment again</h2></div><span className="voice-count">{notes.length} / {MAX_VOICE_NOTES}</span></div>
    <p className="section-description">A laugh, a little story, a few words in your own voice. Shared with just us.</p>
    <div className="voice-composer">
      <div className="voice-composer-heading"><span className="tile-icon wine"><Mic size={21} /></span><div><h3>Leave a little voice note</h3><p>Record up to 5 minutes, or upload an audio file up to 10 MB.</p></div></div>
      <PreviewNotice />
      {!draft && !active && <div className="media-actions"><button className="button primary" disabled={preview || saving || atLimit} onClick={() => { setError(''); void controller.current?.start(); }}><Mic size={16} />Record a note</button><button className="button secondary" disabled={preview || saving || atLimit} onClick={() => uploadInput.current?.click()}><Upload size={16} />Upload audio</button></div>}
      <input ref={uploadInput} type="file" accept={acceptedAudio} hidden onChange={event => { selectFile(event.target.files?.[0]); event.target.value = ''; }} />
      {active && <div className="recording-panel"><div className="recording-status" role="status"><span className={status === 'recording' ? 'recording-dot' : ''} />{status === 'requesting' ? 'Waiting for microphone permission…' : status === 'stopping' ? 'Preparing your recording…' : 'Recording your little story'}{status === 'recording' && <time>{durationLabel(elapsed)} / 5:00</time>}</div><div className="media-actions">{status === 'recording' && <button className="button primary" onClick={() => controller.current?.stop()}><Square size={14} fill="currentColor" />Stop & listen</button>}<button className="button secondary" disabled={status === 'stopping'} onClick={() => controller.current?.discard()}><X size={16} />Cancel recording</button></div></div>}
      {draft && <div className="voice-draft"><p className="eyebrow">LISTEN BEFORE YOU KEEP IT</p><audio controls preload="metadata" src={draftUrl || undefined} aria-label="Preview your unsaved voice note" /><label className="field"><span>A title (optional)</span><input value={title} maxLength={160} onChange={event => setTitle(event.target.value)} placeholder="A little note for us" disabled={saving} /></label><div className="media-actions"><button className="button primary" disabled={saving || preview || atLimit} onClick={save}>{saving ? 'Keeping your voice note…' : 'Save voice note'}</button><button className="button secondary" disabled={saving} onClick={() => { setDraft(null); setError(''); }}><Trash2 size={15} />Discard</button></div><p className="field-help">Your recording is only saved after you choose Save voice note.</p></div>}
      {atLimit && <p className="field-help">This memory already has 20 voice notes. Remove one to make room for another.</p>}
      {error && <ErrorMessage message={error} />}
    </div>
    {notes.length ? <div className="voice-list">{notes.map(note => <VoiceNoteCard key={note.id} memoryId={memory.id} note={note} />)}</div> : <p className="voice-empty">No voice notes yet. A little part of this day is waiting to be heard.</p>}
  </section>;
}

function VoiceNoteCard({ memoryId, note }: { memoryId: string; note: VoiceNote }) {
  const { profile, preview } = useAuth(), { changed } = useWorkspace();
  const [url, setUrl] = useState(''), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [deleteError, setDeleteError] = useState('');
  const author = note.created_by === profile?.id ? profile.display_name : profile?.role === 'person_a' ? 'Pooja' : 'Bhuwan';
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError('');
      try {
        const { data, error: issue } = await database().storage.from('memory-audio').createSignedUrl(note.path, 3600);
        if (issue || !data) throw new Error('Couldn’t load this voice note. Check your connection and try again.');
        if (!cancelled) setUrl(data.signedUrl);
      } catch (issue) { if (!cancelled) setError(readableError(issue)); }
    }
    void load();
    const timer = window.setInterval(() => void load(), 50 * 60 * 1000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [note.path, attempt]);
  async function remove() {
    if (busy || preview) return;
    setBusy(true); setDeleteError('');
    try { await deleteVoiceNote(memoryId, note); setConfirm(false); changed('Voice note removed.'); }
    catch (issue) { setDeleteError(readableError(issue)); } finally { setBusy(false); }
  }
  return <article className="voice-note"><header><span className="voice-note-icon"><Mic size={18} /></span><div><h3>{note.title}</h3><p>{author} · {dateLabel(localDate(note.created_at), { day: 'numeric', month: 'short', year: 'numeric' })}{note.duration_seconds ? ` · ${durationLabel(note.duration_seconds)}` : ''}</p></div><button className="icon-button danger-text" aria-label={`Delete voice note: ${note.title}`} onClick={() => setConfirm(true)}><Trash2 size={16} /></button></header>{error ? <ErrorMessage message={error} retry={() => { setUrl(''); setAttempt(n => n + 1); }} /> : url ? <audio controls preload="metadata" src={url} aria-label={`Play ${note.title}`} onError={() => setError('This recording couldn’t be played. Try loading it again, or use another browser for this audio format.')} /> : <p className="field-help" role="status">Loading our little voice note…</p>}
    {confirm && <Sheet title="Remove this voice note?" onClose={() => { if (!busy) setConfirm(false); }}><p className="delete-copy">Permanently delete “{note.title}” and its recording? This cannot be undone.</p>{deleteError && <ErrorMessage message={deleteError} />}<div className="form-footer"><button className="button secondary" disabled={busy} onClick={() => setConfirm(false)}>Keep it</button><button className="button danger" disabled={busy || preview} onClick={remove}>{busy ? 'Removing…' : 'Delete voice note'}</button></div></Sheet>}
  </article>;
}
