-- Create RPC function to get average generation times by model
CREATE OR REPLACE FUNCTION get_average_generation_times()
RETURNS TABLE(model TEXT, avg_duration_ms NUMERIC, sample_count BIGINT) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    generation_jobs.model,
    ROUND(AVG(duration_ms))::NUMERIC as avg_duration_ms,
    COUNT(*)::BIGINT as sample_count
  FROM generation_jobs
  WHERE status = 'completed'
    AND duration_ms IS NOT NULL
    AND duration_ms > 0
    AND duration_ms < 300000  -- Exclude outliers > 5 minutes
    AND created_at > NOW() - INTERVAL '30 days'
  GROUP BY generation_jobs.model
  HAVING COUNT(*) >= 3;  -- Require at least 3 samples
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_average_generation_times() TO authenticated;
