--------------------------------------------------
-- JOB-147: VERSIONED ARTIFACTS + HARD IMMUTABILITY
-- STEP 1: DROP EXISTING TRIGGERS FIRST
--------------------------------------------------

-- Drop ALL existing immutability triggers to allow backfill
DROP TRIGGER IF EXISTS trg_ai_assist_artifacts_no_update ON public.ai_assist_artifacts;
DROP TRIGGER IF EXISTS trg_ai_assist_artifacts_no_delete ON public.ai_assist_artifacts;
DROP TRIGGER IF EXISTS trg_ai_assist_audit_no_update ON public.ai_assist_audit_events;
DROP TRIGGER IF EXISTS trg_ai_assist_audit_no_delete ON public.ai_assist_audit_events;
DROP TRIGGER IF EXISTS trg_artifacts_no_update ON public.ai_assist_artifacts;
DROP TRIGGER IF EXISTS trg_artifacts_no_delete ON public.ai_assist_artifacts;
DROP TRIGGER IF EXISTS trg_audit_no_update ON public.ai_assist_audit_events;
DROP TRIGGER IF EXISTS trg_audit_no_delete ON public.ai_assist_audit_events;

--------------------------------------------------
-- STEP 2: FORCE RLS
--------------------------------------------------
ALTER TABLE public.ai_assist_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assist_artifacts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assist_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assist_audit_events FORCE ROW LEVEL SECURITY;

--------------------------------------------------
-- STEP 3: ADD VERSIONING COLUMNS
--------------------------------------------------
ALTER TABLE public.ai_assist_artifacts
  ADD COLUMN IF NOT EXISTS draft_id uuid;

ALTER TABLE public.ai_assist_artifacts
  ADD COLUMN IF NOT EXISTS artifact_key text;

ALTER TABLE public.ai_assist_artifacts
  ADD COLUMN IF NOT EXISTS supersedes_artifact_id uuid REFERENCES public.ai_assist_artifacts(id);

ALTER TABLE public.ai_assist_artifacts
  ADD COLUMN IF NOT EXISTS is_latest boolean NOT NULL DEFAULT true;

--------------------------------------------------
-- STEP 4: BACKFILL (now allowed without triggers)
--------------------------------------------------
-- Backfill draft_id from runs
UPDATE public.ai_assist_artifacts a
SET draft_id = r.draft_id
FROM public.ai_assist_runs r
WHERE a.run_id = r.id
  AND a.draft_id IS NULL;

-- Backfill artifact_key from artifact_type
UPDATE public.ai_assist_artifacts
SET artifact_key = artifact_type
WHERE artifact_key IS NULL;

-- Backfill content_hash where missing
UPDATE public.ai_assist_artifacts
SET content_hash = md5(COALESCE(content_json::text,'') || COALESCE(content_html,''))
WHERE content_hash IS NULL;

-- Set is_latest correctly (highest version per draft_id + artifact_key)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY draft_id, artifact_key ORDER BY version DESC, created_at DESC) as rn
  FROM public.ai_assist_artifacts
  WHERE draft_id IS NOT NULL
)
UPDATE public.ai_assist_artifacts a
SET is_latest = (r.rn = 1)
FROM ranked r
WHERE a.id = r.id;

--------------------------------------------------
-- STEP 5: ADD CONSTRAINTS (after backfill)
--------------------------------------------------
-- Handle NULL draft_id rows (if any runs are missing)
DELETE FROM public.ai_assist_artifacts WHERE draft_id IS NULL;

ALTER TABLE public.ai_assist_artifacts
  ALTER COLUMN artifact_key SET NOT NULL;

-- Add FK only if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ai_artifacts_draft'
  ) THEN
    ALTER TABLE public.ai_assist_artifacts
      ADD CONSTRAINT fk_ai_artifacts_draft 
      FOREIGN KEY (draft_id) REFERENCES public.ai_assist_drafts(id);
  END IF;
END $$;

--------------------------------------------------
-- STEP 6: INDEXES
--------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ai_artifact_version
  ON public.ai_assist_artifacts (draft_id, artifact_key, version);

CREATE INDEX IF NOT EXISTS idx_ai_artifacts_latest_key
  ON public.ai_assist_artifacts (draft_id, artifact_key) WHERE is_latest = true;

