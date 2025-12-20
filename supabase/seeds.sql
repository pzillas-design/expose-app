-- Create global_presets table
CREATE TABLE IF NOT EXISTS public.global_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    is_pinned BOOLEAN DEFAULT false,
    is_custom BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    lang TEXT DEFAULT 'de',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.global_presets ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public Presets Read" ON public.global_presets
    FOR SELECT TO public
    USING (true);

-- Allow authenticated users to insert/update (or restrict to admin in production)
CREATE POLICY "Admin Presets All" ON public.global_presets
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);


-- Create global_objects_categories table
CREATE TABLE IF NOT EXISTS public.global_objects_categories (
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
CREATE TABLE IF NOT EXISTS public.global_objects_items (
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
INSERT INTO public.global_presets (title, prompt, tags, lang, is_pinned) VALUES
('Modernes Wohnzimmer', 'Ein helles, modernes Wohnzimmer mit großen Fenstern, minimalistischen Möbeln, Holzboden, 8k, photorealistic', ARRAY['Interior', 'Wohnen'], 'de', true),
('Sunny Garden', 'A beautiful sunny garden with blooming flowers, green grass, blue sky, cinematic lighting', ARRAY['Exterior', 'Nature'], 'en', true),
('Küche Industrial', 'Eine Küche im Industrial Style, Backsteinwand, dunkle Schränke, Kupferakzente', ARRAY['Interior', 'Küche'], 'de', false)
ON CONFLICT DO NOTHING;

-- 2. Object Categories & Items
DO $$
DECLARE
    cat_basics UUID;
    cat_furn UUID;
BEGIN
    -- Category: Basics
    INSERT INTO public.global_objects_categories (label_de, label_en, icon, "order")
    VALUES ('Basis', 'Basics', '📦', 10)
    RETURNING id INTO cat_basics;

    INSERT INTO public.global_objects_items (category_id, label_de, label_en, icon) VALUES
    (cat_basics, 'Person', 'Person', '👤'),
    (cat_basics, 'Baum', 'Tree', '🌳'),
    (cat_basics, 'Auto', 'Car', '🚗');

    -- Category: Furniture
    INSERT INTO public.global_objects_categories (label_de, label_en, icon, "order")
    VALUES ('Möbel', 'Furniture', '🪑', 20)
    RETURNING id INTO cat_furn;

    INSERT INTO public.global_objects_items (category_id, label_de, label_en, icon) VALUES
    (cat_furn, 'Sofa', 'Sofa', '🛋️'),
    (cat_furn, 'Tisch', 'Table', '🪑'),
    (cat_furn, 'Lampe', 'Lamp', '💡');

END $$;
