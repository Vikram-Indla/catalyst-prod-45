-- JOB-149: Enforce INSERT-ONLY artifacts with version-based latest computation
-- Remove is_latest maintenance, compute latest via ORDER BY version DESC

BEGIN;

-- ============================================================
-- 1. DROP is_latest dependence (index and column)
-- ============================================================

-- Drop the is_latest partial index (no longer useful)
DROP INDEX IF EXISTS idx_ai_artifacts_latest_key;

-- Drop is_latest column entirely
ALTER TABLE public.ai_assist_artifacts DROP COLUMN IF EXISTS is_latest;

-- ============================================================
-- 2. DROP obsolete triggers and functions
-- ============================================================

-- Drop any set_latest trigger (should not exist but be safe)
DROP TRIGGER IF EXISTS trg_ai_artifacts_set_latest ON public.ai_assist_artifacts;

-- Drop obsolete functions
DROP FUNCTION IF EXISTS public.ai_assist_set_latest_artifact();

-- Drop any existing immutability triggers to recreate clean
DROP TRIGGER IF EXISTS trg_ai_assist_artifacts_no_update ON public.ai_assist_artifacts;
DROP TRIGGER IF EXISTS trg_ai_assist_artifacts_no_delete ON public.ai_assist_artifacts;
DROP TRIGGER IF EXISTS trg_artifacts_no_update ON public.ai_assist_artifacts;
DROP TRIGGER IF EXISTS trg_artifacts_no_delete ON public.ai_assist_artifacts;

DROP TRIGGER IF EXISTS trg_ai_assist_audit_no_update ON public.ai_assist_audit_events;
DROP TRIGGER IF EXISTS trg_ai_assist_audit_no_delete ON public.ai_assist_audit_events;
DROP TRIGGER IF EXISTS trg_audit_no_update ON public.ai_assist_audit_events;
DROP TRIGGER IF EXISTS trg_audit_no_delete ON public.ai_assist_audit_events;

-- ============================================================
-- 3. CREATE versioning index for ORDER BY version DESC queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ai_artifacts_version_desc 
ON public.ai_assist_artifacts (draft_id, artifact_key, version DESC);

-- ============================================================
-- 4. ENABLE and FORCE RLS (service_role bypass prevention layer 1)
-- ============================================================

ALTER TABLE public.ai_assist_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assist_artifacts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.ai_assist_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assist_audit_events FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 5. CREATE unified immutability function (no exceptions)
-- ============================================================

CREATE OR REPLACE FUNCTION public.ai_assist_block_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'IMMUTABLE_TABLE: % cannot be %', TG_TABLE_NAME, TG_OP
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. ATTACH immutability triggers to ai_assist_artifacts
-- ============================================================

CREATE TRIGGER trg_ai_artifacts_immutable_update
BEFORE UPDATE ON public.ai_assist_artifacts
FOR EACH ROW
EXECUTE FUNCTION public.ai_assist_block_mutation();

CREATE TRIGGER trg_ai_artifacts_immutable_delete
BEFORE DELETE ON public.ai_assist_artifacts
FOR EACH ROW
EXECUTE FUNCTION public.ai_assist_block_mutation();

-- ============================================================
-- 7. ATTACH immutability triggers to ai_assist_audit_events
-- ============================================================

CREATE TRIGGER trg_ai_audit_immutable_update
BEFORE UPDATE ON public.ai_assist_audit_events
FOR EACH ROW
EXECUTE FUNCTION public.ai_assist_block_mutation();

CREATE TRIGGER trg_ai_audit_immutable_delete
BEFORE DELETE ON public.ai_assist_audit_events
FOR EACH ROW
EXECUTE FUNCTION public.ai_assist_block_mutation();

-- ============================================================
-- 8. RLS POLICIES (defense in depth for authenticated users)
-- ============================================================

-- Artifacts policies
DROP POLICY IF EXISTS ai_artifacts_select ON public.ai_assist_artifacts;
DROP POLICY IF EXISTS ai_artifacts_insert ON public.ai_assist_artifacts;
DROP POLICY IF EXISTS artifacts_select ON public.ai_assist_artifacts;
DROP POLICY IF EXISTS artifacts_insert ON public.ai_assist_artifacts;
DROP POLICY IF EXISTS artifacts_no_update ON public.ai_assist_artifacts;
DROP POLICY IF EXISTS artifacts_no_delete ON public.ai_assist_artifacts;

CREATE POLICY artifacts_select ON public.ai_assist_artifacts
FOR SELECT TO authenticated USING (true);

CREATE POLICY artifacts_insert ON public.ai_assist_artifacts
FOR INSERT TO authenticated WITH CHECK (true);

-- Audit events policies  
DROP POLICY IF EXISTS ai_audit_select ON public.ai_assist_audit_events;
DROP POLICY IF EXISTS ai_audit_insert ON public.ai_assist_audit_events;
DROP POLICY IF EXISTS audit_select ON public.ai_assist_audit_events;
DROP POLICY IF EXISTS audit_insert ON public.ai_assist_audit_events;
DROP POLICY IF EXISTS audit_no_update ON public.ai_assist_audit_events;
DROP POLICY IF EXISTS audit_no_delete ON public.ai_assist_audit_events;

CREATE POLICY audit_select ON public.ai_assist_audit_events
FOR SELECT TO authenticated USING (true);

CREATE POLICY audit_insert ON public.ai_assist_audit_events
FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 9. CLEANUP obsolete functions
-- ============================================================

DROP FUNCTION IF EXISTS public.ai_assist_block_artifact_mutation();
DROP FUNCTION IF EXISTS public.ai_assist_block_audit_mutation();

COMMIT;