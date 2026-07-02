-- Serverseitige Aggregation für die Admin-Statistikseite.
-- Ersetzt das Laden von Rohzeilen im Client (limitiert auf 1000 Jobs / 200
-- Voice-Logs), das alle "Gesamt"-KPIs verfälschte, sobald mehr Daten existierten.
-- Die Formeln (Resolution-Buckets, Google-Kosten) spiegeln AdminStatsView.tsx.

-- ── 1. Gesamt-KPIs ───────────────────────────────────────────────────────────
create or replace function public.admin_stats_totals(p_excluded_emails text[] default '{}')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;

  with jc as (
    select g.status, g.duration_ms, g.downloaded_at,
           g.tokens_prompt, g.tokens_completion,
           coalesce(p.email, g.user_email) as eff_email,
           coalesce(p.full_name, p.email, g.user_name, 'Unknown') as eff_name,
           g.request_payload->>'provider' as provider,
           case
             when lower(coalesce(nullif(g.image_size,''), nullif(g.quality_mode,''), nullif(g.model,''), '')) like '%4k%' then '4K'
             when lower(coalesce(nullif(g.image_size,''), nullif(g.quality_mode,''), nullif(g.model,''), '')) like '%2k%' then '2K'
             when lower(coalesce(nullif(g.image_size,''), nullif(g.quality_mode,''), nullif(g.model,''), '')) like '%1k%' then '1K'
             when lower(coalesce(nullif(g.image_size,''), nullif(g.quality_mode,''), nullif(g.model,''), '')) similar to '%(0\.5|05k|sd|512)%' then '0.5K'
             else 'Other'
           end as res_bucket
    from generation_jobs g
    left join profiles p on p.id = g.user_id
    where coalesce(p.email, g.user_email) is null
       or not (coalesce(p.email, g.user_email) = any(p_excluded_emails))
  ),
  cost as (
    select coalesce(sum(
      ((coalesce(tokens_prompt,0)::numeric / 1000000) * 0.5
       + case when coalesce(tokens_completion,0) > 0
              then (tokens_completion::numeric / 1000000) * 60
              else case res_bucket
                     when '0.5K' then 0.04 when '1K' then 0.067
                     when '2K' then 0.101 when '4K' then 0.151 else 0 end
         end) * 0.92
    ), 0) as ai_cost_eur
    from jc where status = 'completed'
  ),
  prof as (
    select count(*) as total_profiles,
           count(*) filter (where created_at >= (date_trunc('day', now() at time zone 'Europe/Berlin')) at time zone 'Europe/Berlin') as signups_today,
           count(*) filter (where created_at >= (date_trunc('day', now() at time zone 'Europe/Berlin') - interval '6 days') at time zone 'Europe/Berlin') as signups_7d
    from profiles
    where email is null or not (email = any(p_excluded_emails))
  ),
  vs as (
    select v.session_id, min(v.ts) as start_ts, max(v.ts) as end_ts
    from voice_logs v
    left join profiles p on p.id = v.user_id
    where p.email is null or not (p.email = any(p_excluded_emails))
    group by v.session_id
  ),
  voice as (
    select count(*) as session_count,
           coalesce(sum((end_ts - start_ts)::numeric / 60000), 0) as total_minutes
    from vs
  ),
  top_users as (
    select jsonb_agg(t) as arr from (
      select coalesce(eff_email, eff_name) as name, count(*) as count
      from jc group by 1 order by 2 desc limit 10
    ) t
  ),
  providers as (
    select jsonb_agg(t) as arr from (
      select
        case when provider in ('fal','fal-nb2') then 'nb2'
             when provider = 'openai' then 'gpt2'
             else 'other' end as key,
        count(*) filter (where status in ('completed','failed')) as total,
        count(*) filter (where status = 'completed') as completed,
        count(*) filter (where status = 'failed') as failed,
        avg(duration_ms) filter (where status = 'completed' and duration_ms > 0) as avg_duration_ms,
        count(*) filter (where status = 'completed' and downloaded_at is not null) as downloads
      from jc group by 1
    ) t
  ),
  jstats as (
    select count(*) as total_jobs,
           count(*) filter (where status = 'completed') as completed_jobs,
           count(*) filter (where status = 'failed') as failed_jobs,
           count(distinct coalesce(eff_email, eff_name)) as unique_users_total,
           count(distinct coalesce(eff_email, eff_name)) filter (where status = 'completed') as unique_users_with_jobs
    from jc
  )
  select jsonb_build_object(
    'totalJobs',           jstats.total_jobs,
    'completedJobs',       jstats.completed_jobs,
    'failedJobs',          jstats.failed_jobs,
    'uniqueUsersTotal',    jstats.unique_users_total,
    'uniqueUsersWithJobs', jstats.unique_users_with_jobs,
    'aiCostEur',           cost.ai_cost_eur,
    'totalProfiles',       prof.total_profiles,
    'signupsToday',        prof.signups_today,
    'signups7d',           prof.signups_7d,
    'voiceSessionCount',   voice.session_count,
    'voiceTotalMinutes',   voice.total_minutes,
    'topUsers',            coalesce(top_users.arr, '[]'::jsonb),
    'providerStats',       coalesce(providers.arr, '[]'::jsonb)
  ) into result
  from jstats, cost, prof, voice, top_users, providers;

  return result;
