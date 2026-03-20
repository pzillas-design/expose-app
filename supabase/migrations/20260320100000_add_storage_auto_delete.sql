-- Add storage_auto_delete preference to profiles
alter table public.profiles
  add column if not exists storage_auto_delete boolean not null default false;
