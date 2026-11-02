import { database } from '../services/supabase';

export const allowedImages = 'image/jpeg,image/png,image/webp';
export async function uploadImage(file: File, folder: string) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP photo. Convert HEIC photos to JPG before uploading.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose a photo smaller than 20 MB.');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Couldn’t prepare this photo.')), 'image/jpeg', 0.85));
  const path = `${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await database().storage.from('memory-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error('Photo upload failed. Check your connection and try again.');
  return path;
}
