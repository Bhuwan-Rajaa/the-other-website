export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_RECORDING_SECONDS = 5 * 60;
export const MAX_VOICE_NOTES = 20;
export const acceptedAudio = 'audio/webm,audio/mp4,audio/mpeg,audio/ogg,audio/wav,audio/aac,.m4a,.mp3,.webm,.ogg,.wav,.aac';

const extensions: Record<string, string> = {
  'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/aac': 'aac',
};
const aliases: Record<string, string> = {
  'audio/x-m4a': 'audio/mp4', 'audio/m4a': 'audio/mp4',
  'audio/x-wav': 'audio/wav', 'audio/wave': 'audio/wav',
  'audio/mp3': 'audio/mpeg', 'audio/x-aac': 'audio/aac',
};
export function audioFileInfo(file: Pick<File, 'name' | 'type' | 'size'>) {
  if (!file.size) throw new Error('This recording is empty. Please record or choose another file.');
  if (file.size > MAX_AUDIO_BYTES) throw new Error('Choose a voice note smaller than 10 MB.');
  let type = file.type.toLowerCase().split(';')[0].trim();
  type = aliases[type] || type;
  if (!type || type === 'application/octet-stream') {
    const extension = file.name.split('.').at(-1)?.toLowerCase();
    type = Object.entries(extensions).find(([, ext]) => ext === extension)?.[0] || '';
  }
  if (!extensions[type]) throw new Error('Choose an MP3, M4A, WebM, OGG, WAV, or AAC audio file.');
  return { contentType: type, extension: extensions[type] };
}
export function recorderMimeType(supports: (type: string) => boolean) {
  return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'].find(supports);
}
export function durationLabel(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}
