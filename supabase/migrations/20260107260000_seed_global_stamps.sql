-- Migration: Seed Global Stamps
-- Populate the global_objects_items table with stamp templates

-- Ensure a default 'basics' category exists
-- Fix missing icon column if it wasn't created in previous migrations
ALTER TABLE public.global_objects_categories ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📦';

-- Fix ID types: Schema defined them as UUID but seed uses TEXT.
-- We must convert them to TEXT.
DO $$ 
BEGIN
  -- Drop constraint temporarily if it exists
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'global_objects_items_category_id_fkey') THEN
    ALTER TABLE public.global_objects_items DROP CONSTRAINT global_objects_items_category_id_fkey;
  END IF;
END $$;

ALTER TABLE public.global_objects_categories ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.global_objects_items ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.global_objects_items ALTER COLUMN category_id TYPE TEXT;

-- Re-establish FK
ALTER TABLE public.global_objects_items ADD CONSTRAINT global_objects_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.global_objects_categories(id) ON DELETE CASCADE;

INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order")
VALUES ('basics', 'Basis', 'Basics', '📦', 1)
ON CONFLICT (id) DO NOTHING;

-- Insert stamps into basics category
INSERT INTO public.global_objects_items (id, category_id, label_de, label_en, icon, "order") VALUES
-- Basics
('basics_table', 'basics', 'Tisch', 'Table', '🍽️', 10),
('basics_mirror', 'basics', 'Spiegel', 'Mirror', '🪞', 20),
('basics_lamp', 'basics', 'Lampe', 'Lamp', '💡', 30),
('basics_chair', 'basics', 'Stuhl', 'Chair', '🪑', 40),
('basics_armchair', 'basics', 'Sessel', 'Armchair', '🪑', 50),
('basics_sofa', 'basics', 'Sofa', 'Sofa', '🛋️', 60),
('basics_rug', 'basics', 'Teppich', 'Rug', '🧶', 70),
('basics_plant', 'basics', 'Pflanze', 'Plant', '🪴', 80),
('basics_art', 'basics', 'Wandbild', 'Wall Art', '🖼️', 90),
('basics_kitchen', 'basics', 'Küche', 'Kitchen', '🍳', 100),
('basics_tv', 'basics', 'TV-Schrank', 'TV Stand', '📺', 110),
('basics_shelf', 'basics', 'Regal', 'Shelf', '📚', 120),
-- Living Room
('living_landscape', 'basics', 'Wohnlandschaft', 'Living Landscape', '🛋️', 130),
('sofa_2seater', 'basics', '2-Sitzer Sofa', '2-Seater Sofa', '🛋️', 140),
('sitting_area', 'basics', 'Sitzgruppe', 'Sitting Group', '🛋️', 150),
('armchair_living', 'basics', 'Sessel', 'Armchair', '🪑', 160),
('coffee_table_set', 'basics', 'Couchtisch-Set', 'Coffee Table Set', '🪵', 170),
('media_wall', 'basics', 'Medienwand', 'Media Wall', '📺', 180),
('sideboard', 'basics', 'Sideboard', 'Sideboard', '🗄️', 190),
('bookshelf', 'basics', 'Bücherregal', 'Bookshelf', '📚', 200),
('reading_nook', 'basics', 'Leseecke', 'Reading Nook', '📖', 210),
('fireplace', 'basics', 'Kaminbereich', 'Fireplace Area', '🔥', 220),
-- Dining & Kitchen
('dining_area_large', 'basics', 'Essbereich Groß', 'Dining Area Large', '🍽️', 230),
('dining_round', 'basics', 'Esstisch Rund', 'Round Dining Table', '🍽️', 240),
('kitchen_island_set', 'basics', 'Kücheninsel-Set', 'Kitchen Island Set', '🔪', 250),
('kitchenette', 'basics', 'Küchenzeile', 'Kitchenette', '🍳', 260),
('dining_chair', 'basics', 'Esstisch-Stuhl', 'Dining Chair', '🪑', 270),
('dining_nook', 'basics', 'Frühstücksecke', 'Breakfast Nook', '☕', 280),
('bar_setup', 'basics', 'Bar-Bereich', 'Bar Area', '🍸', 290),
('pantry_shelf', 'basics', 'Vorratsregal', 'Pantry Shelf', '🥫', 300),
-- Bedroom
('bed_set_master', 'basics', 'Doppelbett-Set', 'Double Bed Set', '🛏️', 310),
('single_bed_set', 'basics', 'Einzelbett-Set', 'Single Bed Set', '🛏️', 320),
('wardrobe_system', 'basics', 'Kleiderschrank', 'Wardrobe', '🚪', 330),
('nightstand', 'basics', 'Nachttisch', 'Nightstand', '🌙', 340),
('dresser', 'basics', 'Kommode', 'Dresser', '🗄️', 350),
('vanity_area', 'basics', 'Schminktisch', 'Vanity Table', '🪞', 360),
('bench_end', 'basics', 'Bettbank', 'Bed Bench', '🪑', 370),
-- Bathroom
('bathroom_vanity', 'basics', 'Waschtisch', 'Vanity', '🚰', 380),
('freestanding_tub', 'basics', 'Freistehende Wanne', 'Freestanding Tub', '🛁', 390),
('shower_cabin', 'basics', 'Duschkabine', 'Shower Cabin', '🚿', 400),
('toilet_wall', 'basics', 'WC-Anlage', 'Toilet', '🚽', 410),
('towel_rack', 'basics', 'Handtuchhalter', 'Towel Rack', '🧖', 420),
('mirror_cabinet', 'basics', 'Spiegelschrank', 'Mirror Cabinet', '🪞', 430),
-- Work Office
('home_office_full', 'basics', 'Büro Komplett', 'Full Home Office', '💻', 440),
('desk_setup', 'basics', 'Schreibtisch', 'Desk Setup', '🖥️', 450),
('office_chair', 'basics', 'Bürostuhl', 'Office Chair', '🪑', 460),
('meeting_corner', 'basics', 'Besprechungsecke', 'Meeting Corner', '🤝', 470),
('shelving_wall', 'basics', 'Aktenregal', 'Shelving Wall', '📚', 480),
-- Lighting
('ceiling_lamp_group', 'basics', 'Deckenleuchte', 'Ceiling Light', '💡', 490),
('chandelier', 'basics', 'Kronleuchter', 'Chandelier', '💎', 500),
('lighting_floor', 'basics', 'Stehlampe', 'Floor Lamp', '🛋️', 510),
('table_lamp', 'basics', 'Tischlampe', 'Table Lamp', '🏮', 520),
('wall_sconce', 'basics', 'Wandleuchte', 'Wall Sconce', '💡', 530),
('pendant_lights', 'basics', 'Pendelleuchten', 'Pendant Lights', '💡', 540),
-- Plants
('plant_large', 'basics', 'Große Zimmerpflanze', 'Large Plant', '🪴', 550),
('plant_group', 'basics', 'Pflanzengruppe', 'Plant Group', '🌿', 560),
('plant_byte', 'basics', 'Hängepflanze', 'Hanging Plant', '🍃', 570),
('flower_vase', 'basics', 'Blumenstrauß', 'Flower Vase', '💐', 580),
('succulent_mix', 'basics', 'Sukkulenten', 'Succulents', '🌵', 590),
('olive_tree', 'basics', 'Olivenbaum', 'Olive Tree', '🌳', 600),
-- Decoration
('rug_large_deco', 'basics', 'Teppich Groß', 'Large Rug', '🧶', 610),
('wall_art_set_deco', 'basics', 'Wandbilder', 'Wall Art', '🖼️', 620),
('mirror_round_deco', 'basics', 'Wandspiegel Rund', 'Round Mirror', '🪞', 630),
('curtains', 'basics', 'Vorhänge', 'Curtains', '🪟', 640),
('pillows_throw', 'basics', 'Kissen & Decke', 'Pillows & Throw', '🛋️', 650),
('books_decor', 'basics', 'Deko-Bücher', 'Coffee Table Books', '📚', 660),
('sculpture', 'basics', 'Skulptur', 'Sculpture', '🗿', 670),
-- Outdoor
('lounge_outdoor', 'basics', 'Lounge-Ecke', 'Lounge Area', '☀️', 680),
('dining_outdoor', 'basics', 'Gartentisch-Set', 'Dining Set', '🍽️', 690),
('sun_loungers', 'basics', 'Sonnenliegen', 'Sun Loungers', '🏖️', 700),
('parasol', 'basics', 'Gartenschirm', 'Parasol', '☂️', 710),
('bbq_area', 'basics', 'Grillbereich', 'BBQ Area', '🔥', 720),
('firepit', 'basics', 'Feuerschale', 'Firepit', '🔥', 730),
('planters_outdoor', 'basics', 'Pflanzkübel', 'Planters', '🪴', 740)
ON CONFLICT (id) DO UPDATE SET 
    label_de = EXCLUDED.label_de, 
    label_en = EXCLUDED.label_en, 
    icon = EXCLUDED.icon;
