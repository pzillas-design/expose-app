-- api_cost (Einkaufspreis) existierte als Spalte, wurde aber nie befüllt —
-- messbar war dadurch nur der Verkaufspreis, nicht die Marge.
--
-- Rückwirkende Befüllung, bewusst konservativ: Die Verkaufspreise haben sich
-- historisch geändert (NB2 lief früher auf 0,05/0,10/0,20/0,40). Ein Rückschluss
-- vom Preis auf den Tarif ist deshalb nur dort eindeutig, wo der Preis exakt
-- einem AKTUELLEN Tarif entspricht. Alles andere bleibt NULL statt geraten —
-- eine falsche Zahl wäre schlimmer als eine fehlende.

create or replace function public.api_cost_for(p_model text, p_cost numeric)
returns numeric
language sql
immutable
as $$
    select case
        when p_cost is null then null
        when p_model like 'nano-banana-2%' then case p_cost
            when 0.15 then 0.06 when 0.18 then 0.08
            when 0.50 then 0.12 when 0.65 then 0.16 end
        when p_model like 'nano-banana-pro%' then case p_cost
            when 0.60 then 0.15 when 1.20 then 0.30 end
        when p_model like 'gpt-image%' then case p_cost
            when 0.05 then 0.0125 when 0.10 then 0.025
            when 0.20 then 0.05   when 0.30 then 0.075
            when 0.50 then 0.125  when 0.85 then 0.21
            when 1.00 then 0.25   when 1.60 then 0.40 end
        -- gemini-3.1-flash-image-preview lief über den alten Direktzugang mit
        -- anderer Tarifstruktur; nicht rekonstruierbar.
        else null
    end;
$$;

-- api_cost hatte den Spalten-Vorgabewert 0 und war deshalb nie NULL. Ohne das
-- Entfernen des Defaults liefe jeder Backfill über "is null" ins Leere, und
-- NULL könnte nicht "nicht rekonstruierbar" bedeuten.
alter table public.generation_jobs alter column api_cost drop default;
alter table public.job_archive     alter column api_cost drop default;

update public.generation_jobs
set api_cost = case when status = 'failed' then 0 else public.api_cost_for(model, cost) end
where api_cost = 0;

update public.job_archive
set api_cost = case when status = 'failed' then 0 else public.api_cost_for(model, cost) end
where api_cost = 0;