end;
$$;

-- ── 2. Zeitreihen-Buckets (Tag/Woche/Monat) ──────────────────────────────────
-- bucket_key-Format entspricht makeBucketKey() im Frontend:
-- day → 'YYYY-MM-DD', week → ISO 'IYYY-WIW', month → 'YYYY-MM' (Europe/Berlin).
create or replace function public.admin_stats_buckets(
  p_start timestamptz,
  p_bucket text,
  p_excluded_emails text[] default '{}'
)
returns table (
  bucket_key       text,
  completed_jobs   bigint,
  failed_jobs      bigint,
  res_05k          bigint,
  res_1k           bigint,
  res_2k           bigint,
  res_4k           bigint,
  res_other        bigint,
  ai_cost_eur      numeric,
  voice_sessions   bigint,
  new_profiles     bigint,
  first_time_users bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  key_fmt text;
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;
  if p_bucket not in ('day','week','month') then
    raise exception 'invalid bucket: %', p_bucket;
  end if;
  key_fmt := case p_bucket when 'day' then 'YYYY-MM-DD' when 'week' then 'IYYY-"W"IW' else 'YYYY-MM' end;

  return query
  with jc as (
    select g.status, g.created_at,
           g.tokens_prompt, g.tokens_completion,
           coalesce(p.email, g.user_email) as eff_email,
           coalesce(p.full_name, p.email, g.user_name, 'Unknown') as eff_name,
           case
             when lower(coalesce(nullif(g.image_size,''), nullif(g.quality_mode,''), nullif(g.model,''), '')) like '%4k%' then '4K'
             when lower(coalesce(nullif(g.image_size,''), nullif(g.quality_mode,''), nullif(g.model,''), '')) like '%2k%' then '2K'
             when lower(coalesce(nullif(g.image_size,''), nullif(g.quality_mode,''), nullif(g.model,''), '')) like '%1k%' then '1K'
             when lower(coalesce(nullif(g.image_size,''), nullif(g.quality_mode,''), nullif(g.model,''), '')) similar to '%(0\.5|05k|sd|512)%' then '0.5K'
             else 'Other'
           end as res_bucket
    from generation_jobs g
    left join profiles p on p.id = g.user_id
    where coalesce(p.email, g.user_email) is null
       or not (coalesce(p.email, g.user_email) = any(p_excluded_emails))
  ),
  jobs_b as (
    select to_char(created_at at time zone 'Europe/Berlin', key_fmt) as k,
           count(*) filter (where status = 'completed') as completed,
           count(*) filter (where status = 'failed') as failed,
           count(*) filter (where status = 'completed' and res_bucket = '0.5K') as r05,
           count(*) filter (where status = 'completed' and res_bucket = '1K') as r1,
           count(*) filter (where status = 'completed' and res_bucket = '2K') as r2,
           count(*) filter (where status = 'completed' and res_bucket = '4K') as r4,
           count(*) filter (where status = 'completed' and res_bucket = 'Other') as rother,
           coalesce(sum(
             ((coalesce(tokens_prompt,0)::numeric / 1000000) * 0.5
              + case when coalesce(tokens_completion,0) > 0
                     then (tokens_completion::numeric / 1000000) * 60
                     else case res_bucket
                            when '0.5K' then 0.04 when '1K' then 0.067
                            when '2K' then 0.101 when '4K' then 0.151 else 0 end
                end) * 0.92
           ) filter (where status = 'completed'), 0) as cost
    from jc
    where created_at >= p_start
    group by 1
  ),
  vs as (
    select v.session_id, to_timestamp(min(v.ts) / 1000.0) as started_at
    from voice_logs v
    left join profiles p on p.id = v.user_id
    where p.email is null or not (p.email = any(p_excluded_emails))
    group by v.session_id
  ),
  voice_b as (
    select to_char(started_at at time zone 'Europe/Berlin', key_fmt) as k, count(*) as sessions
    from vs where started_at >= p_start
    group by 1
  ),
  prof_b as (
    select to_char(created_at at time zone 'Europe/Berlin', key_fmt) as k, count(*) as new_profiles
    from profiles
    where created_at >= p_start
      and (email is null or not (email = any(p_excluded_emails)))
    group by 1
  ),
  firsts as (
    select coalesce(eff_email, eff_name) as u, min(created_at) as first_ts
    from jc where status = 'completed'
    group by 1
  ),
  first_b as (
    select to_char(first_ts at time zone 'Europe/Berlin', key_fmt) as k, count(*) as first_users
    from firsts where first_ts >= p_start
    group by 1
  ),
  all_keys as (
    select k from jobs_b union select k from voice_b union select k from prof_b union select k from first_b
  )
  select ak.k,
         coalesce(jb.completed, 0), coalesce(jb.failed, 0),
         coalesce(jb.r05, 0), coalesce(jb.r1, 0), coalesce(jb.r2, 0), coalesce(jb.r4, 0), coalesce(jb.rother, 0),
         coalesce(jb.cost, 0),
         coalesce(vb.sessions, 0),
         coalesce(pb.new_profiles, 0),
         coalesce(fb.first_users, 0)
  from all_keys ak
  left join jobs_b  jb on jb.k = ak.k
  left join voice_b vb on vb.k = ak.k
  left join prof_b  pb on pb.k = ak.k
  left join first_b fb on fb.k = ak.k
  order by ak.k;
end;
$$;

-- ── 3. Baseline für kumulative Kurven (Nutzer gesamt / Aktivierungsrate) ─────
create or replace function public.admin_stats_baseline(
  p_start timestamptz,
  p_excluded_emails text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;

  with firsts as (
    select coalesce(coalesce(p.email, g.user_email), coalesce(p.full_name, g.user_name, 'Unknown')) as u,
           min(g.created_at) as first_ts
    from generation_jobs g
    left join profiles p on p.id = g.user_id
    where g.status = 'completed'
      and (coalesce(p.email, g.user_email) is null
           or not (coalesce(p.email, g.user_email) = any(p_excluded_emails)))
    group by 1
  )
  select jsonb_build_object(
    'profilesBefore', (
      select count(*) from profiles
      where created_at < p_start
        and (email is null or not (email = any(p_excluded_emails)))
    ),
    'activatedBefore', (select count(*) from firsts where first_ts < p_start)
  ) into result;

  return result;
end;
$$;

grant execute on function public.admin_stats_totals(text[]) to authenticated;
grant execute on function public.admin_stats_buckets(timestamptz, text, text[]) to authenticated;
grant execute on function public.admin_stats_baseline(timestamptz, text[]) to authenticated;
