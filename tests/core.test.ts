import assert from 'node:assert/strict';
import test from 'node:test';
import { atLocal, dayBounds, nextOccurrence, calendarDays, daysBetween } from '../src/utils/dates.ts';
import { freeIntervals, sharedAvailability } from '../src/utils/availabilityOverlap.ts';
import type { Availability } from '../src/types.ts';
import { config } from '../src/config.ts';

function entry(user: string, start: string, end: string, status: Availability['status'] = 'available'): Availability {
  return { id: `${user}-${start}`, user_id: user, start_at: start, end_at: end, status, all_day: false, note: null };
}
const instant = (hour: number) => `2026-11-03T${String(hour).padStart(2, '0')}:00:00.000Z`;
const range = (start: number, end: number) => ({ start: Date.parse(instant(start)), end: Date.parse(instant(end)) });

test('relationship anniversary and meeting milestone remain distinct', () => {
  assert.equal(config.relationshipStart, '2026-08-14');
  assert.equal(config.metDate, '2025-11-17');
  assert.equal(nextOccurrence(config.relationshipStart, '2026-11-03'), '2027-08-14');
  assert.equal(nextOccurrence(config.metDate, '2026-11-03'), '2026-11-17');
});
test('anniversary on the day counts as today and never precedes original date', () => {
  assert.equal(nextOccurrence('2026-08-14', '2026-08-14'), '2026-08-14');
  assert.equal(nextOccurrence('2026-08-14', '2025-01-01'), '2026-08-14');
});
test('February 29 anniversaries use February 28 in non-leap years', () => {
  assert.equal(nextOccurrence('2024-02-29', '2025-02-01'), '2025-02-28');
  assert.equal(nextOccurrence('2024-02-29', '2027-03-01'), '2028-02-29');
});
test('Kolkata local midnight converts to the previous UTC date', () => {
  assert.equal(atLocal('2026-08-14'), '2026-08-13T18:30:00.000Z');
  const bounds = dayBounds('2026-08-14');
  assert.equal(Date.parse(bounds.end_at) - Date.parse(bounds.start_at), 24 * 3600000);
});
test('full-day intervals honor short and long daylight-saving days', () => {
  const spring = dayBounds('2026-03-08', 'America/New_York');
  const autumn = dayBounds('2026-11-01', 'America/New_York');
  assert.equal(Date.parse(spring.end_at) - Date.parse(spring.start_at), 23 * 3600000);
  assert.equal(Date.parse(autumn.end_at) - Date.parse(autumn.start_at), 25 * 3600000);
});
test('nonexistent DST times reject and ambiguous times choose earlier instant', () => {
  assert.throws(() => atLocal('2026-03-08', '02:30', 'America/New_York'), /does not exist/);
  assert.equal(atLocal('2026-11-01', '01:30', 'America/New_York'), '2026-11-01T05:30:00.000Z');
});
test('calendar grids include complete boundary weeks', () => {
  const days = calendarDays('2026-11-01');
  assert.equal(days.length, 42); assert.equal(days[0], '2026-11-01');
  assert.equal(days[41], '2026-12-12'); assert.equal(daysBetween(days[0], days[41]), 41);
});
test('available intervals intersect and touching boundaries do not', () => {
  assert.deepEqual(sharedAvailability([entry('a', instant(9), instant(18)), entry('b', instant(16), instant(20))], 'a', 'b'), [range(16, 18)]);
  assert.deepEqual(sharedAvailability([entry('a', instant(9), instant(12)), entry('b', instant(12), instant(18))], 'a', 'b'), []);
});
test('busy slots override full-day availability', () => {
  const entries = [entry('a', instant(0), instant(23)), entry('a', instant(12), instant(14), 'busy'), entry('b', instant(10), instant(17))];
  assert.deepEqual(sharedAvailability(entries, 'a', 'b'), [range(10, 12), range(14, 17)]);
});
test('maybe slots do not become confirmed shared time even inside availability', () => {
  const entries = [entry('a', instant(9), instant(18)), entry('a', instant(12), instant(14), 'maybe'), entry('b', instant(10), instant(17))];
  assert.deepEqual(sharedAvailability(entries, 'a', 'b'), [range(10, 12), range(14, 17)]);
  assert.deepEqual(sharedAvailability([entry('a', instant(9), instant(18), 'maybe'), entry('b', instant(9), instant(18))], 'a', 'b'), []);
});
test('duplicates merge, contained busy slots split, and unrelated users are ignored', () => {
  const entries = [entry('a', instant(9), instant(14)), entry('a', instant(12), instant(18)), entry('a', instant(10), instant(11), 'busy'), entry('third', instant(0), instant(23), 'busy')];
  assert.deepEqual(freeIntervals(entries, 'a'), [range(9, 10), range(11, 18)]);
});
test('cross-midnight intervals preserve the shared portion', () => {
  const entries = [entry('a', '2026-11-03T22:00:00Z', '2026-11-04T02:00:00Z'), entry('b', '2026-11-03T23:00:00Z', '2026-11-04T01:00:00Z')];
  assert.deepEqual(sharedAvailability(entries, 'a', 'b'), [{ start: Date.parse('2026-11-03T23:00:00Z'), end: Date.parse('2026-11-04T01:00:00Z') }]);
});
