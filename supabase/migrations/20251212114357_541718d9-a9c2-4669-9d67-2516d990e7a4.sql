-- =====================================================
-- PROMPT 2: Data Model Updates for Approval Workflow
-- =====================================================

-- 1. Create enum for user approval status
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_approval_status') THEN
    CREATE TYPE user_approval_status AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DISABLED');
  END IF;
END $$;

-- 2. Add new columns to profiles table for approval workflow
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS approval_status user_approval_status DEFAULT 'PENDING_APPROVAL',
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS signup_attempts_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_signup_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id);

-- 3. Migrate existing users to APPROVED status (they already have access)
UPDATE public.profiles 
SET approval_status = 'APPROVED',
    approved_at = created_at
WHERE approval_status IS NULL OR approval_status = 'PENDING_APPROVAL';

-- 4. Create auth_audit_log table for tracking auth events
CREATE TABLE IF NOT EXISTS public.auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  event_type TEXT NOT NULL,
  event_details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON public.auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_event_type ON public.auth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON public.auth_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON public.profiles(approval_status);

-- 6. Enable RLS on auth_audit_log
ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies for auth_audit_log (admin only)
CREATE POLICY "Admins can view all auth audit logs"
  ON public.auth_audit_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert auth audit logs"
  ON public.auth_audit_log
  FOR INSERT
  WITH CHECK (true);

-- 8. Create signup_rate_limits table for tracking rate limits
CREATE TABLE IF NOT EXISTS public.signup_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  attempt_count INTEGER DEFAULT 1,
  first_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create unique constraint for rate limit tracking
CREATE UNIQUE INDEX IF NOT EXISTS idx_signup_rate_limits_email ON public.signup_rate_limits(email);
CREATE INDEX IF NOT EXISTS idx_signup_rate_limits_ip ON public.signup_rate_limits(ip_address);

-- 10. Enable RLS on signup_rate_limits
ALTER TABLE public.signup_rate_limits ENABLE ROW LEVEL SECURITY;

-- 11. RLS policies for signup_rate_limits
CREATE POLICY "System can manage signup rate limits"
  ON public.signup_rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 12. Add comment for documentation
COMMENT ON COLUMN public.profiles.approval_status IS 'User approval status: PENDING_APPROVAL (new signups), APPROVED (can login), REJECTED (blocked), DISABLED (deactivated by admin)';
COMMENT ON TABLE public.auth_audit_log IS 'Tracks authentication events: signups, approvals, rejections, logins, etc.';
COMMENT ON TABLE public.signup_rate_limits IS 'Tracks signup attempts for rate limiting and spam prevention';