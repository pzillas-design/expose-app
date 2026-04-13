-- Error logs table: captures frontend errors (toast errors + silent catches)
-- Admin can read all; authenticated users can insert their own

create table if not exists public.error_logs (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid references auth.users(id) on delete set null,
    message     text not null,
    context     text,               -- component / hook name, e.g. "handleGenerate"
    url         text,               -- window.location.pathname at time of error
    source      text default 'toast', -- 'toast' | 'silent' | 'edge-function'
    created_at  timestamptz not null default now()
);

-- Indices
create index if not exists error_logs_user_id_idx  on public.error_logs(user_id);
create index if not exists error_logs_created_at_idx on public.error_logs(created_at desc);

-- RLS
alter table public.error_logs enable row level security;

-- Users can insert their own errors
create policy "Users can log their own errors"
    on public.error_logs for insert
    with check (auth.uid() = user_id or user_id is null);

-- Admins can read all errors (checked via profiles.role)
create policy "Admins can read all error logs"
    on public.error_logs for select
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );
