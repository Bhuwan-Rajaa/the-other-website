import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { readFileSync } from 'node:fs';
import { atLocal, dayBounds, nextOccurrence, calendarDays, daysBetween } from '../src/utils/dates.ts';
import { freeIntervals, sharedAvailability } from '../src/utils/availabilityOverlap.ts';
import type { Availability } from '../src/types.ts';
import { config } from '../src/config.ts';
import { audioFileInfo, MAX_AUDIO_BYTES, MAX_RECORDING_SECONDS, recorderMimeType } from '../src/utils/audio.ts';
import { VoiceRecorder } from '../src/utils/voiceRecorder.ts';
import { authReducer, initialAuthState } from '../src/context/authState.ts';
import type { Profile } from '../src/types.ts';

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

test('audio uploads normalize browser codecs, M4A aliases, and missing MIME types', () => {
  assert.deepEqual(audioFileInfo({ name: 'note.webm', type: 'audio/webm;codecs=opus', size: 100 }), { contentType: 'audio/webm', extension: 'webm' });
  assert.deepEqual(audioFileInfo({ name: 'note.m4a', type: 'audio/x-m4a', size: 100 }), { contentType: 'audio/mp4', extension: 'm4a' });
  assert.deepEqual(audioFileInfo({ name: 'note.MP3', type: '', size: 100 }), { contentType: 'audio/mpeg', extension: 'mp3' });
});
test('audio uploads reject empty, oversized, and unsupported files', () => {
  assert.throws(() => audioFileInfo({ name: 'note.mp3', type: 'audio/mpeg', size: 0 }), /empty/);
  assert.throws(() => audioFileInfo({ name: 'note.mp3', type: 'audio/mpeg', size: MAX_AUDIO_BYTES + 1 }), /10 MB/);
  assert.throws(() => audioFileInfo({ name: 'note.mp3', type: 'text/html', size: 100 }), /audio file/);
  assert.throws(() => audioFileInfo({ name: 'note.exe', type: 'application/octet-stream', size: 100 }), /audio file/);
});
test('recording chooses a supported format including Safari MP4 fallback', () => {
  assert.equal(recorderMimeType(type => type.includes('webm')), 'audio/webm;codecs=opus');
  assert.equal(recorderMimeType(type => type === 'audio/mp4'), 'audio/mp4');
  assert.equal(recorderMimeType(() => false), undefined);
});

function fakeMicrophone(t: TestContext, request?: () => Promise<unknown>) {
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const previousRecorder = Object.getOwnPropertyDescriptor(globalThis, 'MediaRecorder');
  const track = { stopped: false, stop() { this.stopped = true; }, addEventListener() {} };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  class FakeMediaRecorder {
    static instances = 0;
    static isTypeSupported(type: string) { return type.startsWith('audio/webm'); }
    state = 'inactive';
    mimeType = 'audio/webm;codecs=opus';
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() { FakeMediaRecorder.instances++; }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob(['recorded test audio'], { type: this.mimeType }) });
      this.onstop?.();
    }
  }
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: request || (async () => stream) } } });
  Object.defineProperty(globalThis, 'MediaRecorder', { configurable: true, value: FakeMediaRecorder });
  t.after(() => {
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator); else Reflect.deleteProperty(globalThis, 'navigator');
    if (previousRecorder) Object.defineProperty(globalThis, 'MediaRecorder', previousRecorder); else Reflect.deleteProperty(globalThis, 'MediaRecorder');
  });
  const states: string[] = [], errors: string[] = [], completed: { file: File; seconds: number }[] = [];
  const recorder = new VoiceRecorder({ onState: state => states.push(state), onElapsed: () => {}, onError: error => errors.push(error), onComplete: (file, seconds) => completed.push({ file, seconds }) });
  t.after(() => recorder.dispose());
  return { recorder, stream, track, states, errors, completed, FakeMediaRecorder };
}
test('stopping a recording releases the microphone and produces one playable draft', async t => {
  const mic = fakeMicrophone(t);
  await mic.recorder.start();
  assert.equal(mic.track.stopped, false);
  mic.recorder.stop();
  assert.equal(mic.track.stopped, true);
  assert.equal(mic.completed.length, 1);
  assert.equal(mic.completed[0].file.type, 'audio/webm');
  assert.ok(mic.completed[0].file.size > 0);
  assert.deepEqual(mic.states, ['requesting', 'recording', 'stopping', 'idle']);
  assert.deepEqual(mic.errors, []);
});
test('leaving the page stops the microphone and discards an active recording', async t => {
  const mic = fakeMicrophone(t);
  await mic.recorder.start(); mic.recorder.dispose();
  assert.equal(mic.track.stopped, true);
  assert.equal(mic.completed.length, 0);
});
test('microphone access granted after unmount is immediately released', async t => {
  let grant!: (stream: unknown) => void;
  const permission = new Promise(resolve => { grant = resolve; });
  const mic = fakeMicrophone(t, () => permission);
  const start = mic.recorder.start(); mic.recorder.dispose();
  grant(mic.stream); await start;
  assert.equal(mic.track.stopped, true);
  assert.equal(mic.FakeMediaRecorder.instances, 0);
  assert.equal(mic.completed.length, 0);
  assert.deepEqual(mic.states, ['requesting']);
});
test('canceling a pending microphone request does not start recording when granted', async t => {
  let grant!: (stream: unknown) => void;
  const permission = new Promise(resolve => { grant = resolve; });
  const mic = fakeMicrophone(t, () => permission);
  const start = mic.recorder.start(); mic.recorder.discard();
  grant(mic.stream); await start;
  assert.equal(mic.track.stopped, true);
  assert.equal(mic.completed.length, 0);
  assert.deepEqual(mic.states, ['requesting', 'idle']);
});
test('denied microphone permission produces a useful error without a recording', async t => {
  const mic = fakeMicrophone(t, async () => { throw new DOMException('Permission denied', 'NotAllowedError'); });
  await mic.recorder.start();
  assert.match(mic.errors[0], /denied/);
  assert.equal(mic.completed.length, 0);
  assert.deepEqual(mic.states, ['requesting', 'idle']);
});
test('recordings stop automatically at five minutes and release the microphone', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setInterval'], now: 1000 });
  const mic = fakeMicrophone(t);
  await mic.recorder.start();
  t.mock.timers.tick(MAX_RECORDING_SECONDS * 1000);
  assert.equal(mic.track.stopped, true);
  assert.equal(mic.completed.length, 1);
  assert.equal(mic.completed[0].seconds, MAX_RECORDING_SECONDS);
});
test('the deployed permissions policy permits microphone recording on the app origin', () => {
  const deployment = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const policy = deployment.headers.flatMap((group: { headers: { key: string; value: string }[] }) => group.headers)
    .find((header: { key: string }) => header.key.toLowerCase() === 'permissions-policy');
  assert.match(policy.value, /microphone=\(self\)/);
});

