import { audioFileInfo, MAX_AUDIO_BYTES, MAX_RECORDING_SECONDS, recorderMimeType } from './audio.ts';

export type RecordingState = 'idle' | 'requesting' | 'recording' | 'stopping';
interface RecorderCallbacks {
  onState: (state: RecordingState) => void;
  onElapsed: (seconds: number) => void;
  onComplete: (file: File, duration: number) => void;
  onError: (message: string) => void;
}

// Own the microphone's lifetime separately from React renders. Dispose also
// handles a permission request resolving after the user has left the page.
export class VoiceRecorder {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private generation = 0;
  private disposed = false;
  private pending = false;
  private discardResult = false;
  private callbacks: RecorderCallbacks;

  constructor(callbacks: RecorderCallbacks) { this.callbacks = callbacks; }

  async start() {
    if (this.disposed || this.pending || this.recorder) return;
    if (!globalThis.navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.callbacks.onError('Recording is unavailable in this browser. You can upload a voice note instead.');
      return;
    }
    const generation = ++this.generation;
    this.pending = true;
    this.callbacks.onState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (this.disposed || generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      const mimeType = recorderMimeType(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 96000 });
      this.recorder = recorder;
      this.discardResult = false;
      const chunks: Blob[] = [];
      let bytes = 0;
      const startedAt = Date.now();
      recorder.ondataavailable = event => {
        if (!event.data.size) return;
        chunks.push(event.data); bytes += event.data.size;
        if (bytes > MAX_AUDIO_BYTES && !this.discardResult) {
          this.discardResult = true;
          if (!this.disposed) this.callbacks.onError('This recording grew too large. Please make a shorter note.');
          this.stop();
        }
      };
      recorder.onstop = () => {
        clearInterval(this.timer); this.timer = undefined;
        stream.getTracks().forEach(track => track.stop());
        this.stream = null; this.recorder = null;
        if (this.disposed) return;
        this.callbacks.onState('idle');
        if (this.discardResult) return;
        try {
          const type = recorder.mimeType || chunks[0]?.type || mimeType || '';
          const blob = new Blob(chunks, { type });
          const info = audioFileInfo({ name: 'recording', type, size: blob.size });
          const file = new File([blob], `voice-note.${info.extension}`, { type: info.contentType });
          this.callbacks.onComplete(file, Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
        } catch (issue) { this.callbacks.onError(issue instanceof Error ? issue.message : 'Couldn’t prepare this recording.'); }
      };
      recorder.onerror = () => {
        this.discardResult = true;
        if (!this.disposed) this.callbacks.onError('The microphone stopped unexpectedly. Please try again or upload an audio file.');
        this.stop();
      };
      stream.getAudioTracks().forEach(track => track.addEventListener('ended', () => this.stop(), { once: true }));
      recorder.start(1000);
      this.callbacks.onElapsed(0);
      this.callbacks.onState('recording');
      this.timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        if (!this.disposed) this.callbacks.onElapsed(elapsed);
        if (elapsed >= MAX_RECORDING_SECONDS) this.stop();
      }, 250);
    } catch (issue) {
      if (this.disposed || generation !== this.generation) return;
      this.stream?.getTracks().forEach(track => track.stop());
      this.stream = null; this.recorder = null;
      this.callbacks.onState('idle');
      const name = issue instanceof Error ? issue.name : '';
      this.callbacks.onError(name === 'NotAllowedError'
        ? 'Microphone access was denied. Allow it in your browser settings, or upload an audio file.'
        : name === 'NotFoundError' ? 'No microphone was found. You can upload an audio file instead.'
        : 'Couldn’t start the microphone. Please try again or upload an audio file.');
    } finally { if (generation === this.generation) this.pending = false; }
  }

  stop() {
    if (this.pending && !this.recorder) {
      ++this.generation; this.pending = false;
      if (!this.disposed) this.callbacks.onState('idle');
    }
    if (this.recorder?.state === 'recording' || this.recorder?.state === 'paused') {
      if (!this.disposed) this.callbacks.onState('stopping');
      this.recorder.stop();
    }
    this.stream?.getTracks().forEach(track => track.stop());
    clearInterval(this.timer); this.timer = undefined;
  }

  discard() { this.discardResult = true; this.stop(); }
  dispose() { this.disposed = true; ++this.generation; this.pending = false; this.discard(); }
}
