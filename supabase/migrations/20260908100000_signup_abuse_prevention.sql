-- Missbrauchsschutz für den 2-€-Startbonus.
--
-- Befund (08.09.2026): 110 Konten auf 15 Wegwerf-Domains, alle über Google
-- OAuth angelegt und damit "verifiziert" — eine E-Mail-Bestätigung hätte davon
-- nichts verhindert. 0 € Umsatz, 410 erzeugte Bilder, rund 207 € verschenkter
-- Gegenwert. mylossless.com legte bis zuletzt täglich neue Konten an.

create table if not exists public.signup_domain_policy (
    domain      text primary key,
    kind        text not null check (kind in ('blocked','public','trusted')),
    note        text,
    created_at  timestamptz not null default now()
);
alter table public.signup_domain_policy enable row level security;
drop policy if exists sdp_admin_all on public.signup_domain_policy;
create policy sdp_admin_all on public.signup_domain_policy for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

alter table public.profiles add column if not exists is_blocked boolean not null default false;
alter table public.profiles add column if not exists block_reason text;

-- Freemail-Anbieter: viele echte Einzelnutzer, dürfen nicht unter die
-- Domain-Obergrenze fallen.
insert into public.signup_domain_policy (domain, kind, note) values
    ('gmail.com','public',null), ('googlemail.com','public',null),
    ('web.de','public',null), ('gmx.de','public',null), ('gmx.net','public',null),
    ('outlook.de','public',null), ('outlook.com','public',null),
    ('hotmail.com','public',null), ('hotmail.de','public',null),
    ('yahoo.com','public',null), ('yahoo.de','public',null),
    ('t-online.de','public',null), ('icloud.com','public',null),
    ('me.com','public',null), ('aol.com','public',null),
    ('proton.me','public',null), ('protonmail.com','public',null),
    ('mail.de','public',null), ('freenet.de','public',null), ('posteo.de','public',null)
on conflict (domain) do nothing;

insert into public.signup_domain_policy (domain, kind, note) values
    ('mylossless.com','blocked','46 Konten, 0 Umsatz, weiterhin aktiv'),
    ('ghtkhali.us','blocked','13 Konten, 0 Umsatz'),
    ('ontogeder.com','blocked','9 Konten an einem Tag'),
    ('ghathsus.us','blocked','8 Konten, 0 Umsatz'),
    ('cceduca.us','blocked','7 Konten an einem Tag'),
    ('ghatk.us','blocked','6 Konten, 0 Umsatz'),
    ('colmbs.us','blocked','6 Konten, 0 Umsatz'),
    ('alazharhs.org','blocked','6 Konten, 0 Umsatz'),
    ('colschs.us','blocked','2 Konten, 0 Umsatz'),
    ('columbs.us','blocked','2 Konten, 0 Umsatz'),
    ('khalhs.us','blocked','Wegwerf-Domain'),
    ('aazhs.org','blocked','Wegwerf-Domain'),
    ('ceduca.us','blocked','Wegwerf-Domain'),
    ('gkali.us','blocked','Wegwerf-Domain'),
    ('ghated.us','blocked','Wegwerf-Domain')
on conflict (domain) do update set kind = excluded.kind, note = excluded.note;

-- Eine Blockliste hinkt neuen Farmen immer hinterher. Die Obergrenze pro
-- unbekannter Firmendomain greift auch bei der nächsten, noch unbekannten.
create or replace function public.signup_bonus_for_email(p_email text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
    v_domain text := lower(split_part(coalesce(p_email,''), '@', 2));
    v_kind   text;
    v_count  int;
    v_paid   numeric;
    c_bonus      constant numeric := 2.0;
    c_domain_cap constant int     := 5;
begin
    if v_domain = '' then return 0; end if;

    select kind into v_kind from signup_domain_policy where domain = v_domain;

    if v_kind = 'blocked' then return 0; end if;
    if v_kind in ('public','trusted') then return c_bonus; end if;

    -- Unbekannte Firmendomain: Hat dort schon jemand bezahlt, ist sie echt.
    select count(*), coalesce(sum(total_spent),0)
      into v_count, v_paid
      from profiles
     where lower(split_part(email,'@',2)) = v_domain;

    if v_paid > 0 then return c_bonus; end if;
    if v_count >= c_domain_cap then return 0; end if;
    return c_bonus;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_bonus   numeric := public.signup_bonus_for_email(new.email);
    v_blocked boolean := exists (
        select 1 from signup_domain_policy
         where domain = lower(split_part(coalesce(new.email,''),'@',2))
           and kind = 'blocked'
    );
begin
    insert into public.profiles (id, email, full_name, credits, is_blocked, block_reason)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', 'User'),
        v_bonus,
        v_blocked,
        case when v_blocked then 'Domain gesperrt'
             when v_bonus = 0 then 'Domain-Obergrenze für Gratisguthaben erreicht'
        end
    )
    on conflict (id) do update set email = excluded.email;
    return new;
end;
$$;

-- is_blocked/block_reason gehören zu den geschützten Feldern: sonst könnte ein
-- gesperrtes Konto sich per PostgREST selbst entsperren, weil die RLS-Regel das
-- Bearbeiten des eigenen Profils erlaubt.
create or replace function public.protect_sensitive_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
BEGIN
  IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
    NEW.credits := OLD.credits;
    NEW.role := OLD.role;
    NEW.total_spent := OLD.total_spent;
    NEW.is_blocked := OLD.is_blocked;
    NEW.block_reason := OLD.block_reason;
  END IF;
  RETURN NEW;
END;
$$;

-- Bestandsbereinigung: gesperrte Domains ohne Umsatz stilllegen.
update public.profiles p
set is_blocked = true,
    block_reason = 'Wegwerf-Domain, 0 € Umsatz',
    credits = 0
from public.signup_domain_policy d
where d.kind = 'blocked'
  and lower(split_part(p.email,'@',2)) = d.domain
  and coalesce(p.total_spent,0) = 0;

-- Frühwarnung: Die aktuelle Farm lief ~5 Monate unbemerkt. Diese Sicht macht
-- so etwas in Tagen sichtbar.
create or replace view public.suspicious_signup_domains as
select
    lower(split_part(p.email,'@',2))                       as domain,
    count(*)                                               as konten,
    count(*) filter (where p.created_at > now() - interval '7 days') as konten_7t,
    min(p.created_at)::date                                as erstes_konto,
    max(p.created_at)::date                                as letztes_konto,
    coalesce(sum(p.total_spent),0)::numeric(10,2)          as umsatz,
    bool_or(p.is_blocked)                                  as bereits_gesperrt,
    coalesce(d.kind,'unbekannt')                           as einstufung
from public.profiles p
left join public.signup_domain_policy d
       on d.domain = lower(split_part(p.email,'@',2))
group by 1, d.kind
having coalesce(d.kind,'') not in ('public','trusted')
   and coalesce(sum(p.total_spent),0) = 0
   and count(*) >= 3
order by konten_7t desc, konten desc;

revoke all on public.suspicious_signup_domains from anon, authenticated;