const authPersonA: Profile = { id: 'auth-user-a', display_name: 'Bhuwan', role: 'person_a' };
const authPersonB: Profile = { id: 'auth-user-b', display_name: 'Pooja', role: 'person_b' };
function verifiedAuth(profile = authPersonA) {
  const pending = authReducer(initialAuthState(true), { type: 'session', userId: profile.id });
  return authReducer(pending, { type: 'verified', userId: profile.id, verification: pending.verification, profile });
}
test('returning to a tab and refreshing tokens preserve the verified page state', () => {
  const verified = verifiedAuth();
  // Both refocused SIGNED_IN and TOKEN_REFRESHED contain the same account ID.
  const refocused = authReducer(verified, { type: 'session', userId: authPersonA.id });
  const refreshed = authReducer(refocused, { type: 'session', userId: authPersonA.id });
  assert.strictEqual(refocused, verified);
  assert.strictEqual(refreshed, verified);
  assert.equal(refreshed.loading, false);
  assert.strictEqual(refreshed.profile, authPersonA);
});
test('repeated session events do not restart an in-flight profile verification', () => {
  const pending = authReducer(initialAuthState(true), { type: 'session', userId: authPersonA.id });
  assert.strictEqual(authReducer(pending, { type: 'session', userId: authPersonA.id }), pending);
});
test('an actual account change clears the prior profile and requires verification', () => {
  const verified = verifiedAuth();
  const switched = authReducer(verified, { type: 'session', userId: authPersonB.id });
  assert.equal(switched.profile, null); assert.equal(switched.loading, true);
  assert.equal(switched.userId, authPersonB.id);
  const oldResult = authReducer(switched, { type: 'verified', userId: authPersonA.id, verification: verified.verification, profile: authPersonA });
  assert.strictEqual(oldResult, switched);
  const newResult = authReducer(switched, { type: 'verified', userId: authPersonB.id, verification: switched.verification, profile: authPersonB });
  assert.equal(newResult.loading, false); assert.strictEqual(newResult.profile, authPersonB);
});
test('sign-out clears access and an old response cannot restore the account', () => {
  const verified = verifiedAuth();
  const signedOut = authReducer(verified, { type: 'session', userId: null });
  assert.equal(signedOut.profile, null); assert.equal(signedOut.userId, null); assert.equal(signedOut.loading, false);
  assert.strictEqual(authReducer(signedOut, { type: 'verified', userId: authPersonA.id, verification: verified.verification, profile: authPersonA }), signedOut);
});
test('a quick sign-out/sign-in to the same account ignores the old verification', () => {
  const pending = authReducer(initialAuthState(true), { type: 'session', userId: authPersonA.id });
  const out = authReducer(pending, { type: 'session', userId: null });
  const back = authReducer(out, { type: 'session', userId: authPersonA.id });
  assert.notEqual(back.verification, pending.verification);
  assert.strictEqual(authReducer(back, { type: 'verified', userId: authPersonA.id, verification: pending.verification, profile: authPersonA }), back);
});
test('initial logged-out sessions finish loading and mismatched profiles are rejected', () => {
  const loggedOut = authReducer(initialAuthState(true), { type: 'session', userId: null });
  assert.equal(loggedOut.loading, false);
  const pending = authReducer(loggedOut, { type: 'session', userId: authPersonA.id });
  const denied = authReducer(pending, { type: 'verified', userId: authPersonA.id, verification: pending.verification, profile: authPersonB });
  assert.equal(denied.profile, null); assert.equal(denied.loading, false); assert.ok(denied.error);
});
test('a failed profile check can be retried without remaining stuck on loading', () => {
  const pending = authReducer(initialAuthState(true), { type: 'session', userId: authPersonA.id });
  const failed = authReducer(pending, { type: 'verified', userId: authPersonA.id, verification: pending.verification, profile: null });
  const retry = authReducer(failed, { type: 'session', userId: authPersonA.id });
  assert.equal(retry.loading, true); assert.notEqual(retry.verification, failed.verification);
  const verified = authReducer(retry, { type: 'verified', userId: authPersonA.id, verification: retry.verification, profile: authPersonA });
  assert.equal(verified.error, ''); assert.strictEqual(verified.profile, authPersonA);
});
