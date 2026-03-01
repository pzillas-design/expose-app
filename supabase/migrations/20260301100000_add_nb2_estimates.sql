-- Add nb2-* quality modes to smart generation estimates + improve accuracy (avg of last 10 jobs)
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
    -- Average of up to 10 most recent completed jobs per quality_mode (last 7 days)
    SELECT
      gj.quality_mode,
      AVG(gj.duration_ms)::NUMERIC  AS avg_duration_ms,
      COUNT(*)                       AS cnt
    FROM (
      SELECT quality_mode, duration_ms, created_at,
             ROW_NUMBER() OVER (PARTITION BY quality_mode ORDER BY created_at DESC) AS rn
      FROM generation_jobs
      WHERE status = 'completed'
        AND duration_ms IS NOT NULL
        AND duration_ms > 0
        AND duration_ms < 300000
        AND created_at > NOW() - INTERVAL '7 days'
    ) sub
    WHERE rn <= 10
    GROUP BY quality_mode
  ),
  defaults AS (
    SELECT
      qm.mode::TEXT         AS quality_mode,
      qm.duration::NUMERIC  AS duration_ms
    FROM (
      VALUES
        ('fast',   8000),
        ('pro-1k', 25000),
        ('pro-2k', 35000),
        ('pro-4k', 50000),
        ('nb2-1k', 15000),
        ('nb2-2k', 25000),
        ('nb2-4k', 45000)
    ) AS qm(mode, duration)
  )
  SELECT
    COALESCE(lj.quality_mode, d.quality_mode)::TEXT,
    COALESCE(lj.avg_duration_ms, d.duration_ms)::NUMERIC AS base_duration_ms,
    0.3::NUMERIC                                          AS concurrency_factor,
    COALESCE(lj.cnt, 0::BIGINT)                           AS sample_count
  FROM defaults d
  LEFT JOIN last_jobs lj ON d.quality_mode = lj.quality_mode;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_smart_generation_estimates() TO authenticated;
