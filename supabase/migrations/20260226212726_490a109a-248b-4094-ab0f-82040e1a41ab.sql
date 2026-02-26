
-- ══════════════════════════════════════════════════════════════
-- JIRA SYNC GUARDRAIL: Append-only baseline with delta sync
-- ══════════════════════════════════════════════════════════════

-- 1. Add guardrail columns to ph_issues
ALTER TABLE public.ph_issues 
  ADD COLUMN IF NOT EXISTS first_synced_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS jira_removed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS baseline_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS sync_hash text DEFAULT NULL;

-- 2. Add guardrail columns to ph_work_items  
ALTER TABLE public.ph_work_items
  ADD COLUMN IF NOT EXISTS first_synced_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS jira_removed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS baseline_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS sync_hash text DEFAULT NULL;

-- 3. Enhance ph_jira_sync_log with missing fields
ALTER TABLE public.ph_jira_sync_log
  ADD COLUMN IF NOT EXISTS sync_mode text DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS project_keys text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS items_deleted_soft integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_items_in_baseline integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS baseline_snapshot_date date DEFAULT CURRENT_DATE;

-- 4. BEFORE DELETE trigger on ph_issues — blocks physical deletes
CREATE OR REPLACE FUNCTION public.guard_ph_issues_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.force_jira_cleanup', true) = 'true' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'GUARDRAIL: Physical deletion of ph_issues is blocked. Use jira_removed_at soft-delete. Set app.force_jira_cleanup=true to override.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_guard_ph_issues_no_delete ON public.ph_issues;
CREATE TRIGGER trg_guard_ph_issues_no_delete
  BEFORE DELETE ON public.ph_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_ph_issues_no_delete();

-- 5. BEFORE DELETE trigger on ph_work_items
CREATE OR REPLACE FUNCTION public.guard_ph_work_items_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.force_jira_cleanup', true) = 'true' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'GUARDRAIL: Physical deletion of ph_work_items is blocked. Use jira_removed_at soft-delete. Set app.force_jira_cleanup=true to override.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_guard_ph_work_items_no_delete ON public.ph_work_items;
CREATE TRIGGER trg_guard_ph_work_items_no_delete
  BEFORE DELETE ON public.ph_work_items
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_ph_work_items_no_delete();

-- 6. Indexes for delta queries
CREATE INDEX IF NOT EXISTS idx_ph_issues_last_synced ON public.ph_issues (last_synced_at);
CREATE INDEX IF NOT EXISTS idx_ph_issues_jira_removed ON public.ph_issues (jira_removed_at) WHERE jira_removed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ph_work_items_last_synced ON public.ph_work_items (last_synced_at);
CREATE INDEX IF NOT EXISTS idx_ph_work_items_jira_removed ON public.ph_work_items (jira_removed_at) WHERE jira_removed_at IS NOT NULL;
