-- Fix user_presence SELECT policy for chat people directory.
--
-- Root cause: the old presence_select policy called shared_user_ids(auth.uid()),
-- a STABLE SECURITY DEFINER function that cross-joins ph_issues (2000+ rows)
-- to compute which users the viewer "shares work" with. For users not assigned
-- to any ph_issues (e.g. new team members), the function returns empty, meaning
-- they could only see their own presence row — causing the chat people directory
-- to load slowly and show no teammate presence data.
--
-- Fix: presence state (onsite/remote/away/on_leave) is non-PII.
-- Grant all authenticated users SELECT on the full table — same risk profile
-- as ph_comments (2026-05-29 lesson). The UI is session-gated via Supabase Auth.

DROP POLICY IF EXISTS "presence_select" ON user_presence;

CREATE POLICY "presence_select" ON user_presence
  FOR SELECT TO authenticated
  USING (true);
