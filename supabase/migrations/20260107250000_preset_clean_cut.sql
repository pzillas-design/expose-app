-- MASTER SQL: CLEAN CUT FOR PRESETS
-- This script resets all system-level presets to a clean, professional state.

-- 1. DELETE ALL SYSTEM PRESETS (where user_id is NULL)
DELETE FROM public.global_presets WHERE user_id IS NULL;

-- 2. INSERT CLEAN STANDARDIZED PRESETS

-- ==========================================
-- STAGING (DE/EN)
-- ==========================================

-- Staging (DE)
INSERT INTO public.global_presets (id, title, label, prompt, lang, is_pinned, is_custom, controls, user_id, usage_count)
VALUES (
  'sys-staging-pro',
  'Staging',
  'Staging',
  'Richte den Raum in einem einheitlichen Designstil ein. Behalte bestehende Strukturelemente bei.',
  'de',
  true,
  false,
  '[{"id":"c-room","label":"Raum","options":[{"id":"opt-living","label":"Wohn-/Essbereich","value":"Wohn- und Essbereich"},{"id":"opt-kitchen","label":"Küche","value":"Küche"},{"id":"opt-bedroom","label":"Schlafen","value":"Schlafzimmer"},{"id":"opt-kids","label":"Kinderzimmer","value":"Kinderzimmer"},{"id":"opt-bath","label":"Bad","value":"Badezimmer"},{"id":"opt-hall","label":"Flur","value":"Flur"},{"id":"opt-office","label":"Büro","value":"Home Office"},{"id":"opt-outdoor","label":"Außen","value":"Außenterrasse"}]},{"id":"c-style","label":"Stil","options":[{"id":"opt-modern","label":"Modern","value":"moderner Einrichtungsstil"},{"id":"opt-scandi","label":"Skandinavisch","value":"skandinavischer Einrichtungsstil"},{"id":"opt-minimal","label":"Minimal","value":"minimalistischer Einrichtungsstil"},{"id":"opt-timeless","label":"Zeitlos","value":"zeitloser Einrichtungsstil, klassische Eleganz"}]}]'::jsonb,
  NULL,
  0
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, prompt = EXCLUDED.prompt, controls = EXCLUDED.controls;

-- Staging (EN)
INSERT INTO public.global_presets (id, title, label, prompt, lang, is_pinned, is_custom, controls, user_id, usage_count)
VALUES (
  'sys-staging-pro-en',
  'Staging',
  'Staging',
  'Furnish the room with a cohesive design style. Keep existing structural elements.',
  'en',
  true,
  false,
  '[{"id":"c-room","label":"Room","options":[{"id":"opt-living","label":"Living/Dining","value":"living and dining room area"},{"id":"opt-kitchen","label":"Kitchen","value":"kitchen"},{"id":"opt-bedroom","label":"Bedroom","value":"bedroom"},{"id":"opt-kids","label":"Kids Room","value":"kids room"},{"id":"opt-bath","label":"Bathroom","value":"bathroom"},{"id":"opt-hall","label":"Hallway","value":"hallway"},{"id":"opt-office","label":"Home Office","value":"home office"},{"id":"opt-outdoor","label":"Outdoor/Terrace","value":"outdoor terrace"}]},{"id":"c-style","label":"Style","options":[{"id":"opt-modern","label":"Modern","value":"modern interior design style"},{"id":"opt-scandi","label":"Scandinavian","value":"scandinavian interior design style"},{"id":"opt-minimal","label":"Minimalist","value":"minimalist interior design style"},{"id":"opt-timeless","label":"Timeless","value":"timeless interior design style, classic elegance"}]}]'::jsonb,
  NULL,
  0
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, prompt = EXCLUDED.prompt, controls = EXCLUDED.controls;

-- ==========================================
-- SAISON & UHRZEIT (DE/EN)
-- ==========================================

-- Saison & Uhrzeit (DE)
INSERT INTO public.global_presets (id, title, label, prompt, lang, is_pinned, is_custom, controls, user_id, usage_count)
VALUES (
  'sys-season-advanced',
  'Saison & Uhrzeit',
  'Saison & Uhrzeit',
  'Inszeniere das Bild neu indem du die Jahreszeit anpasst.',
  'de',
  true,
  false,
  '[{"id":"c-season","label":"SAISON","options":[{"id":"opt-summer","label":"Sommer","value":"Sommer"},{"id":"opt-autumn","label":"Herbst","value":"Herbst"},{"id":"opt-winter","label":"Winter","value":"Winter"},{"id":"opt-spring","label":"Frühling","value":"Frühling"}]},{"id":"c-time","label":"UHRZEIT","options":[{"id":"opt-noon","label":"Mittag","value":"Mittag"},{"id":"opt-afternoon","label":"Nachmittag","value":"Nachmittag"},{"id":"opt-golden","label":"Golden Hour","value":"Golden Hour"},{"id":"opt-blue","label":"Blue Hour","value":"Blue Hour"},{"id":"opt-night","label":"Nacht","value":"Nacht"}]},{"id":"c-mood","label":"MOOD","options":[{"id":"opt-realistic","label":"realistisch","value":"realistisch"},{"id":"opt-atmos","label":"atmosphärisch","value":"atmosphärisch"}]}]'::jsonb,
  NULL,
  0
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, prompt = EXCLUDED.prompt, controls = EXCLUDED.controls;

-- Season & Time (EN)
INSERT INTO public.global_presets (id, title, label, prompt, lang, is_pinned, is_custom, controls, user_id, usage_count)
VALUES (
  'sys-season-advanced-en',
  'Season & Time',
  'Season & Time',
  'Re-imagine the image by adjusting the season.',
  'en',
  true,
  false,
  '[{"id":"c-season","label":"SEASON","options":[{"id":"opt-summer","label":"Summer","value":"Summer"},{"id":"opt-autumn","label":"Autumn","value":"Autumn"},{"id":"opt-winter","label":"Winter","value":"Winter"},{"id":"opt-spring","label":"Spring","value":"Spring"}]},{"id":"c-time","label":"TIME","options":[{"id":"opt-noon","label":"Noon","value":"Noon"},{"id":"opt-afternoon","label":"Afternoon","value":"Afternoon"},{"id":"opt-golden","label":"Golden Hour","value":"Golden Hour"},{"id":"opt-blue","label":"Blue Hour","value":"Blue Hour"},{"id":"opt-night","label":"Night","value":"Night"}]},{"id":"c-mood","label":"MOOD","options":[{"id":"opt-realistic","label":"realistic","value":"realistic"},{"id":"opt-atmos","label":"atmospheric","value":"atmospheric"}]}]'::jsonb,
  NULL,
  0
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, prompt = EXCLUDED.prompt, controls = EXCLUDED.controls;

-- ==========================================
-- CLEANUP (DE/EN)
-- ==========================================

-- Aufräumen (DE)
INSERT INTO public.global_presets (id, title, label, prompt, lang, is_pinned, is_custom, controls, user_id, usage_count)
VALUES (
  'sys-clear-room',
  'Aufräumen',
  'Aufräumen',
  'Entferne alle Unordnung, Müll und losen Gegenstände aus der Szene',
  'de',
  true,
  false,
  '[]'::jsonb,
  NULL,
  0
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, prompt = EXCLUDED.prompt, controls = EXCLUDED.controls;

-- Cleanup (EN)
INSERT INTO public.global_presets (id, title, label, prompt, lang, is_pinned, is_custom, controls, user_id, usage_count)
VALUES (
  'sys-clear-room-en',
  'Cleanup',
  'Cleanup',
  'Remove all clutter, trash, and loose interactive items from the scene',
  'en',
  true,
  false,
  '[]'::jsonb,
  NULL,
  0
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, prompt = EXCLUDED.prompt, controls = EXCLUDED.controls;
