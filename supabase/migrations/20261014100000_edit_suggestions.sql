-- Bildbezogene Vorschlaege ("Fuer dieses Bild").
--
-- Das Ergebnis des Vision-Aufrufs liegt am Bild, nicht in einer eigenen
-- Tabelle: Es gehoert zu genau einem Bild, hat dessen Lebensdauer und wird
-- mit ihm geloescht. Eine Nebentabelle brauechte einen Fremdschluessel, eine
-- eigene RLS-Regel und ein eigenes Aufraeumen -- fuer dieselbe Aussage.
--
-- Gestalt: { "v": 1, "lang": "de", "items": [{ "label": …, "line": … }] }
-- Das Modell wird pro Bild genau einmal gefragt; jedes weitere Oeffnen liest
-- hier.
alter table public.images
    add column if not exists edit_suggestions jsonb;
