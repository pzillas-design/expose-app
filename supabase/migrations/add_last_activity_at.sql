-- Add last_activity_at column to boards table
-- This tracks when the last image was generated or uploaded to the board

ALTER TABLE boards 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing boards with updated_at value
UPDATE boards 
SET last_activity_at = updated_at 
WHERE last_activity_at IS NULL;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_boards_last_activity 
ON boards(last_activity_at) 
WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN boards.last_activity_at IS 'Timestamp of last image generation or upload. Used for auto-deletion after 30 days of inactivity.';
