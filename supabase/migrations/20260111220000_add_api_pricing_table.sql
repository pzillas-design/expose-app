-- Add api_pricing table to store dynamic pricing from Google Cloud Billing API

CREATE TABLE IF NOT EXISTS public.api_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT UNIQUE NOT NULL,
    input_price_per_token NUMERIC(15, 12) NOT NULL,
    output_price_per_token NUMERIC(15, 12) NOT NULL,
    currency TEXT DEFAULT 'USD',
    source TEXT DEFAULT 'google_cloud_billing_api',
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Insert default fallback pricing (current as of Jan 2026)
INSERT INTO public.api_pricing (model_name, input_price_per_token, output_price_per_token, source, metadata)
VALUES 
    ('gemini-2.5-flash-image', 0.0000001, 0.0000004, 'manual_fallback', '{"note": "Fallback pricing, update via sync"}'),
    ('gemini-3-pro-image-preview', 0.00000125, 0.000005, 'manual_fallback', '{"note": "Fallback pricing, update via sync"}')
ON CONFLICT (model_name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.api_pricing ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all authenticated users to read (for edge functions)
CREATE POLICY "Anyone can read pricing" ON public.api_pricing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can manage pricing" ON public.api_pricing FOR ALL TO service_role USING (true);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_pricing_model_name ON public.api_pricing(model_name);
