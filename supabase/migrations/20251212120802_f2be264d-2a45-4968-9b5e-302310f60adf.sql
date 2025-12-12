-- ============================================================
-- PROMPT 7 & 8: Security Hardening - Rate Limiting, Audit Logging, Domain Allowlist
-- ============================================================

-- 1. Ensure signup_rate_limits table has all needed columns
ALTER TABLE IF EXISTS public.signup_rate_limits 
ADD COLUMN IF NOT EXISTS blocked_until timestamptz,
ADD COLUMN IF NOT EXISTS first_attempt_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_suspicious boolean DEFAULT false;

-- 2. Create login_rate_limits table for login attempt tracking
CREATE TABLE IF NOT EXISTS public.login_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  attempt_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  first_attempt_at timestamptz DEFAULT now(),
  last_attempt_at timestamptz DEFAULT now(),
  blocked_until timestamptz,
  lockout_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_login_rate_limits_email ON public.login_rate_limits(email);
CREATE INDEX IF NOT EXISTS idx_login_rate_limits_ip ON public.login_rate_limits(ip_address);

-- Enable RLS
ALTER TABLE public.login_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (edge functions)
CREATE POLICY "Service role access only" ON public.login_rate_limits
  FOR ALL USING (false);

-- 3. Create domain_allowlist table for email domain restrictions
CREATE TABLE IF NOT EXISTS public.domain_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  added_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.domain_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage domain allowlist" ON public.domain_allowlist
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 4. Create auth_settings table for global auth configuration
CREATE TABLE IF NOT EXISTS public.auth_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}',
  updated_by uuid,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.auth_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage auth settings" ON public.auth_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.auth_settings (setting_key, setting_value) 
VALUES 
  ('domain_allowlist_enabled', '{"enabled": false}'::jsonb),
  ('login_lockout_threshold', '{"attempts": 5, "lockout_minutes": 15}'::jsonb),
  ('signup_rate_limit', '{"max_attempts": 5, "window_minutes": 60}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- 5. Create disposable_email_domains table for blocking throwaway emails
CREATE TABLE IF NOT EXISTS public.disposable_email_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.disposable_email_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read disposable domains" ON public.disposable_email_domains
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage disposable domains" ON public.disposable_email_domains
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Seed common disposable email domains
INSERT INTO public.disposable_email_domains (domain) VALUES
  ('10minutemail.com'),
  ('guerrillamail.com'),
  ('tempmail.com'),
  ('throwaway.email'),
  ('mailinator.com'),
  ('yopmail.com'),
  ('sharklasers.com'),
  ('guerrillamail.info'),
  ('grr.la'),
  ('dispostable.com'),
  ('fakeinbox.com'),
  ('trashmail.com'),
  ('getnada.com'),
  ('temp-mail.org'),
  ('mohmal.com'),
  ('emailondeck.com'),
  ('mytemp.email'),
  ('tempr.email'),
  ('maildrop.cc'),
  ('getairmail.com')
ON CONFLICT (domain) DO NOTHING;

-- 6. Add last_signup_attempt_at to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_signup_attempt_at timestamptz,
ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
ADD COLUMN IF NOT EXISTS failed_login_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until timestamptz;

-- 7. Add password_reset_tokens table for secure password resets
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON public.password_reset_tokens(token_hash);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.password_reset_tokens
  FOR ALL USING (false);

-- 8. Create password_reset_rate_limits table
CREATE TABLE IF NOT EXISTS public.password_reset_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  attempt_count integer DEFAULT 0,
  last_attempt_at timestamptz DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_rate_email ON public.password_reset_rate_limits(email);

ALTER TABLE public.password_reset_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for reset limits" ON public.password_reset_rate_limits
  FOR ALL USING (false);