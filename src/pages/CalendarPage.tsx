import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Heart, Pencil, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useResource } from '../hooks/useResource';
import { getMemories } from '../services/memoryService';
import { getAvailability } from '../services/availabilityService';
import { getProfiles } from '../services/profileService';
import { previewAvailability, previewMemories, previewProfiles } from '../data/preview';
import { addDays, addMonths, atLocal, calendarDays, clockLabel, dateLabel, dayBounds, localTime, monthStart, today } from '../utils/dates';
import { sharedAvailability } from '../utils/availabilityOverlap';
import { EmptyState, ErrorMessage, Loading, Sheet } from '../components/ui';

export default function CalendarPage() {
  const { profile } = useAuth();
  const { openMemory, openAvailability } = useWorkspace();
  const [params] = useSearchParams();
  const requested = params.get('date');
  const initial = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && !Number.isNaN(Date.parse(requested)) ? requested : today();
  const [month, setMonth] = useState(monthStart(initial)), [selected, setSelected] = useState<string | null>(requested ? initial : null);
  const days = calendarDays(month), rangeEnd = addDays(days[41], 1);
  const { data, loading, error, retry } = useResource(async () => {
    const [memories, availability, profiles] = await Promise.all([getMemories({ start: days[0], end: rangeEnd, limit: 1000 }), getAvailability(atLocal(days[0]), atLocal(rangeEnd)), getProfiles()]);
    return { memories, availability, profiles };
  }, { memories: previewMemories, availability: previewAvailability, profiles: previewProfiles }, month);
  const overlaps = sharedAvailability(data.availability, data.profiles[0]?.id || '', data.profiles[1]?.id || '');
  const entriesFor = (date: string) => { const bounds = dayBounds(date); return data.availability.filter(a => Date.parse(a.start_at) < Date.parse(bounds.end_at) && Date.parse(a.end_at) > Date.parse(bounds.start_at)); };
  const sharedFor = (date: string) => { const bounds = dayBounds(date); return overlaps.filter(i => i.start < Date.parse(bounds.end_at) && i.end > Date.parse(bounds.start_at)); };
  const selectedMemories = data.memories.filter(m => m.event_date === selected);
  return <div><div className="page-heading"><div><p className="eyebrow">MAKE A LITTLE TIME FOR US</p><h1>Our <em>calendar.</em></h1><p>A place for plans, possibilities, and time together.</p></div><button className="button secondary" onClick={() => openAvailability()}><Plus size={16} />My availability</button></div>
    <section className="calendar-panel"><header className="calendar-toolbar"><h2>{dateLabel(month, { month: 'long', year: 'numeric' })}</h2><div><button className="button secondary compact" onClick={() => { setMonth(monthStart(today())); setSelected(today()); }}>Today</button><button className="icon-button" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft size={20} /></button><button className="icon-button" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={20} /></button></div></header>
      {loading ? <Loading /> : error ? <ErrorMessage message={error} retry={retry} /> : <div className="calendar-grid" role="group" aria-label={dateLabel(month, { month: 'long', year: 'numeric' })}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div className="calendar-weekday" key={day}>{day}</div>)}
        {days.map(date => { const memories = data.memories.filter(m => m.event_date === date), availability = entriesFor(date), shared = sharedFor(date).length > 0;
          return <button key={date} className={`calendar-day ${date.slice(0, 7) !== month.slice(0, 7) ? 'outside-month' : ''} ${date === today() ? 'is-today' : ''}`} onClick={() => setSelected(date)} aria-label={`${dateLabel(date)}, ${memories.length} plans or memories${availability.length ? ', availability recorded' : ''}${shared ? ', shared free time' : ''}`}>
            <span className="day-number">{Number(date.slice(8))}</span><span className="day-events">{memories.slice(0, 2).map(m => <span key={m.id} className={`day-event ${m.status}`}>{m.status === 'completed' ? '♡' : '◷'} <span>{m.title}</span></span>)}{memories.length > 2 && <span className="more-events">+{memories.length - 2} more</span>}</span>
            <span className="availability-marks">{data.profiles.filter(p => availability.some(a => a.user_id === p.id)).map(p => <span className={`person-mark ${p.role}`} key={p.id} title={`${p.display_name} has availability recorded`}>{p.display_name[0]}</span>)}{shared && <span className="shared-mark" title="Both available"><Heart size={11} /><span className="desktop-inline">Us</span></span>}</span>
          </button>;
        })}</div>}
      <footer className="calendar-legend"><span><i className="legend-dot wine-dot" />♡ Memory</span><span><i className="legend-dot gold-dot" />◷ Plan</span><span><span className="person-mark person_a">B</span>Bhuwan</span><span><span className="person-mark person_b">P</span>Pooja</span><span><Heart size={13} />Both free</span></footer>
    </section><p className="calendar-footnote">All times in Asia/Kolkata. Tap a day to open a little more of our story.</p>
    {selected && <Sheet title={dateLabel(selected, { weekday: 'long', month: 'long', day: 'numeric' })} subtitle="ONE DAY IN OUR LITTLE LIFE" onClose={() => setSelected(null)}>
      <div className="day-actions"><button className="button primary" onClick={() => { openMemory(selected); setSelected(null); }}><Plus size={16} />Add memory</button><button className="button secondary" onClick={() => { openMemory(selected, 'planned'); setSelected(null); }}>Plan a date</button></div>
      <h3 className="day-section-title">Our plans & memories</h3>{selectedMemories.length ? selectedMemories.map(m => <Link key={m.id} className="day-memory" to={`/memories/${m.id}`}><span className="tile-icon wine"><CalendarDays size={18} /></span><span><strong>{m.title}</strong><small>{m.status} {m.start_time && `· ${clockLabel(m.start_time)}`}</small></span><ChevronRight size={17} /></Link>) : <p className="quiet-empty">Nothing here yet. A little room for something lovely.</p>}
      <h3 className="day-section-title">A little time together</h3>{sharedFor(selected).length ? sharedFor(selected).map(i => { const bounds = dayBounds(selected); const start = new Date(Math.max(i.start, Date.parse(bounds.start_at))).toISOString(), end = new Date(Math.min(i.end, Date.parse(bounds.end_at))).toISOString(); return <p className="shared-slot" key={i.start}><Heart size={15} />Both available · {clockLabel(localTime(start))} – {end === bounds.end_at ? 'midnight' : clockLabel(localTime(end))}</p>; }) : <p className="quiet-empty">No overlapping free time on this day.</p>}
      <div className="section-heading small"><h3>Our availability</h3><button className="text-link" onClick={() => { openAvailability(selected); setSelected(null); }}>Add mine<Plus size={14} /></button></div>
      {entriesFor(selected).length ? entriesFor(selected).map(entry => { const person = data.profiles.find(p => p.id === entry.user_id); return <div className="availability-row" key={entry.id}><span className={`avatar ${person?.role}`}>{person?.display_name[0]}</span><div><strong>{person?.display_name} · <span className={`status-text ${entry.status}`}>{entry.status}</span></strong><p>{entry.all_day ? 'All day' : `${clockLabel(localTime(entry.start_at))} – ${clockLabel(localTime(entry.end_at))}`}{entry.note && ` · ${entry.note}`}</p></div>{entry.user_id === profile?.id && <button className="icon-button" aria-label="Edit my availability" onClick={() => { openAvailability(selected, entry); setSelected(null); }}><Pencil size={16} /></button>}</div>; }) : <EmptyState title="No availability added yet" description="Let your favourite person know when you’re free." />}
    </Sheet>}
  </div>;
}
