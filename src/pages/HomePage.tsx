import { ArrowRight, CalendarDays, Camera, ChevronRight, Clock3, Heart, MapPin, Plus, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useResource } from '../hooks/useResource';
import { getMemories } from '../services/memoryService';
import { getMilestones } from '../services/milestoneService';
import { getAvailability } from '../services/availabilityService';
import { getProfiles } from '../services/profileService';
import { previewAvailability, previewMemories, previewMilestones, previewProfiles, samplePhotos } from '../data/preview';
import { addDays, atLocal, clockLabel, dateLabel, daysBetween, localDate, localTime, nextOccurrence, today } from '../utils/dates';
import { sharedAvailability } from '../utils/availabilityOverlap';
import { config } from '../config';
import { ErrorMessage, Loading, PhotoImage } from '../components/ui';
import { MemoryCard } from '../components/MemoryCard';

export default function HomePage() {
  const { profile, preview } = useAuth();
  const { openMemory, openAvailability } = useWorkspace();
  const { data, loading, error, retry } = useResource(async () => {
    const [recent, plans, milestones, availability, profiles] = await Promise.all([
      getMemories({ completed: true, limit: 3 }), getMemories({ start: today(), upcoming: true, limit: 8 }),
      getMilestones(), getAvailability(atLocal(today()), atLocal(addDays(today(), 31))), getProfiles(),
    ]);
    return { recent, plans, milestones, availability, profiles };
  }, { recent: previewMemories.filter(m => m.status === 'completed'), plans: previewMemories.filter(m => m.status === 'confirmed'), milestones: previewMilestones, availability: previewAvailability, profiles: previewProfiles });
  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} retry={retry} />;
  const duration = daysBetween(config.relationshipStart, today());
  const plan = data.plans.find(p => !p.start_time || Date.parse(atLocal(p.event_date, p.start_time.slice(0, 5))) >= Date.now());
  const free = data.profiles.length === 2 ? sharedAvailability(data.availability, data.profiles[0].id, data.profiles[1].id).find(i => i.end > Date.now()) : undefined;
  const nextAnniversary = nextOccurrence(config.relationshipStart);
  const nextMilestone = [
    { title: 'Our anniversary', next: nextAnniversary },
    ...data.milestones.map(m => ({ title: m.title, next: m.repeat_yearly ? nextOccurrence(m.milestone_date) : m.milestone_date })).filter(m => m.next >= today()),
  ].sort((a, b) => a.next.localeCompare(b.next))[0];
  return <div className="home-page">
    <div className="page-heading"><div><p className="eyebrow">HELLO, {profile?.display_name.toUpperCase()} <span className="small-sparkle">✧</span></p><h1>A little life, <em>together.</em></h1><p>The big days. The quiet ones. All of it, ours.</p></div><span className="heading-note"><Heart size={14} /> Just you & me</span></div>
    <div className="hero-grid"><section className="hero-card">
      <PhotoImage path={preview ? samplePhotos.mountains : data.recent.find(m => m.photos.length)?.photos[0].path} alt={preview ? 'Mountains catching the last light of the day' : 'A favourite moment from our recent memories'} eager />
      <div className="hero-shade" /><div className="hero-copy"><span className="hero-eyebrow"><span />THE STORY WE’RE STILL WRITING</span><h2>Our kind<br />of <em>forever.</em></h2><p>A thousand little moments.<br />One favourite person.</p><Link to="/memories" className="hero-link">Open our scrapbook <ArrowRight size={17} /></Link></div><span className="hero-number">01 / OUR LITTLE WORLD</span>
    </section><section className="together-card"><div className="ornament">✧</div><p className="eyebrow">EVERY DAY, A LITTLE MORE US</p><div className="couple-initials"><span>B</span><Heart size={16} /><span>P</span></div><p className="together-names">Bhuwan <em>&</em> Pooja</p><div className="day-count">{Math.abs(duration).toLocaleString()}<span>{duration < 0 ? 'days until our beginning' : 'days of choosing each other'}</span></div><div className="since-line">Since {dateLabel(config.relationshipStart, { day: 'numeric', month: 'long', year: 'numeric' })}</div><span className="card-flourish">a little more, every day</span></section></div>
    <section className="moments-ahead"><div className="section-heading"><h2>A little something to look forward to</h2><Link className="text-link" to="/calendar">Our calendar<ArrowRight size={15} /></Link></div>
      <div className="ahead-grid"><article className="ahead-card"><span className="tile-icon wine"><CalendarDays size={20} strokeWidth={1.6} /></span><span className="eyebrow">OUR NEXT DATE</span><h3>{plan?.title || 'Something lovely awaits'}</h3>{plan ? <><p><CalendarDays size={13} />{dateLabel(plan.event_date, { weekday: 'short', month: 'short', day: 'numeric' })}{plan.start_time && ` · ${clockLabel(plan.start_time)}`}</p>{plan.location && <p><MapPin size={13} />{plan.location}</p>}<Link to={`/memories/${plan.id}`} className="card-text-link">A date with you <ArrowRight size={14} /></Link></> : <><p>Let’s put a little us-time on the calendar.</p><button className="card-text-link" onClick={() => openMemory(today(), 'planned')}>Plan a date<ArrowRight size={14} /></button></>}</article>
        <article className="ahead-card"><span className="tile-icon sage"><Clock3 size={20} strokeWidth={1.6} /></span><span className="eyebrow">WHEN WE’RE BOTH FREE</span><h3>{free ? dateLabel(localDate(new Date(Math.max(free.start, Date.now())).toISOString()), { weekday: 'long', month: 'short', day: 'numeric' }) : 'Let’s find a little time'}</h3><p>{free ? `${clockLabel(localTime(new Date(Math.max(free.start, Date.now())).toISOString()))} – ${clockLabel(localTime(new Date(free.end).toISOString()))}${localDate(new Date(free.start).toISOString()) !== localDate(new Date(free.end - 1).toISOString()) ? ' · continues next day' : ''}` : 'No overlapping free time in the next 31 days.'}</p><p className="subtle">{free ? 'A little window, just for the two of us.' : 'Add your availability to find your next window.'}</p><button className="card-text-link" onClick={() => openAvailability()}>Update availability<ArrowRight size={14} /></button></article>
        <article className="ahead-card milestone-preview"><span className="tile-icon gold"><Sparkles size={20} strokeWidth={1.6} /></span><span className="eyebrow">A DAY CLOSE TO OUR HEARTS</span><h3>{nextMilestone.title}</h3><p>{dateLabel(nextMilestone.next, { month: 'long', day: 'numeric' })}<span className="countdown-pill">{daysBetween(today(), nextMilestone.next) === 0 ? 'Today!' : `in ${daysBetween(today(), nextMilestone.next)} days`}</span></p><p className="subtle">Some dates mean a little more.</p><Link className="card-text-link" to="/milestones">Our milestones<ArrowRight size={14} /></Link></article>
      </div></section>
    <section className="recent-section"><div className="section-heading"><div><p className="eyebrow">THE MOMENTS WE KEEP</p><h2>A few pages from our story</h2></div><Link to="/memories" className="text-link">All memories<ArrowRight size={15} /></Link></div>
      {data.recent.length ? <div className="memory-grid">{data.recent.map(memory => <MemoryCard key={memory.id} memory={memory} />)}</div> : <div className="first-memory"><Camera size={28} strokeWidth={1} /><h3>Our first page is waiting.</h3><p>A photo. A few words. A moment that belongs to us.</p><button className="button secondary" onClick={() => openMemory()}><Plus size={16} />Add our first memory</button></div>}
    </section><div className="home-closing"><span />“And in the middle of my chaos, there was you.”<span /></div>
    <button className="mobile-fab" aria-label="Add a memory" onClick={() => openMemory()}><Plus size={24} /></button>
  </div>;
}
