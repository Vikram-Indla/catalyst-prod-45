-- ============================================================
-- JOB-152: Ministry-Grade Governance for AI Assist
-- ============================================================

-- A1) Add governance fields to ai_assist_drafts
ALTER TABLE public.ai_assist_drafts
ADD COLUMN IF NOT EXISTS approver_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'not_required',
ADD COLUMN IF NOT EXISTS approval_reason_json jsonb NULL,
ADD COLUMN IF NOT EXISTS exemptions_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS open_questions_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS manual_text_used boolean NOT NULL DEFAULT false;

-- Set existing quality_mode to 'pass' if null (existing column from prior migration)
UPDATE public.ai_assist_drafts 
SET quality_mode = 'pass' 
WHERE quality_mode IS NULL;

-- A2) Add run fingerprinting to ai_assist_runs
ALTER TABLE public.ai_assist_runs
ADD COLUMN IF NOT EXISTS run_fingerprint_sha256 text NULL,
ADD COLUMN IF NOT EXISTS system_instructions_hash text NULL,
ADD COLUMN IF NOT EXISTS extraction_version text NULL,
ADD COLUMN IF NOT EXISTS compliance_catalog_version text NULL,
ADD COLUMN IF NOT EXISTS deterministic_reuse_of_run_id uuid REFERENCES public.ai_assist_runs(id) ON DELETE SET NULL;

-- A3) Add source mapping to ai_assist_artifacts
ALTER TABLE public.ai_assist_artifacts
ADD COLUMN IF NOT EXISTS source_map_json jsonb NULL,
ADD COLUMN IF NOT EXISTS run_fingerprint_sha256 text NULL;

-- A4) Create ai_assist_exemptions table
CREATE TABLE IF NOT EXISTS public.ai_assist_exemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES public.ai_assist_drafts(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.ai_assist_runs(id) ON DELETE SET NULL,
  exemption_type text NOT NULL,
  page_from integer NULL,
  page_to integer NULL,
  description_en text NOT NULL,
  description_ar text NULL,
  impact_en text NULL,
  impact_ar text NULL,
  mitigation_en text NULL,
  mitigation_ar text NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add constraint for exemption types
ALTER TABLE public.ai_assist_exemptions 
DROP CONSTRAINT IF EXISTS chk_exemption_type;

ALTER TABLE public.ai_assist_exemptions 
ADD CONSTRAINT chk_exemption_type CHECK (
  exemption_type IN (
    'OCR_UNREADABLE', 
    'LOW_CONFIDENCE', 
    'MISSING_PAGE', 
    'MANUAL_FALLBACK_USED',
    'COMPLIANCE_INCONCLUSIVE',
    'UNANSWERED_QUESTIONS'
  )
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_exemptions_draft_id ON public.ai_assist_exemptions(draft_id);
CREATE INDEX IF NOT EXISTS idx_exemptions_run_id ON public.ai_assist_exemptions(run_id);

-- A5) Create ai_assist_approvals table
CREATE TABLE IF NOT EXISTS public.ai_assist_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES public.ai_assist_drafts(id) ON DELETE CASCADE,
  approver_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  comment text NULL,
  reason_json jsonb NULL,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz NULL
);

-- Add constraint for approval status
ALTER TABLE public.ai_assist_approvals 
DROP CONSTRAINT IF EXISTS chk_approval_status;

ALTER TABLE public.ai_assist_approvals 
ADD CONSTRAINT chk_approval_status CHECK (
  status IN ('pending', 'approved', 'rejected')
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_approvals_draft_id ON public.ai_assist_approvals(draft_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver ON public.ai_assist_approvals(approver_user_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.ai_assist_approvals(status);

-- A6) Enable RLS on new tables
ALTER TABLE public.ai_assist_exemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assist_approvals ENABLE ROW LEVEL SECURITY;

-- RLS policies for exemptions (readable by all authenticated, writable by creator)
CREATE POLICY "Exemptions are readable by authenticated users"
ON public.ai_assist_exemptions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Exemptions can be created by authenticated users"
ON public.ai_assist_exemptions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS policies for approvals (readable by all authenticated, writable by approver)
CREATE POLICY "Approvals are readable by authenticated users"
ON public.ai_assist_approvals
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Approvals can be created by authenticated users"
ON public.ai_assist_approvals
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Approvals can be updated by approver"
ON public.ai_assist_approvals
FOR UPDATE
TO authenticated
USING (approver_user_id = auth.uid());

-- A7) Immutability trigger for artifacts (append-only)
CREATE OR REPLACE FUNCTION public.prevent_artifact_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'ai_assist_artifacts is append-only. Updates are not allowed.';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ai_assist_artifacts is append-only. Deletes are not allowed.';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop existing trigger if present (so we can recreate)
DROP TRIGGER IF EXISTS trg_artifact_immutability ON public.ai_assist_artifacts;

-- Create the immutability trigger
CREATE TRIGGER trg_artifact_immutability
BEFORE UPDATE OR DELETE ON public.ai_assist_artifacts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_artifact_modification();

-- A8) Function to sync exemptions_count on draft
CREATE OR REPLACE FUNCTION public.sync_draft_exemptions_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ai_assist_drafts
    SET exemptions_count = (
      SELECT COUNT(*) FROM public.ai_assist_exemptions WHERE draft_id = NEW.draft_id
    )
    WHERE id = NEW.draft_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ai_assist_drafts
    SET exemptions_count = (
      SELECT COUNT(*) FROM public.ai_assist_exemptions WHERE draft_id = OLD.draft_id
    )
    WHERE id = OLD.draft_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_exemptions_count ON public.ai_assist_exemptions;

CREATE TRIGGER trg_sync_exemptions_count
AFTER INSERT OR DELETE ON public.ai_assist_exemptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_draft_exemptions_count();

-- A9) Function to update approval_status on draft when approval changes
CREATE OR REPLACE FUNCTION public.sync_draft_approval_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.ai_assist_drafts
    SET approval_status = NEW.status,
        approver_user_id = NEW.approver_user_id
    WHERE id = NEW.draft_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_approval_status ON public.ai_assist_approvals;

CREATE TRIGGER trg_sync_approval_status
AFTER INSERT OR UPDATE ON public.ai_assist_approvals
FOR EACH ROW
EXECUTE FUNCTION public.sync_draft_approval_status();

-- Add comments for documentation
COMMENT ON TABLE public.ai_assist_exemptions IS 'Records exemptions/exceptions for AI Assist drafts (OCR issues, manual fallback, etc.)';
COMMENT ON TABLE public.ai_assist_approvals IS 'Approval workflow records for AI Assist drafts in QUALITY-WARN mode';
COMMENT ON COLUMN public.ai_assist_drafts.approval_status IS 'not_required | pending | approved | rejected';
COMMENT ON COLUMN public.ai_assist_drafts.quality_mode IS 'pass | warn | block - computed from exemptions and extraction status';
COMMENT ON COLUMN public.ai_assist_runs.run_fingerprint_sha256 IS 'Hash of inputs for deterministic reuse detection';