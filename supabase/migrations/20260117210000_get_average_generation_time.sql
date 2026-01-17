-- Smart generation estimates with recent bias, time-of-day, and concurrency impact
CREATE OR REPLACE FUNCTION get_smart_generation_estimates()
RETURNS TABLE(
    model TEXT,
    base_duration_ms NUMERIC,
    concurrency_factor NUMERIC,
    hour_factors JSONB,
    sample_count BIGINT
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH recent_data AS (
    -- Get all completed jobs from last 30 days
    SELECT 
      generation_jobs.model,
      duration_ms,
      concurrent_jobs,
      EXTRACT(HOUR FROM created_at)::INTEGER as hour,
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
  ),
  base_durations AS (
    -- Calculate weighted average base duration (when concurrent_jobs = 0 or 1)
    SELECT 
      model,
      SUM(duration_ms * weight) / SUM(weight) as weighted_avg
    FROM recent_data
    WHERE concurrent_jobs <= 1
    GROUP BY model
    HAVING COUNT(*) >= 3
  ),
  concurrency_impact AS (
    -- Calculate concurrency factor: how much each additional job slows things down
    SELECT 
      rd.model,
      CASE 
        WHEN bd.weighted_avg > 0 AND COUNT(*) >= 5 THEN
          -- Factor = (avg_duration - base_duration) / (concurrent_jobs * base_duration)
          GREATEST(0, (AVG(rd.duration_ms) - bd.weighted_avg) / NULLIF(AVG(rd.concurrent_jobs) * bd.weighted_avg, 0))
        ELSE 0.3  -- Default fallback
      END as factor
    FROM recent_data rd
    JOIN base_durations bd ON rd.model = bd.model
    WHERE rd.concurrent_jobs > 1
    GROUP BY rd.model, bd.weighted_avg
  ),
  hourly_factors AS (
    -- Calculate time-of-day multipliers
    SELECT 
      rd.model,
      jsonb_object_agg(
        rd.hour::TEXT,
        ROUND((AVG(rd.duration_ms) / bd.weighted_avg)::NUMERIC, 3)
      ) as factors
    FROM recent_data rd
    JOIN base_durations bd ON rd.model = bd.model
    GROUP BY rd.model, bd.weighted_avg
    HAVING COUNT(*) >= 2
  )
  SELECT 
    bd.model,
    ROUND(bd.weighted_avg)::NUMERIC as base_duration_ms,
    COALESCE(ROUND(ci.factor::NUMERIC, 3), 0.3) as concurrency_factor,
    COALESCE(hf.factors, '{}'::JSONB) as hour_factors,
    (SELECT COUNT(*)::BIGINT FROM recent_data WHERE model = bd.model) as sample_count
  FROM base_durations bd
  LEFT JOIN concurrency_impact ci ON bd.model = ci.model
  LEFT JOIN hourly_factors hf ON bd.model = hf.model;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_smart_generation_estimates() TO authenticated;
