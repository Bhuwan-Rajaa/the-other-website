-- Existing installations: run this migration once in the Supabase SQL editor.
-- New installations: run 001 first, then this file. Existing memories are kept.
begin;

alter table public.memories
  add column if not exists voice_notes jsonb not null default '[]'::jsonb;
alter table public.memories add constraint memories_voice_notes_array
  check (jsonb_typeof(voice_notes) = 'array' and jsonb_array_length(voice_notes) <= 20);

create function public.guard_voice_notes() returns trigger
language plpgsql set search_path = '' as $$
declare
  note jsonb;
  previous_note jsonb;
  actor uuid := (select auth.uid());
begin
  if jsonb_typeof(new.voice_notes) <> 'array' or jsonb_array_length(new.voice_notes) > 20 then
    raise exception 'A memory can hold up to 20 voice notes';
  end if;
  if (select count(distinct item->>'id') from jsonb_array_elements(new.voice_notes) item) <> jsonb_array_length(new.voice_notes) then
    raise exception 'Each voice note needs a unique ID';
  end if;
  for note in select value from jsonb_array_elements(new.voice_notes) loop
    if jsonb_typeof(note) <> 'object'
      or coalesce(jsonb_typeof(note->'id'), '') <> 'string'
      or coalesce(note->>'id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or coalesce(jsonb_typeof(note->'path'), '') <> 'string'
      or coalesce(note->>'path', '') !~ ('^memories/' || new.id::text || '/' || (note->>'id') || '\.(webm|m4a|mp3|ogg|wav|aac)$')
      or coalesce(jsonb_typeof(note->'title'), '') <> 'string'
      or length(trim(coalesce(note->>'title', ''))) not between 1 and 160
      or coalesce(jsonb_typeof(note->'created_by'), '') <> 'string'
      or coalesce(jsonb_typeof(note->'created_at'), '') <> 'string'
    then raise exception 'Invalid voice note metadata'; end if;
    -- Casts also reject malformed identifiers and timestamps.
    if not exists (select 1 from public.profiles where id = (note->>'created_by')::uuid)
      or (note->>'created_at')::timestamptz is null then
      raise exception 'Invalid voice note author or date';
    end if;
    if note->'duration_seconds' is not null and note->'duration_seconds' <> 'null'::jsonb then
      if jsonb_typeof(note->'duration_seconds') <> 'number' then raise exception 'Invalid voice note duration'; end if;
      if (note->>'duration_seconds')::numeric not between 0 and 86400 then raise exception 'Invalid voice note duration'; end if;
    end if;
    previous_note := null;
    if TG_OP = 'UPDATE' then
      select item into previous_note from jsonb_array_elements(old.voice_notes) item where item->>'id' = note->>'id';
    end if;
    if previous_note is not null then
      if note is distinct from previous_note then raise exception 'Existing recordings cannot be overwritten'; end if;
    elsif actor is not null and note->>'created_by' is distinct from actor::text then
      raise exception 'A voice note must use your own identity';
    end if;
  end loop;
  return new;
end; $$;
create trigger guard_voice_notes_before_write before insert or update on public.memories
for each row execute function public.guard_voice_notes();

-- Append/remove only the selected note, preserving concurrent partner uploads.
create function public.append_memory_voice_note(
  memory_id uuid, note_id uuid, object_path text, note_title text, duration_seconds integer default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare note jsonb;
begin
  if not public.is_partner() then raise exception 'Not authorized'; end if;
  note := jsonb_build_object(
    'id', note_id, 'path', object_path, 'title', coalesce(nullif(trim(note_title), ''), 'A little note for us'),
    'created_by', (select auth.uid()), 'created_at', now(), 'duration_seconds', duration_seconds
  );
  update public.memories set voice_notes = voice_notes || jsonb_build_array(note) where id = memory_id;
  if not found then raise exception 'Memory not found'; end if;
  return note;
end; $$;

create function public.remove_memory_voice_note(memory_id uuid, note_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_partner() then raise exception 'Not authorized'; end if;
  update public.memories m set voice_notes = (
    select coalesce(jsonb_agg(item order by n), '[]'::jsonb)
    from jsonb_array_elements(m.voice_notes) with ordinality as notes(item,n)
    where item->>'id' <> note_id::text
  ) where m.id = memory_id;
  if not found then raise exception 'Memory not found'; end if;
end; $$;

revoke all on function public.append_memory_voice_note(uuid,uuid,text,text,integer), public.remove_memory_voice_note(uuid,uuid) from public;
grant execute on function public.append_memory_voice_note(uuid,uuid,text,text,integer), public.remove_memory_voice_note(uuid,uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memory-audio', 'memory-audio', false, 10485760,
  array['audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/aac']);

create policy partner_read_voice_notes on storage.objects for select to authenticated
using (bucket_id = 'memory-audio' and (select public.is_partner()));
create policy partner_insert_voice_notes on storage.objects for insert to authenticated
with check (
  bucket_id = 'memory-audio' and (select public.is_partner())
  and (storage.foldername(name))[1] = 'memories'
  and exists (select 1 from public.memories where id::text = (storage.foldername(name))[2])
);
create policy partner_delete_voice_notes on storage.objects for delete to authenticated
using (bucket_id = 'memory-audio' and (select public.is_partner()));

commit;
