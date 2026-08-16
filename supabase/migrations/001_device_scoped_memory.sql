-- Migration: scope `memories` by device_id.
--
-- Run this once in the Supabase SQL editor against an EXISTING database
-- that was created from an earlier version of supabase/schema.sql (one
-- without a device_id column). Fresh installs should just run the current
-- schema.sql instead, which already includes this shape.
--
-- Root cause this fixes: `memories` previously had `unique (category, key)`
-- with no owner column at all, so every browser/device read and wrote the
-- exact same global row set — e.g. any device saving "identity/name"
-- overwrote the one row every other device also saw. This migration adds
-- device_id and re-scopes the uniqueness constraint per device so memory
-- created on one device never appears on another.
--
-- Existing rows have no known device association (they predate device
-- scoping), so they are tagged with the sentinel 'legacy-unassigned'
-- rather than guessed onto whichever device happens to run this script.
-- That means: no data is deleted, but those rows will not appear to any
-- real device until you deliberately reassign them. To move them onto a
-- specific device (e.g. your primary browser), find that browser's id via
-- its devtools console (`localStorage.getItem('jarvis_session_id')`) and
-- run, once, in the SQL editor:
--
--   update memories set device_id = '<your-device-id>'
--   where device_id = 'legacy-unassigned';
--
-- (Uses ON CONFLICT DO NOTHING semantics implicitly via the constraint
-- rebuild below, so re-running this migration is safe.)

alter table memories add column if not exists device_id text;

update memories set device_id = 'legacy-unassigned' where device_id is null;

alter table memories alter column device_id set not null;

alter table memories drop constraint if exists memories_category_key_key;

alter table memories drop constraint if exists memories_device_id_category_key_key;
alter table memories add constraint memories_device_id_category_key_key
  unique (device_id, category, key);

create index if not exists idx_memories_device on memories (device_id);
