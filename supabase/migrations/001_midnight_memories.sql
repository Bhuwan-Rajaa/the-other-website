-- Run once in the Supabase SQL editor. No credentials belong in this file.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 60),
  role text not null unique check (role in ('person_a', 'person_b')),
  created_at timestamptz not null default now()
);

create function public.is_partner() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = (select auth.uid())); $$;
revoke all on function public.is_partner() from public;
grant execute on function public.is_partner() to authenticated;

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  title text not null check (length(trim(title)) between 1 and 160),
  status text not null default 'completed' check (status in ('planned','confirmed','completed','cancelled')),
  location text check (length(location) <= 250),
  start_time time, end_time time,
  description text check (length(description) <= 10000),
  person_a_pov text check (length(person_a_pov) <= 10000),
  person_b_pov text check (length(person_b_pov) <= 10000),
  person_a_rating smallint check (person_a_rating between 1 and 5),
  person_b_rating smallint check (person_b_rating between 1 and 5),
  photos jsonb not null default '[]'::jsonb check (jsonb_typeof(photos) = 'array' and jsonb_array_length(photos) <= 50),
  extras jsonb not null default '{}'::jsonb check (jsonb_typeof(extras) = 'object' and octet_length(extras::text) <= 20000),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time is null or start_time is not null)
);
create index memories_event_date_idx on public.memories(event_date);
create index memories_status_idx on public.memories(status);

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  start_at timestamptz not null, end_at timestamptz not null,
  status text not null check (status in ('available','busy','maybe')),
  all_day boolean not null default false,
  note text check (length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at and end_at - start_at <= interval '370 days')
);
create index availability_user_start_idx on public.availability(user_id, start_at);
create index availability_start_idx on public.availability(start_at);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 160),
  milestone_date date not null,
  description text check (length(description) <= 10000),
  photo_path text check (length(photo_path) <= 500),
  repeat_yearly boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index milestones_date_idx on public.milestones(milestone_date);

create function public.guard_memory() returns trigger
language plpgsql set search_path = '' as $$
declare actor_role text;
begin
  select role into actor_role from public.profiles where id = (select auth.uid());
  -- Administrative setup through the SQL editor has no authenticated role.
  if actor_role is null and current_user in ('postgres', 'supabase_admin', 'service_role') then
    new.updated_at := now(); return new;
  end if;
  if actor_role is null then raise exception 'Not authorized'; end if;
  if TG_OP = 'INSERT' then
    if new.created_by <> (select auth.uid()) then raise exception 'Invalid creator'; end if;
    if actor_role = 'person_a' and (new.person_b_pov is not null or new.person_b_rating is not null) then raise exception 'Only your own reflection can be changed'; end if;
    if actor_role = 'person_b' and (new.person_a_pov is not null or new.person_a_rating is not null) then raise exception 'Only your own reflection can be changed'; end if;
  else
    if new.id <> old.id or new.created_by <> old.created_by or new.created_at <> old.created_at then raise exception 'Record identity cannot be changed'; end if;
    if actor_role = 'person_a' and (new.person_b_pov is distinct from old.person_b_pov or new.person_b_rating is distinct from old.person_b_rating) then raise exception 'Only your own reflection can be changed'; end if;
    if actor_role = 'person_b' and (new.person_a_pov is distinct from old.person_a_pov or new.person_a_rating is distinct from old.person_a_rating) then raise exception 'Only your own reflection can be changed'; end if;
  end if;
  if exists (select 1 from jsonb_array_elements(new.photos) p where
    jsonb_typeof(p) <> 'object' or p->>'path' is null or
    p->>'path' not like 'memories/' || new.id::text || '/%' or
    length(coalesce(p->>'caption','')) > 1000 or length(coalesce(p->>'alt','')) > 1000
  ) then raise exception 'Invalid photo metadata'; end if;
  new.updated_at := now(); return new;
