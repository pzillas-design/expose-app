-- Simple generation time estimates based on quality mode
-- Returns fixed estimates for each quality tier
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
  SELECT 
    qm.mode::TEXT,
    qm.duration::NUMERIC,
    0.3::NUMERIC as concurrency_factor,
    0::BIGINT as sample_count
  FROM (
    VALUES 
      ('fast', 8000),      -- Gemini 2.5 Flash: ~8 seconds
      ('pro-1k', 25000),   -- Gemini 3 Pro 1K: ~25 seconds
      ('pro-2k', 35000),   -- Gemini 3 Pro 2K: ~35 seconds
      ('pro-4k', 50000)    -- Gemini 3 Pro 4K: ~50 seconds
  ) AS qm(mode, duration);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_smart_generation_estimates() TO authenticated;
