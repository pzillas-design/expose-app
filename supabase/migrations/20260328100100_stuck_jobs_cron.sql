-- Auto-refund stuck generation jobs (processing > 8 minutes).
-- Runs every 5 minutes via pg_cron. Replaces client-side refund logic.

CREATE OR REPLACE FUNCTION refund_stuck_generation_jobs()
RETURNS void AS $$
BEGIN
  -- Refund credits to profiles
  UPDATE profiles p
  SET credits = p.credits + j.cost
  FROM generation_jobs j
  WHERE j.user_id = p.id
    AND j.status = 'processing'
    AND j.created_at < NOW() - INTERVAL '8 minutes'
    AND j.cost > 0;

  -- Mark stuck jobs as failed
  UPDATE generation_jobs
  SET status = 'failed',
      error = 'Server timeout - credits refunded'
  WHERE status = 'processing'
    AND created_at < NOW() - INTERVAL '8 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule('refund-stuck-jobs', '*/5 * * * *', 'SELECT refund_stuck_generation_jobs()');
