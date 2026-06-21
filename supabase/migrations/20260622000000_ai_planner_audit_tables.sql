-- AI Planner audit tables
-- Tracks Work Item Planner runs and each item created via the wizard.
-- Used by workItemPlannerService.ts for write-through audit.

-- ─── ai_agent_runs ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_agent_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type      text NOT NULL
                  CHECK (run_type IN (
                    'epic_generation',
                    'story_generation',
                    'subtask_generation',
                    'full_planner'
                  )),
  triggered_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  br_id         text,
  parent_key    text,
  project_key   text,
  status        text NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running', 'completed', 'failed')),
  proposals_count integer NOT NULL DEFAULT 0,
  created_count   integer NOT NULL DEFAULT 0,
  error         text,
  metadata      jsonb DEFAULT '{}'::jsonb,
  started_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);

ALTER TABLE public.ai_agent_runs ENABLE ROW LEVEL SECURITY;

-- Users see their own runs; admins see all
CREATE POLICY "ai_agent_runs_select" ON public.ai_agent_runs
  FOR SELECT TO authenticated
  USING (
    triggered_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

CREATE POLICY "ai_agent_runs_insert" ON public.ai_agent_runs
  FOR INSERT TO authenticated
  WITH CHECK (triggered_by = auth.uid());

CREATE POLICY "ai_agent_runs_update" ON public.ai_agent_runs
  FOR UPDATE TO authenticated
  USING (triggered_by = auth.uid())
  WITH CHECK (triggered_by = auth.uid());

-- ─── ai_generated_work_items ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_generated_work_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        uuid NOT NULL REFERENCES public.ai_agent_runs(id) ON DELETE CASCADE,
  issue_key     text NOT NULL,
  issue_type    text NOT NULL,
  parent_key    text,
  summary       text NOT NULL,
  assignee_id   uuid,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_generated_work_items_run_id ON public.ai_generated_work_items(run_id);
CREATE INDEX idx_ai_generated_work_items_issue_key ON public.ai_generated_work_items(issue_key);

ALTER TABLE public.ai_generated_work_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_generated_work_items_select" ON public.ai_generated_work_items
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.ai_agent_runs r
      WHERE r.id = ai_generated_work_items.run_id
        AND r.triggered_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

CREATE POLICY "ai_generated_work_items_insert" ON public.ai_generated_work_items
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
