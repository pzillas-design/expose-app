-- Nano Banana Pro in der Provider-Statistik ausweisen.
-- Zuvor kannte das CASE nur fal-nb2 und openai, alles andere landete in "other" —
-- NB-Pro-Jobs tauchten dadurch in der Admin-Auswertung nicht auf.
-- Die Definition wird in place gepatcht, damit der Rest der Funktion unberührt bleibt.
DO $$
DECLARE def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_stats_totals';

  IF def IS NULL THEN RAISE EXCEPTION 'admin_stats_totals nicht gefunden'; END IF;
  IF position('nano-banana-pro' in def) > 0 THEN RETURN; END IF;

  def := replace(
    def,
    'when provider = ''openai'' then ''gpt2''',
    'when provider = ''nano-banana-pro'' then ''nbpro''
             when provider = ''openai'' then ''gpt2'''
  );

  IF position('nano-banana-pro' in def) = 0 THEN
    RAISE EXCEPTION 'CASE-Zweig nicht gefunden — Funktion unveraendert gelassen';
  END IF;

  EXECUTE def;
END $$;
