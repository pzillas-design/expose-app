-- Fix: Add missing columns to generation_jobs + add get_smart_generation_estimates function
-- All statements use IF NOT EXISTS / CREATE OR REPLACE so they are safe to run on existing schema

-- Missing columns in generation_jobs
ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS error TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS quality_mode TEXT,
  ADD COLUMN IF NOT EXISTS request_payload JSONB,
  ADD COLUMN IF NOT EXISTS parent_id UUID;

-- Re-create get_smart_generation_estimates (was never deployed to remote)
CREATE OR REPLACE FUNCTION get_smart_generation_estimates()
RETURNS TABLE(
    quality_mode TEXT,
    base_duration_ms NUMERIC,
    concurrency_factor NUMERIC,
    sample_count BIGINT
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH last_jobs AS (
    SELECT DISTINCT ON (gj.quality_mode)
      gj.quality_mode,
      gj.duration_ms
    FROM generation_jobs gj
    WHERE gj.status = 'completed'
      AND gj.duration_ms IS NOT NULL
      AND gj.duration_ms > 0
      AND gj.duration_ms < 300000
      AND gj.created_at > NOW() - INTERVAL '7 days'
    ORDER BY gj.quality_mode, gj.created_at DESC
  ),
  defaults AS (
    SELECT
      qm.mode::TEXT as quality_mode,
      qm.duration::NUMERIC as duration_ms
    FROM (
      VALUES
        ('fast', 8000),
        ('pro-1k', 25000),
        ('pro-2k', 35000),
        ('pro-4k', 50000)
    ) AS qm(mode, duration)
  )
  SELECT
    COALESCE(lj.quality_mode, d.quality_mode)::TEXT,
    COALESCE(lj.duration_ms, d.duration_ms)::NUMERIC as base_duration_ms,
    0.3::NUMERIC as concurrency_factor,
    CASE WHEN lj.quality_mode IS NOT NULL THEN 1::BIGINT ELSE 0::BIGINT END as sample_count
  FROM defaults d
  LEFT JOIN last_jobs lj ON d.quality_mode = lj.quality_mode;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_smart_generation_estimates() TO authenticated;
