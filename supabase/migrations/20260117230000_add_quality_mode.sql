-- Add quality_mode column to differentiate resolution tiers
ALTER TABLE generation_jobs 
ADD COLUMN IF NOT EXISTS quality_mode TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_generation_jobs_quality 
ON generation_jobs(quality_mode, model, status, created_at);

-- Add comment
COMMENT ON COLUMN generation_jobs.quality_mode IS 'Quality tier: fast, pro-1k, pro-2k, pro-4k';
