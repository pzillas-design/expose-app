-- Simplified smart generation estimates - only quality_mode and concurrency
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
  WITH recent_data AS (
    -- Get completed jobs from last 30 days, weighted by recency
    SELECT 
      quality_mode,
      duration_ms,
      concurrent_jobs,
      CASE 
        WHEN created_at > NOW() - INTERVAL '7 days' THEN 0.7
        ELSE 0.3
      END as weight
    FROM generation_jobs
    WHERE status = 'completed'
      AND duration_ms IS NOT NULL
      AND duration_ms > 0
      AND duration_ms < 300000  -- Exclude outliers > 5 minutes
      AND created_at > NOW() - INTERVAL '30 days'
      AND quality_mode IS NOT NULL
  ),
  base_durations AS (
    -- Calculate weighted average base duration (solo jobs only)
    SELECT 
      quality_mode,
      SUM(duration_ms * weight) / SUM(weight) as weighted_avg
    FROM recent_data
    WHERE concurrent_jobs <= 1
    GROUP BY quality_mode
    HAVING COUNT(*) >= 1  -- Start with just 1 sample
  ),
  concurrency_impact AS (
    -- Calculate concurrency factor from parallel jobs
    SELECT 
      rd.quality_mode,
      CASE 
        WHEN bd.weighted_avg > 0 AND COUNT(*) >= 2 THEN  -- Just 2 parallel samples
          GREATEST(0, (AVG(rd.duration_ms) - bd.weighted_avg) / NULLIF(AVG(rd.concurrent_jobs) * bd.weighted_avg, 0))
        ELSE 0.3  -- Default fallback
      END as factor
    FROM recent_data rd
    JOIN base_durations bd ON rd.quality_mode = bd.quality_mode
    WHERE rd.concurrent_jobs > 1
    GROUP BY rd.quality_mode, bd.weighted_avg
  )
  SELECT 
    bd.quality_mode,
    ROUND(bd.weighted_avg)::NUMERIC as base_duration_ms,
    COALESCE(ROUND(ci.factor::NUMERIC, 3), 0.3) as concurrency_factor,
    (SELECT COUNT(*)::BIGINT FROM recent_data WHERE quality_mode = bd.quality_mode) as sample_count
  FROM base_durations bd
  LEFT JOIN concurrency_impact ci ON bd.quality_mode = ci.quality_mode;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_smart_generation_estimates() TO authenticated;
