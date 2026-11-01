-- Reword schema. Run in Supabase SQL editor.
-- AI-4 (isolation): every table is RLS-scoped to auth.uid(); no cross-user reads are possible.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  email         text,
  name          text,
  niche         text,
  audience      text,
  tone          text,
  writing_sample text,
  onboarded     boolean not null default false,
  plan          text not null default 'free',
  theme         text not null default 'system',
  language      text not null default 'en',
  minds_name    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------- projects
-- A project is only in the Library when saved = true (scope 3.5).
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  title        text not null default 'Untitled project',
  source_type  text not null default 'record' check (source_type in ('record','upload')),
  audio_path   text,
  duration_sec integer,
  transcript   text not null default '',
  saved        boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists projects_user_saved_idx on public.projects (user_id, saved, updated_at desc);

-- ---------------------------------------------------------------- outputs
-- Exactly four formats (scope 3.3). generated_content is kept so we can diff
-- user edits against the model output for memory suggestions (scope 3.4).
create table if not exists public.outputs (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects on delete cascade,
  user_id           uuid not null references auth.users on delete cascade,
  format            text not null check (format in ('linkedin_blog','x_thread','instagram_facebook','tiktok_reels')),
  content           text not null default '',
  generated_content text not null default '',
  edited            boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (project_id, format)
);
create index if not exists outputs_project_idx on public.outputs (project_id);

-- ---------------------------------------------------------------- memories
create table if not exists public.memories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  content    text not null,
  source     text not null default 'manual' check (source in ('onboarding','explicit','approved_suggestion','manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists memories_user_idx on public.memories (user_id, created_at desc);

-- ------------------------------------------------------- memory_suggestions
-- MEMORY CONTROL RULE (scope 3.4 / AI-5): edit-derived preferences land here as
-- 'pending' and only become a memory after the user approves.
create table if not exists public.memory_suggestions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  project_id uuid references public.projects on delete cascade,
  format     text,
  content    text not null,
  rationale  text,
  status     text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
create index if not exists suggestions_user_status_idx on public.memory_suggestions (user_id, status, created_at desc);

-- ---------------------------------------------------------------- RLS
alter table public.profiles           enable row level security;
alter table public.projects           enable row level security;
alter table public.outputs            enable row level security;
alter table public.memories           enable row level security;
alter table public.memory_suggestions enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own projects" on public.projects;
create policy "own projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own outputs" on public.outputs;
create policy "own outputs" on public.outputs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own memories" on public.memories;
create policy "own memories" on public.memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own suggestions" on public.memory_suggestions;
create policy "own suggestions" on public.memory_suggestions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------- profile bootstrap trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ------------------------------------------------------------ updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists outputs_touch on public.outputs;
create trigger outputs_touch before update on public.outputs
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

drop policy if exists "own audio" on storage.objects;
create policy "own audio" on storage.objects
  for all to authenticated
  using  (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
