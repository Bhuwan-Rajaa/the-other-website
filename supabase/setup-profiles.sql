-- AFTER creating the two Auth users manually and disabling public signups,
-- replace these UUID placeholders with the IDs shown in Authentication > Users.
-- Never put passwords or PINs here. Run in the Supabase SQL editor.
begin;
insert into public.profiles (id, display_name, role) values
  ('REPLACE_WITH_BHUWAN_AUTH_UUID', 'Bhuwan', 'person_a'),
  ('REPLACE_WITH_POOJA_AUTH_UUID', 'Pooja', 'person_b');

insert into public.milestones (title, milestone_date, description, repeat_yearly, created_by)
select 'The day we met', '2025-11-17', 'The beginning of our story.', true, id
from public.profiles where role = 'person_a';
-- The August 14 relationship anniversary is derived from src/config.ts;
-- it does not need a duplicate milestone record.
commit;
