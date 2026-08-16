-- JARVIS Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

-- =========================================================
-- conversations: raw chat history (user + assistant turns)
-- =========================================================
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversations_session_created
  on conversations (session_id, created_at desc);

-- =========================================================
-- memories: long-term persistent facts about the user
-- =========================================================
-- device_id identifies the browser/device the memory belongs to (see
-- server/src/middleware/deviceId.ts and client/src/state/store.ts). There
-- is no authenticated user system in this app, so device_id — a random id
-- generated on first visit and persisted in that browser's localStorage —
-- is the isolation boundary: memory created on one device must never be
-- readable from another. The uniqueness constraint is scoped per-device
-- (not globally) so two devices can each have their own, independent
-- "identity/name" or "preference/favorite_color" fact.
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  category text not null,          -- e.g. identity, preference, project, fact
  key text not null,
  value text not null,
  importance smallint not null default 1, -- 1 (low) .. 5 (high)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_id, category, key)
);

create index if not exists idx_memories_device on memories (device_id);
create index if not exists idx_memories_category on memories (category);
create index if not exists idx_memories_importance on memories (importance desc);

-- =========================================================
-- user_preferences: lightweight key/value UI + behavior prefs
-- =========================================================
create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  updated_at timestamptz not null default now()
);

-- =========================================================
-- assistant_settings: runtime-configurable assistant settings
-- =========================================================
create table if not exists assistant_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  updated_at timestamptz not null default now()
);

-- =========================================================
-- updated_at triggers
-- =========================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_memories_updated_at on memories;
create trigger trg_memories_updated_at
  before update on memories
  for each row execute function set_updated_at();

drop trigger if exists trg_user_preferences_updated_at on user_preferences;
create trigger trg_user_preferences_updated_at
  before update on user_preferences
  for each row execute function set_updated_at();

drop trigger if exists trg_assistant_settings_updated_at on assistant_settings;
create trigger trg_assistant_settings_updated_at
  before update on assistant_settings
  for each row execute function set_updated_at();

-- =========================================================
-- Row Level Security
-- =========================================================
-- This is a single-user personal assistant with no auth layer.
-- All reads/writes are performed by the backend using the Supabase
-- service-role key, which bypasses RLS entirely. RLS is enabled here
-- as defense-in-depth in case the anon/publishable key is ever used
-- directly from the client: it is granted read-only access, and all
-- writes are denied so mutations can only happen through the backend.

alter table conversations enable row level security;
alter table memories enable row level security;
alter table user_preferences enable row level security;
alter table assistant_settings enable row level security;

drop policy if exists "public read conversations" on conversations;
create policy "public read conversations" on conversations
  for select using (true);

drop policy if exists "public read memories" on memories;
create policy "public read memories" on memories
  for select using (true);

drop policy if exists "public read user_preferences" on user_preferences;
create policy "public read user_preferences" on user_preferences
  for select using (true);

drop policy if exists "public read assistant_settings" on assistant_settings;
create policy "public read assistant_settings" on assistant_settings
  for select using (true);

-- No insert/update/delete policies are defined for the anon/publishable
-- role, so those operations are rejected unless performed with the
-- service-role key (server-side only).
