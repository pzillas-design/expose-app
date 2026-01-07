-- Clean up old simple season presets
DELETE FROM public.global_presets WHERE id IN ('sys-season', 'sys-season-en');

-- Insert the advanced Season & Time preset (German)
INSERT INTO public.global_presets (id, title, label, prompt, lang, is_pinned, is_custom, controls, user_id, usage_count)
VALUES (
  'sys-season-advanced',
  'Saison & Uhrzeit',
  'Saison & Uhrzeit',
  'Inszeniere das Bild neu in der Jahreszeit {{SAISON}}, zur Uhrzeit {{UHRZEIT}} mit einer {{MOOD}}en Stimmung.',
  'de',
  true,
  false,
  '[{"id":"c-season","label":"SAISON","options":[{"id":"opt-summer","label":"Sommer","value":"Sommer"},{"id":"opt-autumn","label":"Herbst","value":"Herbst"},{"id":"opt-winter","label":"Winter","value":"Winter"},{"id":"opt-spring","label":"Frühling","value":"Frühling"}]},{"id":"c-time","label":"UHRZEIT","options":[{"id":"opt-noon","label":"Mittag","value":"Mittag"},{"id":"opt-afternoon","label":"Nachmittag","value":"Nachmittag"},{"id":"opt-golden","label":"Golden Hour","value":"Golden Hour"},{"id":"opt-blue","label":"Blue Hour","value":"Blue Hour"},{"id":"opt-night","label":"Nacht","value":"Nacht"}]},{"id":"c-mood","label":"MOOD","options":[{"id":"opt-realistic","label":"realistisch","value":"realistisch"},{"id":"opt-atmos","label":"atmosphärisch","value":"atmosphärisch"}]}]'::jsonb,
  NULL,
  0
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  label = EXCLUDED.label,
  prompt = EXCLUDED.prompt,
  controls = EXCLUDED.controls;

-- Insert the advanced Season & Time preset (English)
INSERT INTO public.global_presets (id, title, label, prompt, lang, is_pinned, is_custom, controls, user_id, usage_count)
VALUES (
  'sys-season-advanced-en',
  'Season & Time',
  'Season & Time',
  'Re-imagine the image in the {{SEASON}} season, during {{TIME}}, with a {{MOOD}} atmosphere.',
  'en',
  true,
  false,
  '[{"id":"c-season","label":"SEASON","options":[{"id":"opt-summer","label":"Summer","value":"Summer"},{"id":"opt-autumn","label":"Autumn","value":"Autumn"},{"id":"opt-winter","label":"Winter","value":"Winter"},{"id":"opt-spring","label":"Spring","value":"Spring"}]},{"id":"c-time","label":"TIME","options":[{"id":"opt-noon","label":"Noon","value":"Noon"},{"id":"opt-afternoon","label":"Afternoon","value":"Afternoon"},{"id":"opt-golden","label":"Golden Hour","value":"Golden Hour"},{"id":"opt-blue","label":"Blue Hour","value":"Blue Hour"},{"id":"opt-night","label":"Night","value":"Night"}]},{"id":"c-mood","label":"MOOD","options":[{"id":"opt-realistic","label":"realistic","value":"realistic"},{"id":"opt-atmos","label":"atmospheric","value":"atmospheric"}]}]'::jsonb,
  NULL,
  0
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  label = EXCLUDED.label,
  prompt = EXCLUDED.prompt,
  controls = EXCLUDED.controls;
