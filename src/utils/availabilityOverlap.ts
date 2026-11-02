import type { Availability, Interval } from '../types.ts';

function merge(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter(i => i.start < i.end).sort((a, b) => a.start - b.start);
  const result: Interval[] = [];
  for (const interval of sorted) {
    const last = result.at(-1);
    if (last && interval.start <= last.end) last.end = Math.max(last.end, interval.end);
    else result.push({ ...interval });
  }
  return result;
}
export function freeIntervals(entries: Availability[], userId: string): Interval[] {
  const own = entries.filter(e => e.user_id === userId);
  const ranges = (status: Availability['status']) => merge(own.filter(e => e.status === status).map(e => ({ start: Date.parse(e.start_at), end: Date.parse(e.end_at) })));
  let available = ranges('available');
  // An explicit busy or tentative slot cannot be advertised as confirmed free time.
  for (const block of [...ranges('busy'), ...ranges('maybe')]) {
    available = available.flatMap(i => block.end <= i.start || block.start >= i.end ? [i] : [
      { start: i.start, end: Math.min(i.end, block.start) },
      { start: Math.max(i.start, block.end), end: i.end },
    ].filter(p => p.start < p.end));
  }
  return merge(available);
}
export function sharedAvailability(entries: Availability[], personA: string, personB: string): Interval[] {
  const a = freeIntervals(entries, personA), b = freeIntervals(entries, personB);
  const result: Interval[] = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    const start = Math.max(a[i].start, b[j].start), end = Math.min(a[i].end, b[j].end);
    if (start < end) result.push({ start, end });
    if (a[i].end <= b[j].end) i++; else j++;
  }
  return merge(result);
}
