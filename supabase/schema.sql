-- =============================================================================
-- Workout tracker schema
--
-- Run this once in the Supabase SQL editor (Dashboard -> SQL -> New query).
-- Every table is scoped to auth.uid() through row-level security, which is what
-- makes it safe to talk to Postgres straight from the browser with the anon key.
-- =============================================================================

-- Profile: one row per user, holding program position and app settings.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  block       integer     not null default 1,
  phase       integer     not null default 1 check (phase between 1 and 6),
  week        integer     not null default 1 check (week between 1 and 5),
  settings    jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One row per workout performed.
create table if not exists public.sessions (
  id            uuid primary key,
  user_id       uuid        not null references auth.users (id) on delete cascade,
  block         integer     not null default 1,
  phase         integer     not null,
  week          integer     not null,
  is_deload     boolean     not null default false,
  workout_id    text        not null,
  workout_name  text        not null,
  workout_index integer     not null,
  started_at    timestamptz not null,
  completed_at  timestamptz,
  notes         text        not null default '',
  updated_at    timestamptz not null default now()
);

create index if not exists sessions_user_started_idx
  on public.sessions (user_id, started_at desc);

-- Every set, with the weight and reps actually performed.
create table if not exists public.set_logs (
  id            uuid primary key,
  session_id    uuid        not null references public.sessions (id) on delete cascade,
  user_id       uuid        not null references auth.users (id) on delete cascade,
  exercise_slug text        not null,
  set_order     integer     not null,
  kind          text        not null check (kind in ('warmup', 'hard')),
  target_reps   integer     not null,
  target_weight numeric(7, 2),
  reps          integer,
  weight        numeric(7, 2),
  unit          text        not null default 'kg' check (unit in ('kg', 'lb')),
  completed     boolean     not null default false,
  completed_at  timestamptz
);

create index if not exists set_logs_session_idx on public.set_logs (session_id);
create index if not exists set_logs_user_exercise_idx
  on public.set_logs (user_id, exercise_slug, completed_at desc);

-- Rolling memory that seeds the next suggestion for each exercise.
create table if not exists public.exercise_states (
  user_id       uuid        not null references auth.users (id) on delete cascade,
  exercise_slug text        not null,
  last_weight   numeric(7, 2),
  last_reps     integer,
  unit          text        not null default 'kg' check (unit in ('kg', 'lb')),
  best_e1rm     numeric(7, 2),
  updated_at    timestamptz not null default now(),
  primary key (user_id, exercise_slug)
);

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.sessions        enable row level security;
alter table public.set_logs        enable row level security;
alter table public.exercise_states enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own sets" on public.set_logs;
create policy "own sets" on public.set_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own exercise states" on public.exercise_states;
create policy "own exercise states" on public.exercise_states
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Create the profile row automatically on sign-up.
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
