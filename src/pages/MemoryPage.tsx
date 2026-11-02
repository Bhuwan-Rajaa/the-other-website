import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Camera, Check, Clock3, MapPin, Pencil, Star, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useResource } from '../hooks/useResource';
import { addPhoto, captionPhoto, deleteMemory, getMemory, savePov } from '../services/memoryService';
import { database, readableError } from '../services/supabase';
import { allowedImages, uploadImage } from '../utils/imageUpload';
import { clockLabel, dateLabel } from '../utils/dates';
import { previewMemories } from '../data/preview';
import { EmptyState, ErrorMessage, Loading, PhotoImage, PreviewNotice, Sheet } from '../components/ui';
import type { Memory, Photo, Role } from '../types';

export default function MemoryPage() {
  const { id = '' } = useParams(), { preview } = useAuth();
  const { openMemory, changed } = useWorkspace();
  const navigate = useNavigate();
  const sample = previewMemories.find(m => m.id === id) || null;
  const { data: memory, loading, error, retry } = useResource<Memory | null>(() => getMemory(id), sample, id);
  const [confirmDelete, setConfirmDelete] = useState(false), [deleting, setDeleting] = useState(false), [deleteError, setDeleteError] = useState('');
  const [photoError, setPhotoError] = useState(''), [uploading, setUploading] = useState(false);
  async function upload(files: FileList | null) {
    if (!files?.length || !memory || preview || uploading) return;
    if (memory.photos.length + files.length > 50) { setPhotoError('A memory can hold up to 50 photos.'); return; }
    setUploading(true); setPhotoError('');
    let orphan: string | null = null, count = 0;
    try {
      for (const file of Array.from(files)) {
        orphan = await uploadImage(file, `memories/${memory.id}`);
        await addPhoto(memory.id, { path: orphan, caption: '', sort_order: memory.photos.length + count, alt: '' });
        orphan = null; count++;
      }
      changed(`${count} ${count === 1 ? 'photo' : 'photos'}, kept with our story.`);
    } catch (issue) {
      if (orphan) { try { await database().storage.from('memory-photos').remove([orphan]); } catch { /* A later manual cleanup may be needed if disconnected. */ } }
      setPhotoError(`${readableError(issue)}${count ? ` ${count} earlier photos were saved.` : ''}`);
      if (count) changed(`${count} photos saved.`);
    } finally { setUploading(false); }
  }
  async function remove() {
    if (!memory || preview || deleting) return;
    setDeleting(true); setDeleteError('');
    try { await deleteMemory(memory); changed('Memory and its photos removed.'); setConfirmDelete(false); navigate('/memories'); }
    catch (issue) { setDeleteError(readableError(issue)); } finally { setDeleting(false); }
  }
  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} retry={retry} />;
  if (!memory) return <EmptyState title="This page is still unwritten" description="That sample memory isn’t part of this preview." action={<Link to="/memories" className="button secondary">Back to our scrapbook</Link>} />;
  return <div className="memory-detail"><Link className="text-link back-link" to="/memories"><ArrowLeft size={16} />Our scrapbook</Link>
    <div className="page-heading"><div><p className="eyebrow">{memory.status === 'completed' ? 'A MOMENT THAT’S OURS' : 'SOMETHING TO LOOK FORWARD TO'}</p><h1>{memory.title}</h1><div className="memory-meta"><span><CalendarDays size={15} />{dateLabel(memory.event_date)}</span>{memory.start_time && <span><Clock3 size={15} />{clockLabel(memory.start_time)}{memory.end_time && ` – ${clockLabel(memory.end_time)}${memory.end_time <= memory.start_time ? ' (next day)' : ''}`}</span>}{memory.location && <span><MapPin size={15} />{memory.location}</span>}<span className={`status-badge ${memory.status}`}>{memory.status}</span></div></div><button className="button secondary" onClick={() => openMemory(memory.event_date, memory.status, memory)}><Pencil size={15} />Edit story</button></div>
    {memory.description && <p className="memory-description">{memory.description}</p>}
    <section><div className="section-heading"><h2>Little frames of us</h2><label className={`button secondary ${uploading || preview ? 'disabled' : ''}`}><Upload size={15} />{uploading ? 'Adding photos…' : 'Add photos'}<input className="sr-only" type="file" multiple accept={allowedImages} disabled={uploading || preview} onChange={e => { void upload(e.target.files); e.target.value = ''; }} /></label></div><PreviewNotice />
      {photoError && <ErrorMessage message={photoError} />}
      {memory.photos.length ? <div className="detail-gallery">{memory.photos.map(photo => <PhotoCard memoryId={memory.id} photo={photo} key={photo.path} title={memory.title} />)}</div> : <div className="photo-empty"><Camera size={32} strokeWidth={1.2} /><h3>Some moments don’t need a photo.</h3><p>And some are just waiting for one. Add yours whenever you’re ready.</p></div>}
    </section>
    <section className="povs-section"><div className="section-heading"><div><p className="eyebrow">ONE MOMENT. TWO LITTLE WORLDS.</p><h2>Our sides of the story</h2></div></div><p className="section-description">Both stories are shared. Each of us writes our own.</p><div className="pov-grid"><PovPanel memory={memory} role="person_a" name="Bhuwan" /><PovPanel memory={memory} role="person_b" name="Pooja" /></div></section>
    {Object.entries(memory.extras).some(([, value]) => value) && <section className="scrapbook-extras"><h2>The little details</h2><dl>{Object.entries(memory.extras).filter(([, value]) => value).map(([key, value]) => <div key={key}><dt>{({ activity: 'What we did', song: 'Our soundtrack', quote: 'Words worth keeping', expense: 'Expense note', tickets: 'Tickets & bookings' } as Record<string, string>)[key] || key}</dt><dd>{value}</dd></div>)}</dl></section>}
    <footer className="memory-detail-footer"><Link to={`/calendar?date=${memory.event_date}`} className="text-link"><CalendarDays size={15} />Back to calendar</Link><button className="text-button danger-text" onClick={() => setConfirmDelete(true)}><Trash2 size={14} />Delete memory</button></footer>
    {confirmDelete && <Sheet title="Let this moment go?" onClose={() => { if (!deleting) setConfirmDelete(false); }}><p className="delete-copy">Permanently delete <strong>“{memory.title}”</strong> and all its photos? Both sides of the story will also be removed. This cannot be undone.</p><PreviewNotice />{deleteError && <ErrorMessage message={deleteError} />}<div className="form-footer"><button className="button secondary" disabled={deleting} onClick={() => setConfirmDelete(false)}>Keep our memory</button><button className="button danger" disabled={deleting || preview} onClick={remove}>{deleting ? 'Removing…' : 'Delete permanently'}</button></div></Sheet>}
  </div>;
}
function PhotoCard({ memoryId, photo, title }: { memoryId: string; photo: Photo; title: string }) {
  const { preview } = useAuth(), { changed } = useWorkspace();
  const [editing, setEditing] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false), [expanded, setExpanded] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (preview || busy) return;
    const values = new FormData(event.currentTarget); setBusy(true); setError('');
    try { await captionPhoto(memoryId, photo.path, String(values.get('caption') || '').trim()); changed('Caption saved.'); setEditing(false); }
    catch (issue) { setError(readableError(issue)); } finally { setBusy(false); }
  }
  return <figure className="detail-photo"><button className="photo-expand" onClick={() => setExpanded(true)} aria-label={`View photo: ${photo.caption || title}`}><PhotoImage path={photo.path} alt={photo.alt || photo.caption || title} /></button><figcaption>{editing ? <form onSubmit={save}><input name="caption" aria-label="Photo caption" maxLength={1000} defaultValue={photo.caption} autoFocus placeholder="A few words to keep with this photo…" /><div><button className="text-button" disabled={busy || preview}>Save</button><button type="button" className="text-button" disabled={busy} onClick={() => setEditing(false)}>Cancel</button></div></form> : <button className="caption-button" onClick={() => setEditing(true)}>{photo.caption || 'Add a little caption…'}<Pencil size={12} /></button>}{error && <ErrorMessage message={error} />}</figcaption>{expanded && <Sheet title={photo.caption || title} onClose={() => setExpanded(false)}><PhotoImage path={photo.path} alt={photo.alt || photo.caption || title} className="expanded-photo" /></Sheet>}</figure>;
}
function PovPanel({ memory, role, name }: { memory: Memory; role: Role; name: string }) {
  const { profile, preview } = useAuth(), { changed } = useWorkspace();
  const own = profile?.role === role;
  const [pov, setPov] = useState(memory[`${role}_pov`] || ''), [rating, setRating] = useState<number | null>(memory[`${role}_rating`]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { setPov(memory[`${role}_pov`] || ''); setRating(memory[`${role}_rating`]); }, [memory, role]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!own || preview || busy) return;
    setBusy(true); setError('');
    try { await savePov(memory.id, role, pov, rating); changed('Your side of the story, saved.'); }
    catch (issue) { setError(readableError(issue)); } finally { setBusy(false); }
  }
  return <article className={`pov-panel ${role}`}><header><span className={`avatar ${role}`}>{name[0]}</span><div><h3>{name}’s side</h3><span>{own ? 'Your words, your little world' : 'Through their eyes'}</span></div>{own && <span className="you-badge">YOU</span>}</header>
    {own ? <form onSubmit={submit}><label className="sr-only" htmlFor={`pov-${role}`}>{name}’s point of view</label><textarea id={`pov-${role}`} value={pov} onChange={e => setPov(e.target.value)} maxLength={10000} placeholder="Add your side of the story…" rows={5} /><fieldset className="star-rating"><legend>How did this moment feel?</legend>{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} onClick={() => setRating(rating === n ? null : n)} aria-label={`${n} out of 5 stars`} aria-pressed={rating === n} className={rating && n <= rating ? 'rated' : ''}><Star size={19} fill={rating && n <= rating ? 'currentColor' : 'none'} /></button>)}</fieldset>{error && <ErrorMessage message={error} />}<button className="button secondary" disabled={busy || preview}><Check size={15} />{busy ? 'Saving…' : 'Save my side'}</button></form> : <><p className={`pov-copy ${!pov ? 'empty-pov' : ''}`}>{pov || `${name} hasn’t added their side of the story yet. A little something to look forward to.`}</p>{rating && <p className="other-rating" aria-label={`${rating} out of 5 stars`}>{Array.from({ length: rating }, (_, i) => <Star key={i} size={16} fill="currentColor" />)}</p>}<p className="field-help">Only {name} can edit this reflection.</p></>}
  </article>;
}
