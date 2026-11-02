import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Camera, Check, Clock3, MapPin, Pencil, Star, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useResource } from '../hooks/useResource';
import { captionPhoto, deleteMemory, getMemory, savePov, uploadMemoryPhoto } from '../services/memoryService';
import { readableError } from '../services/supabase';
import { allowedImages } from '../utils/imageUpload';
import { clockLabel, dateLabel } from '../utils/dates';
import { previewMemories } from '../data/preview';
import { EmptyState, ErrorMessage, Loading, PhotoImage, PreviewNotice, Sheet } from '../components/ui';
import type { Memory, Photo, Role } from '../types';
import { VoiceNotes } from '../components/VoiceNotes';

export default function MemoryPage() {
  const { id = '' } = useParams(), { preview } = useAuth();
  const { openMemory, changed } = useWorkspace();
  const navigate = useNavigate();
  const sample = previewMemories.find(m => m.id === id) || null;
  const { data: memory, loading, error, retry } = useResource<Memory | null>(() => getMemory(id), sample, id);
  const [confirmDelete, setConfirmDelete] = useState(false), [deleting, setDeleting] = useState(false), [deleteError, setDeleteError] = useState('');
  const [photoError, setPhotoError] = useState(''), [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null), cameraInput = useRef<HTMLInputElement>(null);
  async function upload(files: FileList | null) {
    if (!files?.length || !memory || preview || uploading) return;
    if (memory.photos.length + files.length > 50) { setPhotoError('A memory can hold up to 50 photos.'); return; }
    setUploading(true); setPhotoError('');
    let count = 0;
    try {
      for (const file of Array.from(files)) {
        await uploadMemoryPhoto(memory.id, file, memory.photos.length + count);
        count++;
      }
      changed(`${count} ${count === 1 ? 'photo' : 'photos'}, kept with our story.`);
    } catch (issue) {
      setPhotoError(`${readableError(issue)}${count ? ` ${count} earlier photos were saved.` : ''}`);
      if (count) changed(`${count} photos saved.`);
    } finally { setUploading(false); }
  }
  async function remove() {
    if (!memory || preview || deleting) return;
    setDeleting(true); setDeleteError('');
    try { await deleteMemory(memory); changed('Memory, photos, and voice notes removed.'); setConfirmDelete(false); navigate('/memories'); }
    catch (issue) { setDeleteError(readableError(issue)); } finally { setDeleting(false); }
  }
  if (loading && !memory) return <Loading />;
  if (error && !memory) return <ErrorMessage message={error} retry={retry} />;
  if (!memory) return <EmptyState title="This page is still unwritten" description="That sample memory isn’t part of this preview." action={<Link to="/memories" className="button secondary">Back to our scrapbook</Link>} />;
  return <div className="memory-detail" aria-busy={loading}><Link className="text-link back-link" to="/memories"><ArrowLeft size={16} />Our scrapbook</Link>
    {error && <ErrorMessage message={error} retry={retry} />}
    <div className="page-heading"><div><p className="eyebrow">{memory.status === 'completed' ? 'A MOMENT THAT’S OURS' : 'SOMETHING TO LOOK FORWARD TO'}</p><h1>{memory.title}</h1><div className="memory-meta"><span><CalendarDays size={15} />{dateLabel(memory.event_date)}</span>{memory.start_time && <span><Clock3 size={15} />{clockLabel(memory.start_time)}{memory.end_time && ` – ${clockLabel(memory.end_time)}${memory.end_time <= memory.start_time ? ' (next day)' : ''}`}</span>}{memory.location && <span><MapPin size={15} />{memory.location}</span>}<span className={`status-badge ${memory.status}`}>{memory.status}</span></div></div><button className="button secondary" onClick={() => openMemory(memory.event_date, memory.status, memory)}><Pencil size={15} />Edit story</button></div>
    {memory.description && <p className="memory-description">{memory.description}</p>}
    <section className="povs-section" aria-labelledby="our-stories-heading">
      <div className="section-heading"><div><p className="eyebrow">ONE MOMENT. TWO LITTLE WORLDS.</p><h2 id="our-stories-heading">Our sides of the story</h2></div></div>
      <p className="section-description">The way it felt. The little things we noticed. The parts we never want to forget.</p>
      <div className="pov-grid"><PovPanel memory={memory} role="person_a" name="Bhuwan" /><PovPanel memory={memory} role="person_b" name="Pooja" /></div>
    </section>
    <section><div className="section-heading photo-heading"><h2>Little frames of us</h2><div className="media-actions"><button className="button secondary" disabled={uploading || preview} onClick={() => photoInput.current?.click()}><Upload size={15} />{uploading ? 'Adding photos…' : 'Add photos'}</button><button className="button secondary" disabled={uploading || preview} onClick={() => cameraInput.current?.click()}><Camera size={15} />Take photo</button></div></div>
      <input ref={photoInput} type="file" multiple accept={allowedImages} hidden onChange={e => { void upload(e.target.files); e.target.value = ''; }} />
      <input ref={cameraInput} type="file" accept={allowedImages} capture="environment" hidden onChange={e => { void upload(e.target.files); e.target.value = ''; }} /><PreviewNotice />
      {photoError && <ErrorMessage message={photoError} />}
      {memory.photos.length ? <div className="detail-gallery">{memory.photos.map(photo => <PhotoCard memoryId={memory.id} photo={photo} key={photo.path} title={memory.title} />)}</div> : <div className="photo-empty"><Camera size={32} strokeWidth={1.2} /><h3>Some moments don’t need a photo.</h3><p>And some are just waiting for one. Add yours whenever you’re ready.</p></div>}
    </section>
    <VoiceNotes memory={memory} />
    {Object.entries(memory.extras).some(([, value]) => value) && <section className="scrapbook-extras"><h2>The little details</h2><dl>{Object.entries(memory.extras).filter(([, value]) => value).map(([key, value]) => <div key={key}><dt>{({ activity: 'What we did', song: 'Our soundtrack', quote: 'Words worth keeping', expense: 'Expense note', tickets: 'Tickets & bookings' } as Record<string, string>)[key] || key}</dt><dd>{value}</dd></div>)}</dl></section>}
    <footer className="memory-detail-footer"><Link to={`/calendar?date=${memory.event_date}`} className="text-link"><CalendarDays size={15} />Back to calendar</Link><button className="text-button danger-text" onClick={() => setConfirmDelete(true)}><Trash2 size={14} />Delete memory</button></footer>
    {confirmDelete && <Sheet title="Let this moment go?" onClose={() => { if (!deleting) setConfirmDelete(false); }}><p className="delete-copy">Permanently delete <strong>“{memory.title}”</strong>, all its photos, and its voice recordings? Both sides of the story will also be removed. This cannot be undone.</p><PreviewNotice />{deleteError && <ErrorMessage message={deleteError} />}<div className="form-footer"><button className="button secondary" disabled={deleting} onClick={() => setConfirmDelete(false)}>Keep our memory</button><button className="button danger" disabled={deleting || preview} onClick={remove}>{deleting ? 'Removing…' : 'Delete permanently'}</button></div></Sheet>}
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
  const storedPov = memory[`${role}_pov`] || '', storedRating = memory[`${role}_rating`];
  const [pov, setPov] = useState(storedPov), [rating, setRating] = useState<number | null>(storedRating);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const writingArea = useRef<HTMLTextAreaElement>(null);
  const words = pov.trim() ? pov.trim().split(/\s+/u).length : 0;
  useEffect(() => { setPov(storedPov); setRating(storedRating); }, [memory.id, role, storedPov, storedRating]);
  useLayoutEffect(() => { fitStory(writingArea.current); }, [pov, own]);
  useEffect(() => {
    if (!own) return;
    const resize = () => fitStory(writingArea.current);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [own]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!own || preview || busy) return;
    setBusy(true); setError('');
    try { await savePov(memory.id, role, pov, rating); changed('Your side of the story, saved.'); }
    catch (issue) { setError(readableError(issue)); } finally { setBusy(false); }
  }
  return <article className={`pov-panel ${role}`} aria-labelledby={`story-heading-${role}`}>
    <header><span className={`avatar ${role}`}>{name[0]}</span><div><h3 id={`story-heading-${role}`}>{name}’s side</h3><span>{own ? 'Your words, your little world' : 'Through their eyes'}</span></div>{own && <span className="you-badge">YOU</span>}</header>
    {own ? <form className="pov-writing" onSubmit={submit}>
      <label className="sr-only" htmlFor={`pov-${role}`}>{name}’s point of view</label>
      <textarea ref={writingArea} id={`pov-${role}`} value={pov} onChange={e => setPov(e.target.value)} maxLength={10000} placeholder="Start with the part that stayed with you…" rows={12} aria-describedby={`story-length-${role}`} />
      <div className="pov-writing-meta" id={`story-length-${role}`}><span>{words.toLocaleString()} {words === 1 ? 'word' : 'words'}</span><span>{pov.length.toLocaleString()} / 10,000 characters</span></div>
      <div className="pov-actions"><fieldset className="star-rating"><legend>How did this moment feel?</legend>{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} onClick={() => setRating(rating === n ? null : n)} aria-label={`${n} out of 5 stars`} aria-pressed={rating === n} className={rating && n <= rating ? 'rated' : ''}><Star size={19} fill={rating && n <= rating ? 'currentColor' : 'none'} /></button>)}</fieldset><button className="button secondary" disabled={busy || preview}><Check size={15} />{busy ? 'Saving…' : 'Save my side'}</button></div>
      {error && <ErrorMessage message={error} />}
    </form> : <div className="pov-reading"><p className={`pov-copy ${!pov ? 'empty-pov' : ''}`}>{pov || `${name} hasn’t added their side of the story yet. A little something to look forward to.`}</p>{rating && <p className="other-rating" aria-label={`${rating} out of 5 stars`}>{Array.from({ length: rating }, (_, i) => <Star key={i} size={16} fill="currentColor" />)}</p>}<p className="field-help">Only {name} can edit this reflection.</p></div>}
  </article>;
}

function fitStory(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = 'auto';
  const borders = element.offsetHeight - element.clientHeight;
  element.style.height = `${element.scrollHeight + borders}px`;
}
