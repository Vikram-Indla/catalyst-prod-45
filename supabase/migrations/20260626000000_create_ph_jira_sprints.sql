-- 2026-06-26: ph_jira_sprints table mirrors ph_releases for project-hub
-- Sprints tab. Identical schema + identical CRUD UX. Project-scoped (vs
-- release's product-scoped). Catalyst-owned (no Jira write-back yet).
--
-- Status values match ph_releases CHECK constraint exactly:
--   planning | in_progress | released | archived
-- UI maps planning + in_progress -> "unreleased" (same as releases).
--
-- Safe to re-run: every object guarded with IF NOT EXISTS.

-- ─── Table ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ph_jira_sprints (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  title           text NOT NULL,
  description     text,
  status          text DEFAULT 'planning'::text NOT NULL,
  start_date      date,
  target_date     date NOT NULL,
  actual_date     date,
  release_date    date,
  owner_user_id   uuid,
  color           text DEFAULT '#2563eb'::text,
  sort_order      integer DEFAULT 0,
  project_id      uuid REFERENCES public.ph_projects(id) ON DELETE CASCADE,
  jira_sprint_id  text,
  created_at      timestamp with time zone DEFAULT now(),
  updated_at      timestamp with time zone DEFAULT now(),
  CONSTRAINT ph_jira_sprints_status_check
    CHECK ((status = ANY (ARRAY['planning'::text, 'in_progress'::text, 'released'::text, 'archived'::text])))
);

CREATE INDEX IF NOT EXISTS idx_ph_jira_sprints_project_id  ON public.ph_jira_sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_ph_jira_sprints_status      ON public.ph_jira_sprints(status);
CREATE INDEX IF NOT EXISTS idx_ph_jira_sprints_target_date ON public.ph_jira_sprints(target_date);

-- ─── Updated-at trigger ───────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_ph_jira_sprints_updated ON public.ph_jira_sprints;
CREATE TRIGGER trg_ph_jira_sprints_updated
  BEFORE UPDATE ON public.ph_jira_sprints
  FOR EACH ROW EXECUTE FUNCTION public.fn_ph_update_timestamp();

-- ─── RLS ──────────────────────────────────────────────────────────────────
-- Mirrors ph_releases: anon read + authenticated read/write. Tightening
-- can come later (project-membership gate) when the per-project ACL model
-- is finalised. Matches the existing ph_releases policy footprint.

ALTER TABLE public.ph_jira_sprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon read sprints"            ON public.ph_jira_sprints;
DROP POLICY IF EXISTS "Members can manage sprints"   ON public.ph_jira_sprints;
DROP POLICY IF EXISTS sprints_read_all               ON public.ph_jira_sprints;
DROP POLICY IF EXISTS sprints_write_all              ON public.ph_jira_sprints;

CREATE POLICY "Anon read sprints"
  ON public.ph_jira_sprints FOR SELECT TO anon USING (true);

CREATE POLICY sprints_read_all
  ON public.ph_jira_sprints FOR SELECT TO authenticated USING (true);

CREATE POLICY sprints_write_all
  ON public.ph_jira_sprints TO authenticated USING (true) WITH CHECK (true);

-- ─── Progress view (mirror of vw_ph_release_progress) ────────────────────
-- ph_issues.sprint_name (text) is the canonical sprint linkage (NOT
-- sprint_release, which despite its name is the fix-versions JSONB —
-- see 2026-06-24 fix_vw_ph_release_progress migration). Match sprint
-- by exact name + scope to sprint's project's key. status_category
-- values seen: 'todo'/'To Do'/'todo', 'in progress'/'in_progress',
-- 'done'/'Done', 'blocked' — lower() for case-insensitive match.

CREATE OR REPLACE VIEW public.vw_sprint_jira_progress
WITH (security_invoker = true) AS
WITH sprint_stats AS (
  SELECT
    i.sprint_name,
    i.project_key,
    COUNT(*)                                                                        AS total_items,
    COUNT(*) FILTER (WHERE lower(i.status_category) = 'done')                       AS done_items,
    COUNT(*) FILTER (WHERE lower(i.status_category) IN ('in progress','in_progress')) AS in_progress_items,
    COUNT(*) FILTER (WHERE lower(i.status_category) IN ('in review','in_review'))   AS in_review_items,
    COUNT(*) FILTER (WHERE lower(i.status_category) = 'blocked')                    AS blocked_items,
    COUNT(*) FILTER (WHERE lower(i.status_category) IN ('to do','todo','to_do'))    AS todo_items,
    COUNT(DISTINCT i.assignee_account_id) FILTER (WHERE i.assignee_account_id IS NOT NULL) AS unique_assignees
  FROM public.ph_issues i
  WHERE i.sprint_name IS NOT NULL AND i.sprint_name <> ''
  GROUP BY i.sprint_name, i.project_key
)
SELECT
  s.id                            AS sprint_id,
  s.id,
  s.project_id,
  s.name,
  s.title,
  s.description,
  s.status,
  s.start_date,
  s.target_date,
  s.actual_date,
  s.owner_user_id,
  s.color,
  COALESCE(st.total_items,       0) AS total_items,
  COALESCE(st.done_items,        0) AS done_items,
  COALESCE(st.in_progress_items, 0) AS in_progress_items,
  COALESCE(st.in_review_items,   0) AS in_review_items,
  COALESCE(st.blocked_items,     0) AS blocked_items,
  COALESCE(st.todo_items,        0) AS todo_items,
  CASE
    WHEN COALESCE(st.total_items, 0) > 0
      THEN ROUND( (COALESCE(st.done_items, 0)::numeric / st.total_items) * 100, 2 )
    ELSE 0
  END                              AS completion_percent,
  COALESCE(st.unique_assignees, 0) AS unique_assignees
FROM public.ph_jira_sprints s
LEFT JOIN public.ph_projects p ON p.id = s.project_id
LEFT JOIN sprint_stats st
  ON st.sprint_name = s.name
 AND (p.key IS NULL OR st.project_key = p.key);

GRANT SELECT ON public.vw_sprint_jira_progress TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
