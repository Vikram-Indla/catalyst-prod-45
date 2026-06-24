-- catalyst_feedback — user-submitted feedback from "Share your thoughts" modal.
--
-- Categories mirror Jira's give-feedback flow:
--   ask_question | leave_comment | report_bug | suggest_improvement
--
-- RLS:
--   INSERT: any authenticated user can submit their own feedback
--   SELECT: admin-only (uses canonical user_roles check)
--   UPDATE/DELETE: blocked (immutable log)

CREATE TABLE IF NOT EXISTS public.catalyst_feedback (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category      text NOT NULL CHECK (category IN ('ask_question','leave_comment','report_bug','suggest_improvement')),
  description   text NOT NULL CHECK (length(description) > 0),
  contact_opt_in           boolean NOT NULL DEFAULT false,
  product_research_opt_in  boolean NOT NULL DEFAULT false,
  source_route  text,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalyst_feedback_user      ON public.catalyst_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_catalyst_feedback_category  ON public.catalyst_feedback(category);
CREATE INDEX IF NOT EXISTS idx_catalyst_feedback_created   ON public.catalyst_feedback(created_at DESC);

ALTER TABLE public.catalyst_feedback ENABLE ROW LEVEL SECURITY;

-- Grants — PostgREST needs explicit table-level grants on top of RLS.
-- RLS still enforces row-level access; these grants just expose the table
-- through the PostgREST API.
GRANT INSERT ON public.catalyst_feedback TO authenticated;
GRANT SELECT ON public.catalyst_feedback TO authenticated;

DO $$
BEGIN
  -- INSERT: authenticated users may insert their own row
  DROP POLICY IF EXISTS catalyst_feedback_insert_self ON public.catalyst_feedback;
  CREATE POLICY catalyst_feedback_insert_self ON public.catalyst_feedback
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

  -- SELECT: admin only
  DROP POLICY IF EXISTS catalyst_feedback_admin_select ON public.catalyst_feedback;
  CREATE POLICY catalyst_feedback_admin_select ON public.catalyst_feedback
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
      )
    );
END $$;

-- Force PostgREST to reload its schema cache so the new table is exposed
-- immediately without waiting for the periodic refresh.
NOTIFY pgrst, 'reload schema';
