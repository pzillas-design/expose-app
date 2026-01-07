-- Migration: Revert to Known Table Name
-- PostgREST is having trouble finding 'global_stamps' in the cache.
-- We revert to the name 'global_objects_items' but keep the simplified flat structure.

-- 1. Drop the table if it exists (the one that's missing from cache)
DROP TABLE IF EXISTS public.global_stamps CASCADE;

-- 2. Drop the old objects items and categories (to be safe)
DROP TABLE IF EXISTS public.global_objects_items CASCADE;
DROP TABLE IF EXISTS public.global_objects_categories CASCADE;

-- 3. Re-create 'global_objects_items' as a FLAT table (no FKs)
CREATE TABLE public.global_objects_items (
    id TEXT PRIMARY KEY,
    label_de TEXT NOT NULL,
    label_en TEXT NOT NULL,
    icon TEXT DEFAULT '📦',
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.global_objects_items ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Public Items Read" ON public.global_objects_items FOR SELECT USING (true);
CREATE POLICY "Admin Items All" ON public.global_objects_items FOR ALL USING (true);

-- 6. Seed the 12 Stamps
INSERT INTO public.global_objects_items (id, label_de, label_en, icon, "order") VALUES
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
