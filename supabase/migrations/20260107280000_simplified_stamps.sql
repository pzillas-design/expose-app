-- Migration: Simplified Global Stamps
-- Clear existing stamps and re-seed only with the basic set

-- 1. Clear existing items
DELETE FROM public.global_objects_items;

-- 2. Insert only the 12 Basic Stamps
-- IDs are kept descriptive but compatible with the 'basics' category
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
    icon = EXCLUDED.icon;

-- 3. Ensure category 'basics' is named correctly
UPDATE public.global_objects_categories SET label_de = 'Basics', label_en = 'Basics' WHERE id = 'basics';
