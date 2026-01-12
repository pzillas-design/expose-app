-- Optimization for Board Loading
-- The main board query filters by user_id and board_id, then orders by created_at DESC.
-- Adding a composite index makes this query instantaneous.

CREATE INDEX IF NOT EXISTS idx_canvas_images_lookup_v2 
ON public.canvas_images (user_id, board_id, created_at DESC);

-- Also optimize generation_jobs lookup which happens in parallel
CREATE INDEX IF NOT EXISTS idx_generation_jobs_lookup_v2
ON public.generation_jobs (user_id, board_id, created_at DESC)
WHERE status = 'processing';