--------------------------------------------------
-- STEP 7: VERSIONING TRIGGER (AUTO-FLIP is_latest)
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.ai_assist_set_latest_artifact()
RETURNS trigger AS $$
BEGIN
  -- Flip previous latest to false
  UPDATE public.ai_assist_artifacts
  SET is_latest = false
  WHERE draft_id = NEW.draft_id
    AND artifact_key = NEW.artifact_key
    AND is_latest = true
    AND id != NEW.id;

  -- Ensure new row is latest
  NEW.is_latest := true;
  
  -- Auto-populate draft_id from run if not provided
  IF NEW.draft_id IS NULL THEN
    SELECT r.draft_id INTO NEW.draft_id
    FROM public.ai_assist_runs r
    WHERE r.id = NEW.run_id;
  END IF;
  
  -- Auto-populate artifact_key if not provided
  IF NEW.artifact_key IS NULL THEN
    NEW.artifact_key := NEW.artifact_type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_ai_artifacts_set_latest ON public.ai_assist_artifacts;
CREATE TRIGGER trg_ai_artifacts_set_latest
BEFORE INSERT ON public.ai_assist_artifacts
FOR EACH ROW
EXECUTE FUNCTION public.ai_assist_set_latest_artifact();

--------------------------------------------------
-- STEP 8: IMMUTABILITY - ARTIFACTS (ALLOWS is_latest FLIP ONLY)
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.ai_assist_block_artifact_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- ALLOW: is_latest flip from true to false (versioning trigger only)
    IF OLD.is_latest = true AND NEW.is_latest = false
       AND OLD.run_id = NEW.run_id
       AND OLD.draft_id IS NOT DISTINCT FROM NEW.draft_id
       AND OLD.artifact_type = NEW.artifact_type
       AND OLD.artifact_key IS NOT DISTINCT FROM NEW.artifact_key
       AND OLD.version = NEW.version
       AND OLD.content_hash IS NOT DISTINCT FROM NEW.content_hash
    THEN
      RETURN NEW;
    END IF;
  END IF;
  
  RAISE EXCEPTION 'IMMUTABLE_TABLE: % cannot be %', TG_TABLE_NAME, TG_OP
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_artifacts_no_update
BEFORE UPDATE ON public.ai_assist_artifacts
FOR EACH ROW
EXECUTE FUNCTION public.ai_assist_block_artifact_mutation();

CREATE TRIGGER trg_artifacts_no_delete
BEFORE DELETE ON public.ai_assist_artifacts
FOR EACH ROW
EXECUTE FUNCTION public.ai_assist_block_artifact_mutation();

--------------------------------------------------
-- STEP 9: IMMUTABILITY - AUDIT EVENTS (ABSOLUTE)
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.ai_assist_block_audit_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'IMMUTABLE_TABLE: % cannot be %', TG_TABLE_NAME, TG_OP
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_audit_no_update
BEFORE UPDATE ON public.ai_assist_audit_events
FOR EACH ROW
EXECUTE FUNCTION public.ai_assist_block_audit_mutation();

CREATE TRIGGER trg_audit_no_delete
BEFORE DELETE ON public.ai_assist_audit_events
FOR EACH ROW
EXECUTE FUNCTION public.ai_assist_block_audit_mutation();

--------------------------------------------------
-- STEP 10: RLS POLICIES
--------------------------------------------------
DROP POLICY IF EXISTS "Users can view artifacts" ON public.ai_assist_artifacts;
DROP POLICY IF EXISTS "Users can create artifacts" ON public.ai_assist_artifacts;
DROP POLICY IF EXISTS "Block update on artifacts" ON public.ai_assist_artifacts;
DROP POLICY IF EXISTS "Block delete on artifacts" ON public.ai_assist_artifacts;
DROP POLICY IF EXISTS artifacts_select ON public.ai_assist_artifacts;
DROP POLICY IF EXISTS artifacts_insert ON public.ai_assist_artifacts;
DROP POLICY IF EXISTS artifacts_no_update ON public.ai_assist_artifacts;
DROP POLICY IF EXISTS artifacts_no_delete ON public.ai_assist_artifacts;

DROP POLICY IF EXISTS "Users can view audit events" ON public.ai_assist_audit_events;
DROP POLICY IF EXISTS "Users can create audit events" ON public.ai_assist_audit_events;
DROP POLICY IF EXISTS "Block update on audit events" ON public.ai_assist_audit_events;
DROP POLICY IF EXISTS "Block delete on audit events" ON public.ai_assist_audit_events;
DROP POLICY IF EXISTS audit_select ON public.ai_assist_audit_events;
DROP POLICY IF EXISTS audit_insert ON public.ai_assist_audit_events;
DROP POLICY IF EXISTS audit_no_update ON public.ai_assist_audit_events;
DROP POLICY IF EXISTS audit_no_delete ON public.ai_assist_audit_events;

CREATE POLICY ai_artifacts_select ON public.ai_assist_artifacts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY ai_artifacts_insert ON public.ai_assist_artifacts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY ai_audit_select ON public.ai_assist_audit_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY ai_audit_insert ON public.ai_assist_audit_events
  FOR INSERT TO authenticated WITH CHECK (true);