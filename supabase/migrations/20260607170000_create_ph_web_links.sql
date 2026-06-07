-- ph_web_links — per-ticket web link attachments rendered by the
-- "Web Links" section in CatalystView* (sits directly under Linked
-- Work Items). Each row represents one URL + optional display text
-- attached to a single ph_issues row.
--
-- Naming + RLS mirror ph_comments (the closest sibling): SELECT is
-- open to all authenticated users (non-PII metadata, AdminGuard at
-- the UI layer), INSERT/DELETE gated on ownership.

-- `work_item_id` is intentionally a bare UUID column with NO FK
-- constraint. The same WebLinksSection component is mounted from both
-- project-hub detail views (`ph_issues.id`) and the BR view
-- (`business_requests.id`), so a hard FK to either table would break
-- the other. The application layer (useWebLinks) is the gate on
-- validity. Tradeoff: no ON DELETE CASCADE — orphan rows are possible
-- if the parent work item is hard-deleted; cleanup can be a future
-- maintenance migration if it becomes a problem. (Same pattern as
-- ph_issues.project_manager_user_id which carries no FK.)
CREATE TABLE IF NOT EXISTS public.ph_web_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id  UUID NOT NULL,
  url           TEXT NOT NULL CHECK (length(url) > 0 AND length(url) <= 2048),
  link_text     TEXT NULL CHECK (link_text IS NULL OR length(link_text) <= 500),
  created_by    UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ph_web_links_work_item_id
  ON public.ph_web_links (work_item_id, created_at DESC);

ALTER TABLE public.ph_web_links ENABLE ROW LEVEL SECURITY;

-- SELECT — all authenticated users can read web links on issues they
-- can see. ph_web_links carries no PII; the work item the link is
-- attached to is the boundary. Matches ph_comments pattern.
DROP POLICY IF EXISTS ph_web_links_select ON public.ph_web_links;
CREATE POLICY ph_web_links_select ON public.ph_web_links
  FOR SELECT TO authenticated
  USING (true);

-- INSERT — authenticated users; must set created_by = themselves so
-- ownership is provable for the DELETE policy.
DROP POLICY IF EXISTS ph_web_links_insert ON public.ph_web_links;
CREATE POLICY ph_web_links_insert ON public.ph_web_links
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- DELETE — owner or admin. Same admin-check pattern as
-- design_violations (CLAUDE.md 2026-05-19).
DROP POLICY IF EXISTS ph_web_links_delete ON public.ph_web_links;
CREATE POLICY ph_web_links_delete ON public.ph_web_links
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'::public.app_role
    )
  );

-- UPDATE — owner only. Web links are mostly immutable in the UI
-- (delete + re-add is the user flow), but allow ownership-edit in
-- case a future flow needs it.
DROP POLICY IF EXISTS ph_web_links_update ON public.ph_web_links;
CREATE POLICY ph_web_links_update ON public.ph_web_links
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

COMMENT ON TABLE public.ph_web_links IS
  'Web URL attachments rendered by the Web Links section under Linked Work Items in every CatalystView* detail view.';
