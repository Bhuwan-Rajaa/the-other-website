import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace, type Editor } from '../context/WorkspaceContext';
import { saveMemory, uploadMemoryPhoto } from '../services/memoryService';
import { deleteAvailability, saveAvailability } from '../services/availabilityService';
import { saveMilestone } from '../services/milestoneService';
import { readableError, database } from '../services/supabase';
import { addDays, atLocal, dayBounds, localDate, localTime, today } from '../utils/dates';
import { allowedImages, uploadImage, validateImage } from '../utils/imageUpload';
import type { Memory, Status } from '../types';
import { ErrorMessage, PreviewNotice, Sheet } from './ui';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
export function Editors() {
  const { editor, closeEditor } = useWorkspace();
  if (!editor) return null;
  const title = editor.type === 'memory' ? editor.memory ? 'A little edit to our story' : editor.status === 'completed' ? 'Keep a little moment' : 'Make time for us' : editor.type === 'availability' ? 'A little room for us' : 'Mark a meaningful day';
  return <Sheet title={title} subtitle="OUR STORY, STILL UNFOLDING" onClose={closeEditor}>
    <PreviewNotice />
    {editor.type === 'memory' ? <MemoryEditor key={editor.memory?.id || 'new'} editor={editor} /> : editor.type === 'availability' ? <AvailabilityEditor key={editor.entry?.id || 'new'} editor={editor} /> : <MilestoneEditor key={editor.milestone?.id || 'new'} editor={editor} />}
  </Sheet>;
}
function MemoryEditor({ editor }: { editor: Extract<Editor, { type: 'memory' }> }) {
  const { profile, preview } = useAuth();
  const { changed, closeEditor } = useWorkspace();
  const navigate = useNavigate();
  const memory = editor.memory;
  const [savedMemory, setSavedMemory] = useState<Memory | undefined>(memory);
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState(''), [saving, setSaving] = useState(false);
  function selectPhotos(files: FileList | null) {
    if (!files || saving || preview) return;
    try {
      const selected = Array.from(files);
      selected.forEach(validateImage);
      if ((savedMemory?.photos.length || 0) + photos.length + selected.length > 50) throw new Error('A memory can hold up to 50 photos.');
      setPhotos(current => [...current, ...selected]); setError('');
    } catch (issue) { setError(readableError(issue)); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (preview || saving) return;
    const values = new FormData(event.currentTarget);
    const text = (key: string) => String(values.get(key) || '').trim();
    if (!text('title')) { setError('Give this moment a title before saving.'); return; }
    if (text('end') && !text('start')) { setError('Add a start time when you enter an end time.'); return; }
    setSaving(true); setError('');
    let detailsSaved = false;
    try {
      const extras = { ...memory?.extras };
      for (const key of ['activity', 'song', 'quote', 'expense', 'tickets']) {
        const value = text(key); if (value) extras[key] = value; else delete extras[key];
      }
      const saved = await saveMemory({ title: text('title'), event_date: text('date'), status: text('status') as Status,
        location: text('location') || null, start_time: text('start') || null, end_time: text('end') || null,
        description: text('description') || null, extras,
      }, profile!.id, savedMemory?.id);
      setSavedMemory(saved); detailsSaved = true;
      let count = 0;
      for (const file of photos) {
        const photo = await uploadMemoryPhoto(saved.id, file, saved.photos.length + count);
        count++;
        setPhotos(current => current.filter(item => item !== file));
        setSavedMemory(current => current ? { ...current, photos: [...current.photos, photo] } : current);
      }
      changed(memory ? 'Our story, updated.' : 'A new little moment, kept.'); closeEditor(); navigate(`/memories/${saved.id}`);
    } catch (issue) { setError(`${detailsSaved ? 'Your memory was saved, but some photos couldn’t be added. Retry to add the remaining photos, or open the saved memory. ' : ''}${readableError(issue)}`); } finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="editor-form">
    <Field label="What shall we call it? *"><input name="title" placeholder="An evening we’ll remember" defaultValue={memory?.title} maxLength={160} required autoFocus /></Field>
    <div className="form-row"><Field label="Date *"><input name="date" type="date" defaultValue={memory?.event_date || editor.date} required /></Field>
      <Field label="Our plan’s status"><select name="status" defaultValue={memory?.status || editor.status}><option value="planned">Planned · an idea for us</option><option value="confirmed">Confirmed · it’s a date</option><option value="completed">Completed · a memory</option><option value="cancelled">Cancelled</option></select></Field></div>
    <div className="form-row"><Field label="Start time"><input name="start" type="time" defaultValue={memory?.start_time?.slice(0, 5)} /></Field><Field label="End time"><input name="end" type="time" defaultValue={memory?.end_time?.slice(0, 5)} /></Field></div>
    <p className="field-help">An end time earlier than the start means the following day. Add a start time if you enter an end time.</p>
    <Field label="Where?"><input name="location" placeholder="A place, or just somewhere together" defaultValue={memory?.location || ''} maxLength={250} /></Field>
    <Field label="A few words"><textarea name="description" rows={3} placeholder="The little things you want to remember…" defaultValue={memory?.description || ''} maxLength={10000} /></Field>
    <div className="form-photos"><Field label="Photos (optional)"><input type="file" accept={allowedImages} multiple disabled={saving || preview} onChange={event => { selectPhotos(event.target.files); event.target.value = ''; }} /></Field><label className={`button secondary camera-picker ${saving || preview ? 'disabled' : ''}`}><Camera size={16} />Take a photo<input className="sr-only" type="file" accept={allowedImages} capture="environment" disabled={saving || preview} onChange={event => { selectPhotos(event.target.files); event.target.value = ''; }} /></label>{photos.length > 0 && <ul className="pending-photos">{photos.map((file, index) => <li key={`${file.name}-${index}`}><span>{file.name}</span><button type="button" className="icon-button" aria-label={`Remove selected photo: ${file.name}`} disabled={saving} onClick={() => setPhotos(current => current.filter((_, i) => i !== index))}><X size={16} /></button></li>)}</ul>}</div>
    <details className="extra-details"><summary>Add little details <span>category, song, quote & more</span></summary>
      <Field label="Activity"><input name="activity" placeholder="Date night, a little escape…" defaultValue={memory?.extras.activity} maxLength={100} /></Field>
      <Field label="Our song"><input name="song" defaultValue={memory?.extras.song} maxLength={500} /></Field>
      <Field label="Words worth keeping"><textarea name="quote" defaultValue={memory?.extras.quote} maxLength={1000} /></Field>
      <Field label="Expense note"><input name="expense" placeholder="Optional amount and currency" defaultValue={memory?.extras.expense} maxLength={250} /></Field>
      <Field label="Tickets & booking details"><textarea name="tickets" defaultValue={memory?.extras.tickets} maxLength={2000} /></Field>
    </details>
    <p className="field-help">You can add more photos, record a voice note, and write your side of the story after saving.</p>
    {error && <ErrorMessage message={error} />}
    {error && savedMemory && <button type="button" className="text-link" disabled={saving} onClick={() => { changed('Our story, refreshed.'); closeEditor(); navigate(`/memories/${savedMemory.id}`); }}>Open saved memory</button>}
    <div className="form-footer"><button type="button" className="button secondary" onClick={closeEditor} disabled={saving}>Cancel</button><button className="button primary" disabled={saving || preview}><Check size={17} />{saving ? 'Keeping this moment…' : memory ? 'Save changes' : 'Save our moment'}</button></div>
  </form>;
}
function AvailabilityEditor({ editor }: { editor: Extract<Editor, { type: 'availability' }> }) {
  const { profile, preview } = useAuth();
  const { changed, closeEditor } = useWorkspace();
  const entry = editor.entry;
  const [allDay, setAllDay] = useState(entry?.all_day ?? true);
  const [error, setError] = useState(''), [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (preview || saving) return;
    const values = new FormData(event.currentTarget), date = String(values.get('date'));
    setSaving(true); setError('');
    try {
      const start = String(values.get('start')), end = String(values.get('end'));
      const bounds = allDay ? dayBounds(date) : { start_at: atLocal(date, start), end_at: atLocal(end <= start ? addDays(date, 1) : date, end) };
      await saveAvailability({ user_id: profile!.id, ...bounds, all_day: allDay,
        status: String(values.get('status')) as 'available' | 'busy' | 'maybe', note: String(values.get('note') || '').trim() || null,
      }, entry?.id);
      changed('Your availability, updated.'); closeEditor();
    } catch (issue) { setError(readableError(issue)); } finally { setSaving(false); }
  }
  async function remove() {
    if (!entry || preview || saving) return;
    setSaving(true); setError('');
    try { await deleteAvailability(entry.id); changed('Availability removed.'); closeEditor(); }
    catch (issue) { setError(readableError(issue)); } finally { setSaving(false); }
  }
  return <form className="editor-form" onSubmit={submit}>
    <p className="form-intro">Your schedule is shared with {profile?.role === 'person_a' ? 'Pooja' : 'Bhuwan'}. Only you can change it.</p>
    <Field label="Date"><input name="date" type="date" defaultValue={entry ? localDate(entry.start_at) : editor.date} required /></Field>
    <Field label="How’s your day looking?"><select name="status" defaultValue={entry?.status || 'available'}><option value="available">Available · let’s make a plan</option><option value="busy">Busy · another time</option><option value="maybe">Maybe · we’ll see</option></select></Field>
    <label className="checkbox-field"><input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} />All day</label>
    {!allDay && <><div className="form-row"><Field label="From"><input name="start" type="time" defaultValue={entry ? localTime(entry.start_at) : '17:00'} required /></Field><Field label="Until"><input name="end" type="time" defaultValue={entry ? localTime(entry.end_at) : '21:00'} required /></Field></div><p className="field-help">If the end is earlier than the start, the slot continues into the next day.</p></>}
    <Field label="A little note (optional)"><input name="note" defaultValue={entry?.note || ''} placeholder="Free after work…" maxLength={500} /></Field>
    {error && <ErrorMessage message={error} />}
    <div className="form-footer">{entry && <button type="button" className="button danger" onClick={remove} disabled={saving || preview}><Trash2 size={16} />Remove</button>}<button className="button primary" disabled={saving || preview}>{saving ? 'Saving…' : 'Save availability'}</button></div>
  </form>;
}
function MilestoneEditor({ editor }: { editor: Extract<Editor, { type: 'milestone' }> }) {
  const { profile, preview } = useAuth();
  const { changed, closeEditor } = useWorkspace();
  const milestone = editor.milestone;
  const [savedMilestone, setSavedMilestone] = useState(milestone);
  const [error, setError] = useState(''), [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (preview || saving) return;
    const values = new FormData(event.currentTarget);
    setSaving(true); setError('');
    let orphan: string | null = null;
    try {
      const saved = await saveMilestone({ title: String(values.get('title')).trim(), milestone_date: String(values.get('date')),
        description: String(values.get('description') || '').trim() || null, repeat_yearly: values.get('repeat') === 'on',
        photo_path: savedMilestone?.photo_path || null, created_by: savedMilestone?.created_by || profile!.id,
      }, savedMilestone?.id);
      setSavedMilestone(saved);
      const photo = values.get('photo') as File | null;
      if (photo?.size) {
        orphan = await uploadImage(photo, `milestones/${saved.id}`);
        await saveMilestone({ ...saved, photo_path: orphan }, saved.id); orphan = null;
        if (savedMilestone?.photo_path) await database().storage.from('memory-photos').remove([savedMilestone.photo_path]);
      }
      changed('A meaningful day, kept.'); closeEditor();
    } catch (issue) {
      if (orphan) { try { await database().storage.from('memory-photos').remove([orphan]); } catch { /* A later manual cleanup may be needed if disconnected. */ } }
      setError(`${readableError(issue)}${values.get('photo') instanceof File && (values.get('photo') as File).size ? ' Your milestone text may already be saved; retrying will update the same milestone.' : ''}`);
      changed('Milestones refreshed.');
    } finally { setSaving(false); }
  }
  return <form className="editor-form" onSubmit={submit}>
    <Field label="A day worth remembering *"><input name="title" defaultValue={milestone?.title} placeholder="Our first little adventure" maxLength={160} required /></Field>
    <Field label="Date *"><input name="date" type="date" defaultValue={milestone?.milestone_date || today()} required /></Field>
    <Field label="The story behind it"><textarea name="description" defaultValue={milestone?.description || ''} rows={4} maxLength={10000} /></Field>
    <Field label="A photo (optional)"><input name="photo" type="file" accept={allowedImages} /></Field>
    <label className="checkbox-field"><input name="repeat" type="checkbox" defaultChecked={milestone?.repeat_yearly} />Repeat yearly</label>
    {error && <ErrorMessage message={error} />}
    <div className="form-footer"><button type="button" className="button secondary" onClick={closeEditor} disabled={saving}>Cancel</button><button className="button primary" disabled={saving || preview}>{saving ? 'Saving…' : 'Keep this day'}</button></div>
  </form>;
}
