-- Add notifications_enabled preference to profiles
alter table public.profiles
  add column if not exists notifications_enabled boolean not null default false;
