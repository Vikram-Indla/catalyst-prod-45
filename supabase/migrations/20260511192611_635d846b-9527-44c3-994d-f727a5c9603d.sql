DROP POLICY IF EXISTS "System can manage signup rate limits" ON public.signup_rate_limits;
CREATE POLICY "Service role access only" ON public.signup_rate_limits
  FOR ALL USING (false);