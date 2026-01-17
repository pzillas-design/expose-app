-- Add concurrent_jobs column to track parallel job count
ALTER TABLE generation_jobs 
ADD COLUMN IF NOT EXISTS concurrent_jobs INTEGER DEFAULT 0;

-- Add index for faster queries on concurrent_jobs
CREATE INDEX IF NOT EXISTS idx_generation_jobs_concurrent 
ON generation_jobs(concurrent_jobs, model, status, created_at);

-- Add comment
COMMENT ON COLUMN generation_jobs.concurrent_jobs IS 'Number of other jobs running at generation start time';
