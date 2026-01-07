-- Migration: Final Type Fix for Objects
-- This script forcefully changes UUID columns to TEXT to allow readable IDs

-- 1. Remove foreign key constraint temporarily
ALTER TABLE IF EXISTS public.global_objects_items 
DROP CONSTRAINT IF EXISTS global_objects_items_category_id_fkey;

-- 2. Change column types in categories
ALTER TABLE IF EXISTS public.global_objects_categories 
ALTER COLUMN id TYPE TEXT USING id::text;

-- 3. Change column types in items
ALTER TABLE IF EXISTS public.global_objects_items 
ALTER COLUMN id TYPE TEXT USING id::text,
ALTER COLUMN category_id TYPE TEXT USING category_id::text;

-- 4. Re-add the foreign key constraint
ALTER TABLE IF EXISTS public.global_objects_items 
ADD CONSTRAINT global_objects_items_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES public.global_objects_categories(id) ON DELETE CASCADE;

-- 5. Re-enable RLS and open policies (just to be safe)
ALTER TABLE public.global_objects_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_objects_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Categories Read" ON public.global_objects_categories;
CREATE POLICY "Public Categories Read" ON public.global_objects_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Items Read" ON public.global_objects_items;
CREATE POLICY "Public Items Read" ON public.global_objects_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Categories All" ON public.global_objects_categories;
CREATE POLICY "Admin Categories All" ON public.global_objects_categories FOR ALL USING (true);

DROP POLICY IF EXISTS "Admin Items All" ON public.global_objects_items;
CREATE POLICY "Admin Items All" ON public.global_objects_items FOR ALL USING (true);

-- 6. Insert/Update data again
INSERT INTO public.global_objects_categories (id, label_de, label_en, icon, "order")
VALUES ('basics', 'Basics', 'Basics', '📦', 1)
ON CONFLICT (id) DO UPDATE SET label_de = 'Basics', label_en = 'Basics';

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
