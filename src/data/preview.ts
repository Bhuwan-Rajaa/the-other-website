import type { Availability, Memory, Milestone, Profile } from '../types';
import { config } from '../config';
import { addDays, atLocal, dayBounds, today } from '../utils/dates';

// Illustrative sample stories only. Never written to Supabase or browser storage.
export const previewProfiles: Profile[] = [
  { id: 'preview-a', display_name: 'Bhuwan', role: 'person_a' },
  { id: 'preview-b', display_name: 'Pooja', role: 'person_b' },
];
export const samplePhotos = {
  mountains: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=85',
  dinner: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=85',
  sea: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&w=1000&q=85',
  coffee: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1000&q=85',
};
function memory(id: string, title: string, offset: number, image: string, category: string, description: string): Memory {
  return { id, title, event_date: addDays(today(), offset), status: 'completed', location: 'Somewhere with you',
    start_time: null, end_time: null, description, person_a_pov: null, person_b_pov: null,
    person_a_rating: null, person_b_rating: null, photos: [{ path: image, caption: '', sort_order: 0, alt: title }],
    extras: { activity: category }, created_by: 'preview-a', created_at: '', updated_at: '' };
}
export const previewMemories: Memory[] = [
  memory('sample-dinner', 'Just one more hour', -3, samplePhotos.dinner, 'Date night', 'A little table, a long conversation, and absolutely no hurry to go home.'),
  memory('sample-sea', 'Where the world slowed down', -9, samplePhotos.sea, 'Little escapes', 'Salt in the air. Sand in our shoes. A whole evening that felt like ours.'),
  memory('sample-coffee', 'Coffee & all the little things', -15, samplePhotos.coffee, 'Everyday magic', 'Nothing extraordinary. Just my favourite person and a very good cup of coffee.'),
  { ...memory('sample-plan', 'An evening, just for us', 4, '', 'Date night', 'Pick a cosy place. Leave the rest of the evening open.'), status: 'confirmed', start_time: '19:00', location: 'Our favourite little café', photos: [] },
];
export const previewMilestones: Milestone[] = [{ id: 'sample-met', title: 'The day we met', milestone_date: config.metDate, description: 'Before we knew what this would become.', photo_path: null, repeat_yearly: true, created_by: 'preview-a' }];
export const previewAvailability: Availability[] = [
  { id: 'sample-free-a', user_id: 'preview-a', ...dayBounds(addDays(today(), 1)), status: 'available', all_day: true, note: null },
  { id: 'sample-free-b', user_id: 'preview-b', start_at: atLocal(addDays(today(), 1), '17:00'), end_at: atLocal(addDays(today(), 1), '21:00'), status: 'available', all_day: false, note: 'A little time for us' },
];
