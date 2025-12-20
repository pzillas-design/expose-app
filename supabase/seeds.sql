-- DROP TABLES TO ENSURE CLEAN STATE
DROP TABLE IF EXISTS public.global_objects_items CASCADE;
DROP TABLE IF EXISTS public.global_objects_categories CASCADE;
DROP TABLE IF EXISTS public.global_presets CASCADE;

-- Create global_presets table (Using TEXT for ID to support string IDs like 'sys-staging-pro')
CREATE TABLE public.global_presets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    is_pinned BOOLEAN DEFAULT false,
    is_custom BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    lang TEXT DEFAULT 'de',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used TIMESTAMPTZ,
    controls JSONB
);

-- Enable RLS
ALTER TABLE public.global_presets ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public Presets Read" ON public.global_presets
    FOR SELECT TO public
    USING (true);

-- Allow authenticated users to insert/update
CREATE POLICY "Admin Presets All" ON public.global_presets
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);


-- Create global_objects_categories table (Using TEXT for ID to match client-side logic)
CREATE TABLE public.global_objects_categories (
    id TEXT PRIMARY KEY,
    label_de TEXT NOT NULL,
    label_en TEXT NOT NULL,
    icon TEXT,
    "order" INTEGER DEFAULT 0,
    is_user_created BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.global_objects_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Categories Read" ON public.global_objects_categories
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Admin Categories All" ON public.global_objects_categories
    FOR ALL TO authenticated
    USING (true);


-- Create global_objects_items table (Using TEXT for ID)
CREATE TABLE public.global_objects_items (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES public.global_objects_categories(id) ON DELETE CASCADE,
    label_de TEXT NOT NULL,
    label_en TEXT NOT NULL,
    icon TEXT,
    "order" INTEGER DEFAULT 0,
    is_user_created BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.global_objects_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Items Read" ON public.global_objects_items
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Admin Items All" ON public.global_objects_items
    FOR ALL TO authenticated
    USING (true);


-- SEED DATA --

-- 1. Presets
INSERT INTO public.global_presets (id, title, prompt, tags, is_pinned, is_custom, usage_count, lang, last_used, controls) VALUES
('sys-staging-pro', 'Staging', 'Richte den Raum in einem einheitlichen Designstil ein. Behalte bestehende Strukturelemente bei.', ARRAY['Innen', 'Staging'], true, false, 150, 'de', NOW(), '[{"id":"c-room","label":"Raum","options":[{"id":"opt-living","label":"Wohn-/Essbereich","value":"Wohn- und Essbereich"}]},{"id":"c-style","label":"Stil","options":[{"id":"opt-modern","label":"Modern","value":"moderner Einrichtungsstil"}]}]'::jsonb),
('sys-season', 'Jahreszeit', 'Ändere den Look des Bildes, indem du Jahreszeit und Uhrzeit anpasst.', ARRAY['Außen', 'Mood'], true, false, 60, 'de', NOW(), '[{"id":"c-season","label":"Saison","options":[{"id":"op-summer","label":"Hochsommer","value":"Hochsommer"}]}]'::jsonb),
('sys-clear-room', 'Zimmer leer räumen', 'Räume das Zimmer leer:', ARRAY['Innen', 'Retusche'], true, false, 50, 'de', NOW(), '[{"id":"c-level","label":"Modus","options":[{"id":"opt-clutter","label":"Unordnung beseitigen","value":"entferne nur Unordnung"}]}]'::jsonb),
('sys-1', 'Blauer Himmel', 'Mache den Himmel klar blau und sonnig', ARRAY['Außen', 'Mood'], true, false, 100, 'de', NOW(), null),
('sys-2', 'Aufräumen', 'Entferne alle Unordnung, Müll und losen Gegenstände aus der Szene', ARRAY['Innen', 'Außen', 'Retusche'], false, false, 80, 'de', NOW(), null),
('sys-3', 'Sommer-Look', 'Ändere die Jahreszeit auf Sommer, grünes Gras, helle Beleuchtung', ARRAY['Außen', 'Mood', 'Staging'], false, false, 50, 'de', NOW(), null),
('sys-4', 'Mehr Tageslicht', 'Erhelle den Raum mit natürlichem Tageslicht, das durch die Fenster strömt', ARRAY['Innen', 'Mood'], true, false, 60, 'de', NOW(), null),
('sys-5', 'Modern Staging', 'Richte den Raum mit modernen, minimalistischen Möbeln ein', ARRAY['Innen', 'Staging'], false, false, 40, 'de', NOW(), null),
('sys-6', 'Leerräumen', 'Leere den Raum komplett, entferne alle Möbel, Dekorationen und Gegenstände.', ARRAY['Innen', 'Retusche'], false, false, 30, 'de', NOW(), null),
('sys-7', 'Staging Wohnzimmer', 'Virtuelles Staging: Richte diesen leeren Raum als modernes, einladendes Wohnzimmer mit Sofa, Teppich, Couchtisch und Pflanzen ein.', ARRAY['Innen', 'Staging'], false, false, 25, 'de', NOW(), null),
('sys-8', 'Staging Schlafzimmer', 'Virtuelles Staging: Richte diesen leeren Raum als gemütliches Schlafzimmer mit Doppelbett, weicher Bettwäsche, Nachttischen und warmer Beleuchtung ein.', ARRAY['Innen', 'Staging'], false, false, 25, 'de', NOW(), null),
('sys-9', 'Persönliche Gegenstände', 'Entferne persönliche Gegenstände, Familienfotos, Kleidung und Unordnung, um den Raum neutral wirken zu lassen.', ARRAY['Innen', 'Retusche'], false, false, 20, 'de', NOW(), null),
('sys-10', 'Fotos blurren', 'Verpixle alle persönlichen Fotos und Gesichter, die im Bild sichtbar sind, zum Schutz der Privatsphäre.', ARRAY['Innen', 'Retusche'], false, false, 15, 'de', NOW(), null),
('sys-11', 'Golden Hour', 'Wende einen warmen Golden-Hour-Lichteffekt auf die Szene an.', ARRAY['Außen', 'Mood'], false, false, 35, 'de', NOW(), null)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, prompt = EXCLUDED.prompt, tags = EXCLUDED.tags;

INSERT INTO public.global_presets (id, title, prompt, tags, is_pinned, is_custom, usage_count, lang, last_used, controls) VALUES
('sys-staging-pro-en', 'Staging', 'Furnish the room with a cohesive design style. Keep existing structural elements.', ARRAY['Interior', 'Staging'], true, false, 150, 'en', NOW(), '[{"id":"c-room","label":"Room","options":[{"id":"opt-living","label":"Living/Dining","value":"living and dining room area"}]},{"id":"c-style","label":"Style","options":[{"id":"opt-modern","label":"Modern","value":"modern interior design style"}]}]'::jsonb),
('sys-season-en', 'Seasons', 'Change the look of the image by adjusting season and time of day.', ARRAY['Exterior', 'Mood'], true, false, 60, 'en', NOW(), '[{"id":"c-season","label":"Season","options":[{"id":"op-summer","label":"Midsummer","value":"midsummer"}]}]'::jsonb),
('sys-clear-room-en', 'Clear Room', 'Clear the room based on the desired level.', ARRAY['Interior', 'Retouch'], true, false, 50, 'en', NOW(), '[{"id":"c-level","label":"Mode","options":[{"id":"opt-clutter","label":"Clutter only","value":"remove only clutter"}]}]'::jsonb),
('sys-1-en', 'Blue Sky', 'Make the sky clear blue and sunny', ARRAY['Exterior', 'Mood'], true, false, 100, 'en', NOW(), null),
('sys-2-en', 'Declutter', 'Remove all clutter, trash, and loose items from the scene', ARRAY['Interior', 'Exterior', 'Retouch'], false, false, 80, 'en', NOW(), null),
('sys-3-en', 'Summer Look', 'Change the season to summer, green grass, bright lighting', ARRAY['Exterior', 'Mood', 'Staging'], false, false, 50, 'en', NOW(), null),
('sys-4-en', 'More Daylight', 'Brighten the room with natural daylight streaming through windows', ARRAY['Interior', 'Mood'], true, false, 60, 'en', NOW(), null),
('sys-5-en', 'Modern Staging', 'Stage the room with modern, minimalist furniture', ARRAY['Interior', 'Staging'], false, false, 40, 'en', NOW(), null),
('sys-6-en', 'Empty Room', 'Empty the room completely, remove all furniture, decorations and items. Make it an empty room.', ARRAY['Interior', 'Retouch'], false, false, 30, 'en', NOW(), null),
('sys-7-en', 'Staging Living Room', 'Virtual staging: Furnish this empty space as a modern, inviting living room with a sofa, rug, coffee table and plants.', ARRAY['Interior', 'Staging'], false, false, 25, 'en', NOW(), null),
('sys-8-en', 'Staging Bedroom', 'Virtual staging: Furnish this empty space as a cozy bedroom with a double bed, soft bedding, nightstands and warm lighting.', ARRAY['Interior', 'Staging'], false, false, 25, 'en', NOW(), null),
('sys-9-en', 'Remove Personal Items', 'Remove personal items, family photos, clothes, and clutter to make the room look neutral.', ARRAY['Interior', 'Retouch'], false, false, 20, 'en', NOW(), null),
('sys-10-en', 'Blur Photos', 'Blur all personal photos and faces visible in the image for privacy.', ARRAY['Interior', 'Retouch'], false, false, 15, 'en', NOW(), null),
('sys-11-en', 'Golden Hour', 'Apply a warm, golden hour lighting effect to the scene, creating a welcoming atmosphere.', ARRAY['Exterior', 'Mood'], false, false, 35, 'en', NOW(), null)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, prompt = EXCLUDED.prompt, tags = EXCLUDED.tags;

-- 2. Object Categories & Items (Using manual SQL insert to avoid DO block variable issues and ensure TEXT ids)
-- BASICS
INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('basics', 'Basis', 'Basics', '📦', 10) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;
INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
('basics', 'basics_table', 'Tisch', 'Table', '🍽️'),
('basics', 'basics_mirror', 'Spiegel', 'Mirror', '🪞'),
('basics', 'basics_lamp', 'Lampe', 'Lamp', '💡'),
('basics', 'basics_chair', 'Stuhl', 'Chair', '🪑'),
('basics', 'basics_armchair', 'Sessel', 'Armchair', '🪑'),
('basics', 'basics_sofa', 'Sofa', 'Sofa', '🛋️'),
('basics', 'basics_rug', 'Teppich', 'Rug', '🧶'),
('basics', 'basics_plant', 'Pflanze', 'Plant', '🪴'),
('basics', 'basics_art', 'Wandbild', 'Wall Art', '🖼️'),
('basics', 'basics_kitchen', 'Küche', 'Kitchen', '🍳'),
('basics', 'basics_tv', 'TV-Schrank', 'TV Stand', '📺'),
('basics', 'basics_shelf', 'Regal', 'Shelf', '📚')
ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

-- LIVING ROOM
INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('living_room', 'Wohnen', 'Living', '🛋️', 20) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;
INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
('living_room', 'living_landscape', 'Wohnlandschaft', 'Living Landscape', '🛋️'),
('living_room', 'sofa_2seater', '2-Sitzer Sofa', '2-Seater Sofa', '🛋️'),
('living_room', 'sitting_area', 'Sitzgruppe', 'Sitting Group', '🛋️'),
('living_room', 'armchair', 'Sessel', 'Armchair', '🪑'),
('living_room', 'coffee_table_set', 'Couchtisch-Set', 'Coffee Table Set', '🪵'),
('living_room', 'media_wall', 'Medienwand', 'Media Wall', '📺'),
('living_room', 'sideboard', 'Sideboard', 'Sideboard', '🗄️'),
('living_room', 'bookshelf', 'Bücherregal', 'Bookshelf', '📚'),
('living_room', 'reading_nook', 'Leseecke', 'Reading Nook', '📖'),
('living_room', 'fireplace', 'Kaminbereich', 'Fireplace Area', '🔥')
ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

-- DINING & KITCHEN
INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('dining_kitchen', 'Essen & Küche', 'Dining & Kitchen', '🍽️', 30) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;
INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
('dining_kitchen', 'dining_area_large', 'Essbereich Groß', 'Dining Area Large', '🍽️'),
('dining_kitchen', 'dining_round', 'Esstisch Rund', 'Round Dining Table', '🍽️'),
('dining_kitchen', 'kitchen_island_set', 'Kücheninsel-Set', 'Kitchen Island Set', '🔪'),
('dining_kitchen', 'kitchenette', 'Küchenzeile', 'Kitchenette', '🍳'),
('dining_kitchen', 'dining_chair', 'Stuhl', 'Chair', '🪑'),
('dining_kitchen', 'dining_nook', 'Frühstücksecke', 'Breakfast Nook', '☕'),
('dining_kitchen', 'bar_setup', 'Bar-Bereich', 'Bar Area', '🍸'),
('dining_kitchen', 'pantry_shelf', 'Vorratsregal', 'Pantry Shelf', '🥫')
ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

-- BEDROOM
INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('bedroom', 'Schlafen', 'Bedroom', '🛏️', 40) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;
INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
('bedroom', 'bed_set_master', 'Doppelbett-Set', 'Double Bed Set', '🛏️'),
('bedroom', 'single_bed_set', 'Einzelbett-Set', 'Single Bed Set', '🛏️'),
('bedroom', 'wardrobe_system', 'Kleiderschrank', 'Wardrobe', '🚪'),
('bedroom', 'nightstand', 'Nachttisch', 'Nightstand', '🌙'),
('bedroom', 'dresser', 'Kommode', 'Dresser', '🗄️'),
('bedroom', 'vanity_area', 'Schminktisch', 'Vanity Table', '🪞'),
('bedroom', 'bench_end', 'Bettbank', 'Bed Bench', '🪑')
ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

-- BATHROOM
INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('bathroom', 'Bad', 'Bathroom', '🛁', 50) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;
INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
('bathroom', 'bathroom_vanity', 'Waschtisch', 'Vanity', '🚰'),
('bathroom', 'freestanding_tub', 'Freistehende Wanne', 'Freestanding Tub', '🛁'),
('bathroom', 'shower_cabin', 'Duschkabine', 'Shower Cabin', '🚿'),
('bathroom', 'toilet_wall', 'WC-Anlage', 'Toilet', '🚽'),
('bathroom', 'towel_rack', 'Handtuchhalter', 'Towel Rack', '🧖'),
('bathroom', 'mirror_cabinet', 'Spiegelschrank', 'Mirror Cabinet', '🪞')
ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

-- WORK OFFICE
INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('work_office', 'Arbeiten', 'Work', '💻', 60) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;
INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
('work_office', 'home_office_full', 'Büro Komplett', 'Full Home Office', '💻'),
('work_office', 'desk_setup', 'Schreibtisch', 'Desk Setup', '🖥️'),
('work_office', 'office_chair', 'Bürostuhl', 'Office Chair', '🪑'),
('work_office', 'meeting_corner', 'Besprechungsecke', 'Meeting Corner', '🤝'),
('work_office', 'shelving_wall', 'Aktenregal', 'Shelving Wall', '📚')
ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

-- LIGHTING
INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('lighting', 'Lampen', 'Lighting', '💡', 70) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;
INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
('lighting', 'ceiling_lamp_group', 'Deckenleuchte', 'Ceiling Light', '💡'),
('lighting', 'chandelier', 'Kronleuchter', 'Chandelier', '💎'),
('lighting', 'lighting_floor', 'Stehlampe', 'Floor Lamp', '🛋️'),
('lighting', 'table_lamp', 'Tischlampe', 'Table Lamp', '🏮'),
('lighting', 'wall_sconce', 'Wandleuchte', 'Wall Sconce', '💡'),
('lighting', 'pendant_lights', 'Pendelleuchten', 'Pendant Lights', '💡')
ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

-- PLANTS
INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('plants', 'Pflanzen', 'Plants', '🪴', 80) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;
INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
('plants', 'plant_large', 'Große Zimmerpflanze', 'Large Plant', '🪴'),
('plants', 'plant_group', 'Pflanzengruppe', 'Plant Group', '🌿'),
('plants', 'hanging_plant', 'Hängepflanze', 'Hanging Plant', '🍃'),
('plants', 'flower_vase', 'Blumenstrauß', 'Flower Vase', '💐'),
('plants', 'succulent_mix', 'Sukkulenten', 'Succulents', '🌵'),
('plants', 'olive_tree', 'Olivenbaum', 'Olive Tree', '🌳')
ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

-- DECO
INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('decoration', 'Deko', 'Decor', '🖼️', 90) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;
INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
('decoration', 'rug_large', 'Teppich Groß', 'Large Rug', '🧶'),
('decoration', 'wall_art_set', 'Wandbilder', 'Wall Art', '🖼️'),
('decoration', 'mirror_round', 'Wandspiegel Rund', 'Round Mirror', '🪞'),
('decoration', 'curtains', 'Vorhänge', 'Curtains', '🪟'),
('decoration', 'pillows_throw', 'Kissen & Decke', 'Pillows & Throw', '🛋️'),
('decoration', 'books_decor', 'Deko-Bücher', 'Coffee Table Books', '📚'),
('decoration', 'sculpture', 'Skulptur', 'Sculpture', '🗿')
ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

-- OUTDOOR
INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('outdoor', 'Außenbereich', 'Outdoor', '☀️', 100) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;
INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
('outdoor', 'lounge_outdoor', 'Lounge-Ecke', 'Lounge Area', '☀️'),
('outdoor', 'dining_outdoor', 'Gartentisch-Set', 'Dining Set', '🍽️'),
('outdoor', 'sun_loungers', 'Sonnenliegen', 'Sun Loungers', '🏖️'),
('outdoor', 'parasol', 'Gartenschirm', 'Parasol', '☂️'),
('outdoor', 'bbq_area', 'Grillbereich', 'BBQ Area', '🔥'),
('outdoor', 'firepit', 'Feuerschale', 'Firepit', '🔥'),
('outdoor', 'planters_outdoor', 'Pflanzkübel', 'Planters', '🪴')
ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;
