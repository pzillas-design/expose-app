-- Migration: Open Access for Stamps
-- Ensure stamps are readable by EVERYONE on staging

-- 1. Reset Policies for global_objects_items
DROP POLICY IF EXISTS "Public Items Read" ON public.global_objects_items;
DROP POLICY IF EXISTS "Admin Items All" ON public.global_objects_items;

-- 2. Create ultra-permissive policies (Public Read, Public Write for now to debug)
CREATE POLICY "Stamps Public Select" ON public.global_objects_items FOR SELECT USING (true);
CREATE POLICY "Stamps Public All" ON public.global_objects_items FOR ALL USING (true) WITH CHECK (true);

-- 3. Re-seed to be 100% sure data exists
DELETE FROM public.global_objects_items WHERE id LIKE 'stamp_%';

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
