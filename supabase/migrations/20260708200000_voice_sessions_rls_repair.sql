-- CAT-VOICE-UX-PREMIUM-20260708-001 S0 — RLS repair for voice_dictation_sessions.
-- Migration 20260620000003 is recorded in the ledger but its RLS DDL never
-- executed on staging (marked-not-executed drift): the table was live with
-- relrowsecurity=false and zero policies, while anon/authenticated held full
-- table grants. This re-applies the security posture idempotently.

ALTER TABLE public.voice_dictation_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voice_dictation_sessions_owner_select" ON public.voice_dictation_sessions;
CREATE POLICY "voice_dictation_sessions_owner_select" ON public.voice_dictation_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "voice_dictation_sessions_owner_insert" ON public.voice_dictation_sessions;
CREATE POLICY "voice_dictation_sessions_owner_insert" ON public.voice_dictation_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "voice_dictation_sessions_owner_update" ON public.voice_dictation_sessions;
CREATE POLICY "voice_dictation_sessions_owner_update" ON public.voice_dictation_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "voice_dictation_sessions_admin_select" ON public.voice_dictation_sessions;
CREATE POLICY "voice_dictation_sessions_admin_select" ON public.voice_dictation_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

-- The anon role has no business touching a per-user audit table at all.
REVOKE ALL ON public.voice_dictation_sessions FROM anon;
