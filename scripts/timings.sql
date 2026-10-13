-- Auswertung der Zwischenzeiten (generation_jobs.timings).
--
-- Liest die Abschnitte als Differenzen, nicht als Rohwerte: Interessant ist
-- nicht "nach 24 s kam der Rückruf", sondern wie viele Sekunden auf jeden
-- Abschnitt entfallen. Nur so ist zu sehen, welcher davon sich lohnt.
--
--   vorbereitung  Auth, Guthaben, Vorlage, Kosten        (wir)
--   bilder        Quell-/Annotations-/Referenzbilder in den Storage  (wir)
--   fal           Warteschlange + eigentliche Generierung (fal)
--   download      fertiges Bild von fals CDN holen        (wir)
--   version       Geschwister-Abfrage für die Versionsnummer (wir)
--   storage       Bild in unseren Storage legen           (wir)
--   rest          DB-Insert und Abschluss                 (wir)
select
    model,
    count(*)                                                      n,
    round(avg((timings->>'url_count')::numeric), 1)               bilder_anz,
    round(avg((timings->>'prep')::numeric)/1000, 1)               vorbereitung,
    round(avg(((timings->>'urls')::numeric - (timings->>'prep')::numeric))/1000, 1)        bilder,
    round(avg(((timings->>'webhook')::numeric - (timings->>'submitted')::numeric))/1000, 1) fal,
    round(avg(((timings->>'img')::numeric - (timings->>'webhook')::numeric))/1000, 1)      download,
    round(avg(((timings->>'ver')::numeric - (timings->>'img')::numeric))/1000, 1)          version,
    round(avg(((timings->>'stored')::numeric - (timings->>'ver')::numeric))/1000, 1)       storage,
    round(avg(((timings->>'done')::numeric - (timings->>'stored')::numeric))/1000, 1)      rest,
    round(avg(duration_ms)::numeric/1000, 1)                      gesamt
from generation_jobs
where status = 'completed'
  and timings ? 'done'
  and created_at > now() - interval '14 days'
group by model
order by n desc;
