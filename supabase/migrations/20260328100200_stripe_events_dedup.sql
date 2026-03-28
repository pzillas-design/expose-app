-- Stripe webhook event deduplication table.
-- Prevents double-crediting when Stripe retries webhooks.

CREATE TABLE IF NOT EXISTS public.stripe_events (
    event_id TEXT PRIMARY KEY,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);
