-- DROP TABLES TO ENSURE CLEAN STATE
DROP TABLE IF EXISTS public.global_objects_items CASCADE;
DROP TABLE IF EXISTS public.global_objects_categories CASCADE;
DROP TABLE IF EXISTS public.global_presets CASCADE;

-- Create global_presets table
CREATE TABLE public.global_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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


-- Create global_objects_categories table
CREATE TABLE public.global_objects_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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


-- Create global_objects_items table
CREATE TABLE public.global_objects_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.global_objects_categories(id) ON DELETE CASCADE,
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

-- 2. Object Categories & Items
DO $$
DECLARE
    cat_basics UUID;
    cat_living UUID;
    cat_dining UUID;
    cat_bed UUID;
    cat_bath UUID;
    cat_work UUID;
    cat_lighting UUID;
    cat_plants UUID;
    cat_decor UUID;
    cat_outdoor UUID;
BEGIN
    -- BASICS
    INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('basics', 'Basis', 'Basics', '📦', 10) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de RETURNING id INTO cat_basics;
    INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
    (cat_basics, 'basics_table', 'Tisch', 'Table', '🍽️'),
    (cat_basics, 'basics_mirror', 'Spiegel', 'Mirror', '🪞'),
    (cat_basics, 'basics_lamp', 'Lampe', 'Lamp', '💡'),
    (cat_basics, 'basics_chair', 'Stuhl', 'Chair', '🪑'),
    (cat_basics, 'basics_armchair', 'Sessel', 'Armchair', '🪑'),
    (cat_basics, 'basics_sofa', 'Sofa', 'Sofa', '🛋️'),
    (cat_basics, 'basics_rug', 'Teppich', 'Rug', '🧶'),
    (cat_basics, 'basics_plant', 'Pflanze', 'Plant', '🪴'),
    (cat_basics, 'basics_art', 'Wandbild', 'Wall Art', '🖼️'),
    (cat_basics, 'basics_kitchen', 'Küche', 'Kitchen', '🍳'),
    (cat_basics, 'basics_tv', 'TV-Schrank', 'TV Stand', '📺'),
    (cat_basics, 'basics_shelf', 'Regal', 'Shelf', '📚')
    ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

    -- LIVING ROOM
    INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('living_room', 'Wohnen', 'Living', '🛋️', 20) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de RETURNING id INTO cat_living;
    INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
    (cat_living, 'living_landscape', 'Wohnlandschaft', 'Living Landscape', '🛋️'),
    (cat_living, 'sofa_2seater', '2-Sitzer Sofa', '2-Seater Sofa', '🛋️'),
    (cat_living, 'sitting_area', 'Sitzgruppe', 'Sitting Group', '🛋️'),
    (cat_living, 'armchair', 'Sessel', 'Armchair', '🪑'),
    (cat_living, 'coffee_table_set', 'Couchtisch-Set', 'Coffee Table Set', '🪵'),
    (cat_living, 'media_wall', 'Medienwand', 'Media Wall', '📺'),
    (cat_living, 'sideboard', 'Sideboard', 'Sideboard', '🗄️'),
    (cat_living, 'bookshelf', 'Bücherregal', 'Bookshelf', '📚'),
    (cat_living, 'reading_nook', 'Leseecke', 'Reading Nook', '📖'),
    (cat_living, 'fireplace', 'Kaminbereich', 'Fireplace Area', '🔥')
    ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

    -- DINING & KITCHEN
    INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('dining_kitchen', 'Essen & Küche', 'Dining & Kitchen', '🍽️', 30) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de RETURNING id INTO cat_dining;
    INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
    (cat_dining, 'dining_area_large', 'Essbereich Groß', 'Dining Area Large', '🍽️'),
    (cat_dining, 'dining_round', 'Esstisch Rund', 'Round Dining Table', '🍽️'),
    (cat_dining, 'kitchen_island_set', 'Kücheninsel-Set', 'Kitchen Island Set', '🔪'),
    (cat_dining, 'kitchenette', 'Küchenzeile', 'Kitchenette', '🍳'),
    (cat_dining, 'dining_chair', 'Stuhl', 'Chair', '🪑'),
    (cat_dining, 'dining_nook', 'Frühstücksecke', 'Breakfast Nook', '☕'),
    (cat_dining, 'bar_setup', 'Bar-Bereich', 'Bar Area', '🍸'),
    (cat_dining, 'pantry_shelf', 'Vorratsregal', 'Pantry Shelf', '🥫')
    ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

    -- BEDROOM
    INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('bedroom', 'Schlafen', 'Bedroom', '🛏️', 40) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de RETURNING id INTO cat_bed;
    INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
    (cat_bed, 'bed_set_master', 'Doppelbett-Set', 'Double Bed Set', '🛏️'),
    (cat_bed, 'single_bed_set', 'Einzelbett-Set', 'Single Bed Set', '🛏️'),
    (cat_bed, 'wardrobe_system', 'Kleiderschrank', 'Wardrobe', '🚪'),
    (cat_bed, 'nightstand', 'Nachttisch', 'Nightstand', '🌙'),
    (cat_bed, 'dresser', 'Kommode', 'Dresser', '🗄️'),
    (cat_bed, 'vanity_area', 'Schminktisch', 'Vanity Table', '🪞'),
    (cat_bed, 'bench_end', 'Bettbank', 'Bed Bench', '🪑')
    ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

    -- BATHROOM
    INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('bathroom', 'Bad', 'Bathroom', '🛁', 50) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de RETURNING id INTO cat_bath;
    INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
    (cat_bath, 'bathroom_vanity', 'Waschtisch', 'Vanity', '🚰'),
    (cat_bath, 'freestanding_tub', 'Freistehende Wanne', 'Freestanding Tub', '🛁'),
    (cat_bath, 'shower_cabin', 'Duschkabine', 'Shower Cabin', '🚿'),
    (cat_bath, 'toilet_wall', 'WC-Anlage', 'Toilet', '🚽'),
    (cat_bath, 'towel_rack', 'Handtuchhalter', 'Towel Rack', '🧖'),
    (cat_bath, 'mirror_cabinet', 'Spiegelschrank', 'Mirror Cabinet', '🪞')
    ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

    -- WORK OFFICE
    INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('work_office', 'Arbeiten', 'Work', '💻', 60) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de RETURNING id INTO cat_work;
    INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
    (cat_work, 'home_office_full', 'Büro Komplett', 'Full Home Office', '💻'),
    (cat_work, 'desk_setup', 'Schreibtisch', 'Desk Setup', '🖥️'),
    (cat_work, 'office_chair', 'Bürostuhl', 'Office Chair', '🪑'),
    (cat_work, 'meeting_corner', 'Besprechungsecke', 'Meeting Corner', '🤝'),
    (cat_work, 'shelving_wall', 'Aktenregal', 'Shelving Wall', '📚')
    ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

    -- LIGHTING
    INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('lighting', 'Lampen', 'Lighting', '💡', 70) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de RETURNING id INTO cat_lighting;
    INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
    (cat_lighting, 'ceiling_lamp_group', 'Deckenleuchte', 'Ceiling Light', '💡'),
    (cat_lighting, 'chandelier', 'Kronleuchter', 'Chandelier', '💎'),
    (cat_lighting, 'lighting_floor', 'Stehlampe', 'Floor Lamp', '🛋️'),
    (cat_lighting, 'table_lamp', 'Tischlampe', 'Table Lamp', '🏮'),
    (cat_lighting, 'wall_sconce', 'Wandleuchte', 'Wall Sconce', '💡'),
    (cat_lighting, 'pendant_lights', 'Pendelleuchten', 'Pendant Lights', '💡')
    ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

    -- PLANTS
    INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('plants', 'Pflanzen', 'Plants', '🪴', 80) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de RETURNING id INTO cat_plants;
    INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
    (cat_plants, 'plant_large', 'Große Zimmerpflanze', 'Large Plant', '🪴'),
    (cat_plants, 'plant_group', 'Pflanzengruppe', 'Plant Group', '🌿'),
    (cat_plants, 'hanging_plant', 'Hängepflanze', 'Hanging Plant', '🍃'),
    (cat_plants, 'flower_vase', 'Blumenstrauß', 'Flower Vase', '💐'),
    (cat_plants, 'succulent_mix', 'Sukkulenten', 'Succulents', '🌵'),
    (cat_plants, 'olive_tree', 'Olivenbaum', 'Olive Tree', '🌳')
    ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

    -- DECO
    INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('decoration', 'Deko', 'Decor', '🖼️', 90) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de RETURNING id INTO cat_decor;
    INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
    (cat_decor, 'rug_large', 'Teppich Groß', 'Large Rug', '🧶'),
    (cat_decor, 'wall_art_set', 'Wandbilder', 'Wall Art', '🖼️'),
    (cat_decor, 'mirror_round', 'Wandspiegel Rund', 'Round Mirror', '🪞'),
    (cat_decor, 'curtains', 'Vorhänge', 'Curtains', '🪟'),
    (cat_decor, 'pillows_throw', 'Kissen & Decke', 'Pillows & Throw', '🛋️'),
    (cat_decor, 'books_decor', 'Deko-Bücher', 'Coffee Table Books', '📚'),
    (cat_decor, 'sculpture', 'Skulptur', 'Sculpture', '🗿')
    ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

    -- OUTDOOR
    INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order") VALUES ('outdoor', 'Außenbereich', 'Outdoor', '☀️', 100) ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de RETURNING id INTO cat_outdoor;
    INSERT INTO public.global_objects_items (category_id, id, label_de, label_en, icon) VALUES
    (cat_outdoor, 'lounge_outdoor', 'Lounge-Ecke', 'Lounge Area', '☀️'),
    (cat_outdoor, 'dining_outdoor', 'Gartentisch-Set', 'Dining Set', '🍽️'),
    (cat_outdoor, 'sun_loungers', 'Sonnenliegen', 'Sun Loungers', '🏖️'),
    (cat_outdoor, 'parasol', 'Gartenschirm', 'Parasol', '☂️'),
    (cat_outdoor, 'bbq_area', 'Grillbereich', 'BBQ Area', '🔥'),
    (cat_outdoor, 'firepit', 'Feuerschale', 'Firepit', '🔥'),
    (cat_outdoor, 'planters_outdoor', 'Pflanzkübel', 'Planters', '🪴')
    ON CONFLICT (id) DO UPDATE SET label_de=EXCLUDED.label_de;

END $$;
