import { config } from '../config.ts';

const DAY = 86400000;
const utcDate = (date: string) => new Date(`${date}T00:00:00Z`);
function partsAt(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}
export function today() { return localDate(new Date().toISOString()); }
export function addDays(date: string, days: number) { return new Date(utcDate(date).getTime() + days * DAY).toISOString().slice(0, 10); }
export const daysBetween = (from: string, to: string) => Math.round((utcDate(to).getTime() - utcDate(from).getTime()) / DAY);
export const monthStart = (date: string) => `${date.slice(0, 7)}-01`;
export function addMonths(date: string, months: number) {
  const value = utcDate(monthStart(date)); value.setUTCMonth(value.getUTCMonth() + months);
  return value.toISOString().slice(0, 10);
}
export const dateLabel = (date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  new Intl.DateTimeFormat('en-IN', { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));

// Resolve actual timezone offsets on surrounding days. Ambiguous fall-back times
// choose the earlier instant; nonexistent spring-forward times are rejected.
export function atLocal(date: string, time = '00:00', timezone = config.timezone) {
  const wall = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(wall)) throw new Error('Choose a valid date and time.');
  const offsets = new Set<number>();
  for (const shift of [-2, -1, 0, 1, 2]) {
    const instant = new Date(wall + shift * DAY), p = partsAt(instant, timezone);
    offsets.add(Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`) - instant.getTime());
  }
  const matches = [...offsets].map(offset => wall - offset).filter(candidate => {
    const p = partsAt(new Date(candidate), timezone);
    return `${p.year}-${p.month}-${p.day}` === date && `${p.hour}:${p.minute}` === time.slice(0, 5);
  }).sort((a, b) => a - b);
  if (!matches.length) throw new Error('That local time does not exist because the clocks change. Choose another time.');
  return new Date(matches[0]).toISOString();
}
export function dayBounds(date: string, timezone = config.timezone) {
  return { start_at: atLocal(date, '00:00', timezone), end_at: atLocal(addDays(date, 1), '00:00', timezone) };
}
export function localDate(instant: string) {
  const p = partsAt(new Date(instant), config.timezone);
  return `${p.year}-${p.month}-${p.day}`;
}
export function localTime(instant: string) {
  const p = partsAt(new Date(instant), config.timezone);
  return `${p.hour}:${p.minute}`;
}
export function clockLabel(time: string | null) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}
export function nextOccurrence(date: string, from = today()) {
  const build = (year: number) => {
    const month = Number(date.slice(5, 7)), day = Number(date.slice(8));
    const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, maxDay)).padStart(2, '0')}`;
  };
  let result = build(Number(from.slice(0, 4)));
  if (result < from) result = build(Number(from.slice(0, 4)) + 1);
  return result < date ? date : result;
}
export function calendarDays(month: string) {
  const first = monthStart(month);
  const start = addDays(first, -utcDate(first).getUTCDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