end; $$;
create trigger guard_memory_before_write before insert or update on public.memories
for each row execute function public.guard_memory();

create function public.touch_availability() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id or new.user_id <> old.user_id or new.created_at <> old.created_at then raise exception 'Entry ownership cannot be changed'; end if;
  new.updated_at := now(); return new;
end; $$;
create trigger touch_availability_before_update before update on public.availability
for each row execute function public.touch_availability();

alter table public.profiles enable row level security;
alter table public.memories enable row level security;
alter table public.availability enable row level security;
alter table public.milestones enable row level security;

create policy partner_profiles on public.profiles for select to authenticated using ((select public.is_partner()));
create policy partner_read_memories on public.memories for select to authenticated using ((select public.is_partner()));
create policy partner_insert_memories on public.memories for insert to authenticated with check ((select public.is_partner()) and created_by = (select auth.uid()));
create policy partner_update_memories on public.memories for update to authenticated using ((select public.is_partner())) with check ((select public.is_partner()));
create policy partner_delete_memories on public.memories for delete to authenticated using ((select public.is_partner()));
create policy partner_read_availability on public.availability for select to authenticated using ((select public.is_partner()));
create policy owner_insert_availability on public.availability for insert to authenticated with check ((select public.is_partner()) and user_id = (select auth.uid()));
create policy owner_update_availability on public.availability for update to authenticated using ((select public.is_partner()) and user_id = (select auth.uid())) with check ((select public.is_partner()) and user_id = (select auth.uid()));
create policy owner_delete_availability on public.availability for delete to authenticated using ((select public.is_partner()) and user_id = (select auth.uid()));
create policy partner_read_milestones on public.milestones for select to authenticated using ((select public.is_partner()));
create policy partner_insert_milestones on public.milestones for insert to authenticated with check ((select public.is_partner()) and created_by = (select auth.uid()));
create policy partner_update_milestones on public.milestones for update to authenticated using ((select public.is_partner())) with check ((select public.is_partner()));
create policy partner_delete_milestones on public.milestones for delete to authenticated using ((select public.is_partner()));

revoke all on public.profiles, public.memories, public.availability, public.milestones from anon;
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.memories, public.availability, public.milestones to authenticated;

-- Atomic photo changes avoid overwriting a photo added by the other person.
create function public.append_memory_photo(memory_id uuid, photo jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_partner() then raise exception 'Not authorized'; end if;
  update public.memories set photos = photos || jsonb_build_array(photo) where id = memory_id;
  if not found then raise exception 'Memory not found'; end if;
end; $$;
create function public.caption_memory_photo(memory_id uuid, object_path text, new_caption text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_partner() then raise exception 'Not authorized'; end if;
  if length(new_caption) > 1000 then raise exception 'Caption too long'; end if;
  update public.memories m set photos = (
    select coalesce(jsonb_agg(case when p->>'path' = object_path then jsonb_set(p, '{caption}', to_jsonb(new_caption)) else p end order by n), '[]'::jsonb)
    from jsonb_array_elements(m.photos) with ordinality as items(p,n)
  ) where m.id = memory_id;
  if not found then raise exception 'Memory not found'; end if;
end; $$;
revoke all on function public.append_memory_photo(uuid,jsonb), public.caption_memory_photo(uuid,text,text) from public;
grant execute on function public.append_memory_photo(uuid,jsonb), public.caption_memory_photo(uuid,text,text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memory-photos', 'memory-photos', false, 20971520, array['image/jpeg','image/png','image/webp']);
create policy partner_read_photos on storage.objects for select to authenticated using (bucket_id = 'memory-photos' and (select public.is_partner()));
create policy partner_insert_photos on storage.objects for insert to authenticated with check (bucket_id = 'memory-photos' and (select public.is_partner()));
create policy partner_delete_photos on storage.objects for delete to authenticated using (bucket_id = 'memory-photos' and (select public.is_partner()));

commit;
