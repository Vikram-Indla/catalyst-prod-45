
-- ============================================================
-- R360 AI CACHE ARCHITECTURE — Tables, Functions & Triggers
-- ============================================================

-- 1. r360_ai_cache — stores pre-computed AI intelligence
CREATE TABLE IF NOT EXISTS public.r360_ai_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_type TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  scope_label TEXT,
  section TEXT NOT NULL,
  week_start DATE,
  data JSONB NOT NULL,
  data_hash TEXT,
  status TEXT NOT NULL DEFAULT 'fresh',
  is_stale BOOLEAN DEFAULT FALSE,
  stale_reason TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stale_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scope_type, scope_id, section, week_start)
);

CREATE INDEX IF NOT EXISTS idx_r360_cache_scope ON public.r360_ai_cache(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_r360_cache_section ON public.r360_ai_cache(scope_type, scope_id, section);
CREATE INDEX IF NOT EXISTS idx_r360_cache_stale ON public.r360_ai_cache(status) WHERE status = 'stale';
CREATE INDEX IF NOT EXISTS idx_r360_cache_week ON public.r360_ai_cache(scope_type, scope_id, section, week_start);

-- 2. r360_ai_jobs — job queue for background recomputation
CREATE TABLE IF NOT EXISTS public.r360_ai_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_type TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  sections TEXT[] NOT NULL,
  week_start DATE,
  status TEXT NOT NULL DEFAULT 'queued',
  priority INT DEFAULT 5,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  error_message TEXT,
  triggered_by TEXT,
  trigger_detail JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_r360_jobs_queue ON public.r360_ai_jobs(status, priority, created_at) WHERE status = 'queued';

-- 3. r360_ai_resource_index — pre-built index for batch warming
CREATE TABLE IF NOT EXISTS public.r360_ai_resource_index (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id TEXT NOT NULL UNIQUE,
  resource_name TEXT,
  role_name TEXT,
  department TEXT NOT NULL,
  has_issues BOOLEAN DEFAULT FALSE,
  issue_count INT DEFAULT 0,
  last_transition_at TIMESTAMPTZ,
  cache_status TEXT DEFAULT 'none',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_r360_resource_dept ON public.r360_ai_resource_index(department);
CREATE INDEX IF NOT EXISTS idx_r360_resource_stale ON public.r360_ai_resource_index(cache_status) WHERE cache_status IN ('none', 'stale');

-- 4. Enable RLS (service role will bypass, but we need policies for anon/authenticated)
ALTER TABLE public.r360_ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.r360_ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.r360_ai_resource_index ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated users on cache and index
CREATE POLICY "Authenticated users can read AI cache"
  ON public.r360_ai_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read AI resource index"
  ON public.r360_ai_resource_index FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read AI jobs"
  ON public.r360_ai_jobs FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert jobs (manual refresh)
CREATE POLICY "Authenticated users can insert AI jobs"
  ON public.r360_ai_jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can mark cache stale (manual refresh)
CREATE POLICY "Authenticated users can update AI cache status"
  ON public.r360_ai_cache FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role handles all writes via edge functions (bypasses RLS)

-- 5. Helper function: Mark resource cache stale
CREATE OR REPLACE FUNCTION public.r360_mark_resource_stale(
  p_resource_id TEXT,
  p_reason TEXT DEFAULT 'unknown'
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.r360_ai_cache
  SET status = 'stale',
      is_stale = TRUE,
      stale_at = NOW(),
      stale_reason = p_reason,
      updated_at = NOW()
  WHERE scope_type = 'resource'
    AND scope_id = p_resource_id
    AND status = 'fresh';

  UPDATE public.r360_ai_resource_index
  SET cache_status = 'stale', updated_at = NOW()
  WHERE resource_id = p_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Helper function: Mark department cache stale
CREATE OR REPLACE FUNCTION public.r360_mark_department_stale(
  p_department TEXT,
  p_reason TEXT DEFAULT 'unknown'
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.r360_ai_cache
  SET status = 'stale',
      is_stale = TRUE,
      stale_at = NOW(),
      stale_reason = p_reason,
      updated_at = NOW()
  WHERE scope_type = 'department'
    AND scope_id = p_department
    AND status = 'fresh';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Trigger function: Detect significant changes on ph_issues
CREATE OR REPLACE FUNCTION public.r360_detect_significant_change()
RETURNS TRIGGER AS $$
DECLARE
  v_resource_id TEXT;
  v_department TEXT;
  v_is_significant BOOLEAN := FALSE;
  v_reason TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_resource_id := NEW.assignee_id;
    v_is_significant := TRUE;
    v_reason := 'new_issue_assigned';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_is_significant := TRUE;
      v_reason := 'status_changed:' || COALESCE(OLD.status,'null') || '->' || NEW.status;
      v_resource_id := NEW.assignee_id;
    END IF;
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      v_is_significant := TRUE;
      v_reason := 'reassigned';
      IF OLD.assignee_id IS NOT NULL THEN
        PERFORM public.r360_mark_resource_stale(OLD.assignee_id, 'reassigned_away');
      END IF;
      v_resource_id := NEW.assignee_id;
    END IF;
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_is_significant := TRUE;
      v_reason := 'soft_deleted';
      v_resource_id := NEW.assignee_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_resource_id := OLD.assignee_id;
    v_is_significant := TRUE;
    v_reason := 'hard_deleted';
  END IF;

  IF v_is_significant AND v_resource_id IS NOT NULL THEN
    SELECT department INTO v_department
    FROM public.resource_inventory
    WHERE id::text = v_resource_id
    LIMIT 1;

    PERFORM public.r360_mark_resource_stale(v_resource_id, v_reason);

    IF v_department IS NOT NULL THEN
      PERFORM public.r360_mark_department_stale(v_department, v_reason);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Attach trigger to ph_issues
DROP TRIGGER IF EXISTS trg_r360_issue_change ON public.ph_issues;
CREATE TRIGGER trg_r360_issue_change
  AFTER INSERT OR UPDATE OR DELETE ON public.ph_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.r360_detect_significant_change();
