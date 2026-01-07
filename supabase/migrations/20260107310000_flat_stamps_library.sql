-- Migration: Flat Stamps Library
-- Removes categories completely and uses a dedicated stamps table

-- 1. Drop old tables and dependencies
DROP TABLE IF EXISTS public.global_objects_items CASCADE;
DROP TABLE IF EXISTS public.global_objects_categories CASCADE;

-- 2. Create simplified flat stamps table
CREATE TABLE public.global_stamps (
    id TEXT PRIMARY KEY,
    label_de TEXT NOT NULL,
    label_en TEXT NOT NULL,
    icon TEXT DEFAULT '📦',
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.global_stamps ENABLE ROW LEVEL SECURITY;

-- 4. Simple Policies (Allow everyone to read, authenticated to manage)
CREATE POLICY "Public Stamps Read" ON public.global_stamps FOR SELECT USING (true);
CREATE POLICY "Admin Stamps All" ON public.global_stamps FOR ALL TO authenticated USING (true);

-- 5. Seed the 12 Stamps
INSERT INTO public.global_stamps (id, label_de, label_en, icon, "order") VALUES
('stamp_table',    'Tisch',      'Table',    '🍽️', 10),
('stamp_mirror',   'Spiegel',    'Mirror',   '🪞', 20),
('stamp_lamp',     'Lampe',      'Lamp',      '💡', 30),
('stamp_chair',    'Stuhl',      'Chair',     '🪑', 40),
('stamp_armchair', 'Sessel',     'Armchair',  '🪑', 50),
('stamp_sofa',     'Sofa',       'Sofa',      '🛋️', 60),
('stamp_rug',      'Teppich',    'Rug',       '🧶', 70),
('stamp_plant',    'Pflanze',    'Plant',     '🪴', 80),
('stamp_art',      'Wandbild',   'Wall Art',  '🖼️', 90),
('stamp_kitchen',  'Küche',      'Kitchen',   '🍳', 100),
('stamp_tv',       'TV-Schrank', 'TV Stand',  '📺', 110),
('stamp_shelf',    'Regal',      'Shelf',     '📚', 120);
