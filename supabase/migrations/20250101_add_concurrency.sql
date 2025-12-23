-- Add concurrent_jobs column to generation_jobs table to track load
ALTER TABLE generation_jobs 
ADD COLUMN IF NOT EXISTS concurrent_jobs INTEGER DEFAULT 1;

-- Update the get_average_durations function to optionally filter by load (future proofing)
-- For now, we just ensure the column exists.
