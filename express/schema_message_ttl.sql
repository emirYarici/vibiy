-- ==============================================================================
-- 🧹 VIBIY AUTOMATIC MESSAGE TTL & STORAGE PURGE ENGINE
-- ==============================================================================
-- Automatically purges chat messages to keep database storage lightweight while
-- preserving matches with 'unmatched' status so pairs are not re-matched.
-- ==============================================================================

-- 1. Database Function: Clean up messages from unmatched/ended chats and old TTL messages
CREATE OR REPLACE FUNCTION public.cleanup_expired_messages(
  p_ttl_days INT DEFAULT 30
)
RETURNS TABLE (
  purged_unmatched_count BIGINT,
  purged_ttl_count BIGINT,
  total_purged BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unmatched_count BIGINT := 0;
  v_ttl_count BIGINT := 0;
BEGIN
  -- Step A: Delete all messages associated with unmatched / ended matches
  WITH deleted_unmatched AS (
    DELETE FROM public.messages
    WHERE match_id IN (
      SELECT id FROM public.matches WHERE status = 'unmatched'
    )
    RETURNING id
  )
  SELECT count(*) INTO v_unmatched_count FROM deleted_unmatched;

  -- Step B: Delete messages older than p_ttl_days (Auto-TTL for message storage efficiency)
  WITH deleted_ttl AS (
    DELETE FROM public.messages
    WHERE created_at < (NOW() - (p_ttl_days || ' days')::INTERVAL)
    RETURNING id
  )
  SELECT count(*) INTO v_ttl_count FROM deleted_ttl;

  RETURN QUERY
  SELECT 
    v_unmatched_count AS purged_unmatched_count,
    v_ttl_count AS purged_ttl_count,
    (v_unmatched_count + v_ttl_count) AS total_purged;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.cleanup_expired_messages(INT) TO authenticated, service_role;

-- ==============================================================================
-- 2. Optional: Automated Daily Scheduled Execution via pg_cron (Supabase)
-- ==============================================================================
-- If your Supabase instance has pg_cron enabled in Database > Extensions:
-- Run the following command in Supabase SQL editor:
--
-- SELECT cron.schedule(
--   'vibiy-daily-message-ttl-purge',
--   '0 3 * * *', -- Runs every night at 3:00 AM UTC
--   'SELECT public.cleanup_expired_messages(30);'
-- );
--
-- To check scheduled cron jobs:
-- SELECT * FROM cron.job;
-- ==============================================================================
