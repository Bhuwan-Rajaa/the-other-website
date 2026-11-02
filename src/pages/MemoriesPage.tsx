import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useResource } from '../hooks/useResource';
import { getMemories } from '../services/memoryService';
import { previewMemories } from '../data/preview';
import { addMonths } from '../utils/dates';
import { EmptyState, ErrorMessage, Loading } from '../components/ui';
import { MemoryCard } from '../components/MemoryCard';

export default function MemoriesPage() {
  const { openMemory } = useWorkspace();
  const [search, setSearch] = useState(''), [month, setMonth] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => { const timer = window.setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  const { data, loading, error, retry } = useResource(() => getMemories({ completed: true, search: query, start: month ? `${month}-01` : undefined, end: month ? addMonths(`${month}-01`, 1) : undefined, limit: 151 }), previewMemories.filter(m => m.status === 'completed' && (!month || m.event_date.startsWith(month))), `${month}|${query}`);
  const visible = data.filter(m => m.status === 'completed' && (!month || m.event_date.startsWith(month)) && m.title.toLowerCase().includes(search.trim().toLowerCase()));
  return <div><div className="page-heading"><div><p className="eyebrow">ALL THE LITTLE THINGS, KEPT</p><h1>Our <em>scrapbook.</em></h1><p>For the moments we wish we could live twice.</p></div><button className="button secondary" onClick={() => openMemory()}><Plus size={16} />Add a memory</button></div>
    <div className="filter-toolbar"><label className="search-input"><Search size={18} /><input aria-label="Search memory titles" placeholder="Find a little moment…" value={search} onChange={e => setSearch(e.target.value)} /><kbd>⌕</kbd></label><label className="month-filter"><span>From the pages of</span><input type="month" aria-label="Filter by year and month" value={month} onChange={e => setMonth(e.target.value)} /></label>{month && <button className="text-button" onClick={() => setMonth('')}>All dates</button>}</div>
    {loading ? <Loading /> : error ? <ErrorMessage message={error} retry={retry} /> : visible.length ? <><p className="results-count">{visible.length} little {visible.length === 1 ? 'story' : 'stories'}{month ? ' from this month' : ' to come back to'}</p><div className="memory-grid scrapbook-grid">{visible.slice(0, 150).map(m => <MemoryCard memory={m} key={m.id} />)}</div>{data.length > 150 && <p className="field-help">Showing the latest 150 memories. Choose a month to explore older pages.</p>}</> : <EmptyState title={search || month ? 'No moments on this page yet' : 'Every story starts somewhere'} description={search || month ? 'Try another title or month to find your moment.' : 'A photo, a few words, a day worth keeping. Start with something small.'} action={<button className="button secondary" onClick={() => openMemory()}><Plus size={16} />Add a memory</button>} />}
  </div>;
}
