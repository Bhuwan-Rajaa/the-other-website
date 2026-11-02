import { ArrowUpRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Memory } from '../types';
import { dateLabel } from '../utils/dates';
import { PhotoImage } from './ui';

export function MemoryCard({ memory }: { memory: Memory }) {
  return <Link className="memory-card" to={`/memories/${memory.id}`}><div className="memory-card-image">
    <PhotoImage path={memory.photos[0]?.path} alt={memory.photos[0]?.alt || memory.photos[0]?.caption || memory.title} />
    {memory.extras.activity && <span className="photo-tag">{memory.extras.activity}</span>}
    <span className="card-open"><ArrowUpRight size={18} /></span>
  </div><div className="memory-card-copy"><time dateTime={memory.event_date}>{dateLabel(memory.event_date, { month: 'short', day: 'numeric', year: 'numeric' })}</time><h3>{memory.title}</h3><p>{memory.description || 'Every little moment belongs here.'}</p>{memory.location && <span className="location"><MapPin size={12} />{memory.location}</span>}</div></Link>;
}
