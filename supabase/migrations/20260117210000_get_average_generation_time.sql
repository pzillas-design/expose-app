-- Fixed smart generation estimates - resolved ambiguous column references
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
  WITH recent_data AS (\n    -- Get completed jobs from last 30 days, weighted by recency
    SELECT 
      gj.quality_mode,
      gj.duration_ms,
      gj.concurrent_jobs,
      CASE 
        WHEN gj.created_at > NOW() - INTERVAL '7 days' THEN 0.7
        ELSE 0.3
      END as weight
    FROM generation_jobs gj
    WHERE gj.status = 'completed'
      AND gj.duration_ms IS NOT NULL
      AND gj.duration_ms > 0
      AND gj.duration_ms < 300000  -- Exclude outliers > 5 minutes
      AND gj.created_at > NOW() - INTERVAL '30 days'
      AND gj.quality_mode IS NOT NULL
  ),
  base_durations AS (
    -- Calculate weighted average base duration (solo jobs only)
    SELECT 
      rd.quality_mode,
      SUM(rd.duration_ms * rd.weight) / SUM(rd.weight) as weighted_avg
    FROM recent_data rd
    WHERE rd.concurrent_jobs <= 1
    GROUP BY rd.quality_mode
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
    (SELECT COUNT(*)::BIGINT FROM recent_data rd2 WHERE rd2.quality_mode = bd.quality_mode) as sample_count
  FROM base_durations bd
  LEFT JOIN concurrency_impact ci ON bd.quality_mode = ci.quality_mode;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_smart_generation_estimates() TO authenticated;
