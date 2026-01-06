
-- Add api_cost column to generation_jobs table needed for admin reporting
ALTER TABLE generation_jobs 
ADD COLUMN IF NOT EXISTS api_cost DOUBLE PRECISION;
