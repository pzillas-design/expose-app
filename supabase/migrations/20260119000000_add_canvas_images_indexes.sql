-- Add composite index for faster image queries
-- This will speed up queries filtering by user_id and board_id, ordered by created_at

CREATE INDEX IF NOT EXISTS idx_canvas_images_user_board_created 
ON canvas_images(user_id, board_id, created_at DESC);

-- Add index for user-only queries (when board_id is null)
CREATE INDEX IF NOT EXISTS idx_canvas_images_user_created 
ON canvas_images(user_id, created_at DESC) 
WHERE board_id IS NULL;

-- Analyze the table to update query planner statistics
ANALYZE canvas_images;
