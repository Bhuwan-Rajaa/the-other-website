export type Role = 'person_a' | 'person_b';
export type Status = 'planned' | 'confirmed' | 'completed' | 'cancelled';
export interface Profile { id: string; display_name: string; role: Role }
export interface Photo { path: string; caption: string; sort_order: number; alt?: string }
export interface VoiceNote {
  id: string; path: string; title: string; created_by: string;
  created_at: string; duration_seconds: number | null;
}
export interface Memory {
  id: string; event_date: string; title: string; status: Status;
  location: string | null; start_time: string | null; end_time: string | null;
  description: string | null; person_a_pov: string | null; person_b_pov: string | null;
  person_a_rating: number | null; person_b_rating: number | null;
  photos: Photo[]; voice_notes?: VoiceNote[]; extras: Record<string, string>;
  created_by: string; created_at: string; updated_at: string;
}
export interface Availability {
  id: string; user_id: string; start_at: string; end_at: string;
  status: 'available' | 'busy' | 'maybe'; all_day: boolean; note: string | null;
}
export interface Milestone {
  id: string; title: string; milestone_date: string; description: string | null;
  photo_path: string | null; repeat_yearly: boolean; created_by: string;
}
export interface Interval { start: number; end: number }
export type MemoryInput = Pick<Memory, 'title' | 'event_date' | 'status' | 'location' | 'start_time' | 'end_time' | 'description' | 'extras'>;
