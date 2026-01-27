-- Rollback migration for 20260119210000_add_preset_category.sql
-- Run this if you need to undo the category column changes

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view relevant presets" ON global_presets;
DROP POLICY IF EXISTS "Users can modify own presets" ON global_presets;

-- Disable RLS (if it wasn't enabled before)
ALTER TABLE global_presets DISABLE ROW LEVEL SECURITY;

-- Drop indexes
DROP INDEX IF EXISTS idx_global_presets_category;
DROP INDEX IF EXISTS idx_global_presets_user_category;

-- Remove category column
ALTER TABLE global_presets DROP COLUMN IF EXISTS category;
