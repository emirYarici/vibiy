-- ==============================================================================
-- 🛡️ VIBIY TRUST & SAFETY SCHEMA (Apple App Store Guideline 1.2 UGC Compliance)
-- ==============================================================================
-- Creates 'reports' and 'blocked_users' tables with Row Level Security (RLS)
-- and functions to satisfy Apple App Store UGC reporting and blocking mandates.
-- ==============================================================================

-- 1. Create public.reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'actioned', 'dismissed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- Index for fast moderation queries
CREATE INDEX IF NOT EXISTS reports_reporter_idx ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS reports_reported_idx ON public.reports(reported_user_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status);

-- 2. Create public.blocked_users table
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_block_pair UNIQUE (blocker_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS blocked_users_blocker_idx ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS blocked_users_blocked_idx ON public.blocked_users(blocked_user_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for reports
-- Any authenticated user can submit a report
CREATE POLICY "Users can create reports"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view reports they created
CREATE POLICY "Users can view their own submitted reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Service role has full access to reports for admin dashboard review
CREATE POLICY "Service role full access to reports"
  ON public.reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. RLS Policies for blocked_users
CREATE POLICY "Users can block other users"
  ON public.blocked_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can view who they blocked"
  ON public.blocked_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock"
  ON public.blocked_users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Service role full access to blocks"
  ON public.blocked_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
