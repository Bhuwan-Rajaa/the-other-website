import { useState } from 'react';
import { Heart, Pencil, Plus, Repeat2, Sparkles, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useResource } from '../hooks/useResource';
import { getMilestones, deleteMilestone } from '../services/milestoneService';
import { readableError } from '../services/supabase';
import { config } from '../config';
import { dateLabel, daysBetween, nextOccurrence, today } from '../utils/dates';
import { previewMilestones } from '../data/preview';
import type { Milestone } from '../types';
import { ErrorMessage, Loading, PhotoImage, PreviewNotice, Sheet } from '../components/ui';

export default function MilestonesPage() {
  const { preview } = useAuth(), { openMilestone, changed } = useWorkspace();
  const { data, loading, error, retry } = useResource(getMilestones, previewMilestones);
  const [deleting, setDeleting] = useState<Milestone | null>(null), [busy, setBusy] = useState(false), [deleteError, setDeleteError] = useState('');
  async function remove() {
    if (!deleting || preview || busy) return; setBusy(true); setDeleteError('');
    try { await deleteMilestone(deleting); changed('Milestone removed.'); setDeleting(null); }
    catch (issue) { setDeleteError(readableError(issue)); } finally { setBusy(false); }
  }
  const anniversary = nextOccurrence(config.relationshipStart);
  return <div><div className="page-heading"><div><p className="eyebrow">DATES THAT CHANGED EVERYTHING</p><h1>Our <em>milestones.</em></h1><p>Some days become part of who we are.</p></div><button className="button secondary" onClick={() => openMilestone()}><Plus size={16} />Add a milestone</button></div>
    <section className="anniversary-banner"><span className="anniversary-icon"><Heart size={36} strokeWidth={1} /></span><div><p className="eyebrow">THE DAY WE CHOSE US</p><h2>August 14. Always ours.</h2><p>Together since {dateLabel(config.relationshipStart)}.</p></div><div className="anniversary-count"><strong>{daysBetween(today(), anniversary)}</strong><span>{daysBetween(today(), anniversary) === 0 ? 'It’s our anniversary!' : 'days until our anniversary'}</span></div></section>
    {loading ? <Loading /> : error ? <ErrorMessage message={error} retry={retry} /> : <div className="milestone-list">{[...data].sort((a, b) => a.milestone_date.localeCompare(b.milestone_date)).map((m, i) => <article className="milestone-row" key={m.id}><div className="milestone-line"><span>{String(i + 1).padStart(2, '0')}</span></div><div className="milestone-content"><p className="eyebrow">{dateLabel(m.milestone_date)}</p><h2>{m.title}</h2>{m.description && <p>{m.description}</p>}{m.repeat_yearly && <span className="recurrence"><Repeat2 size={13} />Every year · {daysBetween(today(), nextOccurrence(m.milestone_date)) === 0 ? 'Today!' : `${daysBetween(today(), nextOccurrence(m.milestone_date))} days to go`}</span>}</div>{m.photo_path && <PhotoImage path={m.photo_path} alt={m.title} className="milestone-photo" />}<div className="milestone-actions"><button className="icon-button" aria-label={`Edit ${m.title}`} onClick={() => openMilestone(m)}><Pencil size={16} /></button><button className="icon-button danger-text" aria-label={`Delete ${m.title}`} onClick={() => { setDeleteError(''); setDeleting(m); }}><Trash2 size={16} /></button></div></article>)}<div className="milestone-end"><Sparkles size={20} /><span>So many more firsts to come.</span></div></div>}
    {deleting && <Sheet title="Remove this milestone?" onClose={() => { if (!busy) setDeleting(null); }}><p className="delete-copy">Permanently delete “{deleting.title}” and its photo?</p><PreviewNotice />{deleteError && <ErrorMessage message={deleteError} />}<div className="form-footer"><button className="button secondary" disabled={busy} onClick={() => setDeleting(null)}>Keep it</button><button className="button danger" disabled={busy || preview} onClick={remove}>{busy ? 'Removing…' : 'Delete milestone'}</button></div></Sheet>}
  </div>;
}
