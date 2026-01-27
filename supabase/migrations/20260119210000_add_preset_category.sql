-- Add category column to global_presets table
ALTER TABLE global_presets 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'user';

-- Migrate existing data to set appropriate categories
UPDATE global_presets 
SET category = CASE
  WHEN user_id IS NULL THEN 'system'
  WHEN 'history' = ANY(tags) THEN 'recent'
  ELSE 'user'
END
WHERE category IS NULL OR category = 'user';

-- Add index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_global_presets_category 
ON global_presets(category);

-- Add index for user-specific queries
CREATE INDEX IF NOT EXISTS idx_global_presets_user_category 
ON global_presets(user_id, category);

-- Enable Row Level Security
ALTER TABLE global_presets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view relevant presets" ON global_presets;
DROP POLICY IF EXISTS "Users can modify own presets" ON global_presets;

-- Policy 1: Users can view system presets and their own presets
CREATE POLICY "Users can view relevant presets"
ON global_presets FOR SELECT
USING (
  category = 'system' OR 
  user_id = auth.uid()
);

-- Policy 2: Users can only insert/update/delete their own presets
CREATE POLICY "Users can modify own presets"
ON global_presets FOR ALL
USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT SELECT ON global_presets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON global_presets TO authenticated;
