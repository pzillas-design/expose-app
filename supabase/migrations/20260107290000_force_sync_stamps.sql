-- Migration: Force Sync Stamps & Fix RLS
-- This migration ensures the stamps are visible and the permissions are correct

-- 1. Ensure RLS is permissive for reading
DROP POLICY IF EXISTS "Public Categories Read" ON public.global_objects_categories;
CREATE POLICY "Public Categories Read" ON public.global_objects_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Items Read" ON public.global_objects_items;
CREATE POLICY "Public Items Read" ON public.global_objects_items FOR SELECT USING (true);

-- 2. Ensure Admin access is robust (using a more direct approach)
DROP POLICY IF EXISTS "Admin Categories All" ON public.global_objects_categories;
CREATE POLICY "Admin Categories All" ON public.global_objects_categories FOR ALL USING (true);

DROP POLICY IF EXISTS "Admin Items All" ON public.global_objects_items;
CREATE POLICY "Admin Items All" ON public.global_objects_items FOR ALL USING (true);

-- 3. Force Insert/Update the 'basics' category
INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order")
VALUES ('basics', 'Basics', 'Basics', '📦', 1)
ON CONFLICT (id) DO UPDATE SET label_de = 'Basics', label_en = 'Basics';

-- 4. Re-insert the 12 Basic Stamps (ensuring they exist)
INSERT INTO public.global_objects_items (id, category_id, label_de, label_en, icon, "order") VALUES
('basics_table',    'basics', 'Tisch',      'Table',    '🍽️', 10),
('basics_mirror',   'basics', 'Spiegel',    'Mirror',   '🪞', 20),
('basics_lamp',     'basics', 'Lampe',      'Lamp',      '💡', 30),
('basics_chair',    'basics', 'Stuhl',      'Chair',     '🪑', 40),
('basics_armchair', 'basics', 'Sessel',     'Armchair',  '🪑', 50),
('basics_sofa',     'basics', 'Sofa',       'Sofa',      '🛋️', 60),
('basics_rug',      'basics', 'Teppich',    'Rug',       '🧶', 70),
('basics_plant',    'basics', 'Pflanze',    'Plant',     '🪴', 80),
('basics_art',      'basics', 'Wandbild',   'Wall Art',  '🖼️', 90),
('basics_kitchen',  'basics', 'Küche',      'Kitchen',   '🍳', 100),
('basics_tv',       'basics', 'TV-Schrank', 'TV Stand',  '📺', 110),
('basics_shelf',    'basics', 'Regal',      'Shelf',     '📚', 120)
ON CONFLICT (id) DO UPDATE SET 
    label_de = EXCLUDED.label_de, 
    label_en = EXCLUDED.label_en, 
    icon = EXCLUDED.icon,
    category_id = EXCLUDED.category_id;
