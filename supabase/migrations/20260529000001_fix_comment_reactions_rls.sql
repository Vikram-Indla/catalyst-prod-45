-- Fix broken ph_comment_reactions RLS.
--
-- Root cause (CLAUDE.md lesson 2026-05-29):
--   The original "Members can manage reactions" policy joined through
--   ph_work_items (Lovable legacy table), but ph_comments.work_item_id
--   has a FK to ph_issues (Jira sync table). The two tables have
--   completely different UUID sets, so the USING clause never matched any
--   row — every reaction INSERT / DELETE was silently blocked by RLS.
--
-- Fix: replace the broken policy with three narrow policies:
--   1. SELECT — all authenticated users can read reactions (needed for counts)
--   2. INSERT — authenticated users can only insert their own reaction rows
--   3. DELETE — authenticated users can only delete their own reaction rows

DROP POLICY IF EXISTS "Members can manage reactions" ON public.ph_comment_reactions;

-- Ensure RLS is enabled (idempotent — bootstrap already enables it)
ALTER TABLE public.ph_comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select_all"
  ON public.ph_comment_reactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "reactions_insert_own"
  ON public.ph_comment_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reactions_delete_own"
  ON public.ph_comment_reactions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
