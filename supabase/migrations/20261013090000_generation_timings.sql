-- Zeitmessung je Abschnitt einer Generierung.
--
-- duration_ms sagt nur, dass ein Auftrag rund 30 Sekunden gebraucht hat. Das
-- Modell selbst braucht laut fremden Messungen etwa 16 — die Differenz liegt
-- irgendwo in unserer Kette, und ohne Zwischenzeiten ist nicht zu sagen, wo.
-- Vermutungen gab es genug; gemessen wurde nie.
--
-- Inhalt: Millisekunden seit dem Absenden, je Abschnitt. Ein Wert fehlt, wenn
-- der Abschnitt nicht durchlaufen wurde (z. B. abgebrochen). Bewusst jsonb und
-- nicht je eine Spalte: Die Abschnitte werden sich ändern, sobald wir wissen,
-- wo die Zeit steckt, und dafür soll niemand eine Migration schreiben müssen.
alter table public.generation_jobs
    add column if not exists timings jsonb;

comment on column public.generation_jobs.timings is
    'Zwischenzeiten in ms seit Absenden: auth, prep, urls, submitted, webhook, img, ver, stored, done. Dazu url_count.';
