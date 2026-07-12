-- ============================================================================
-- DOCINTEL — durable promotion recovery ledger
-- CAT-DOCINTEL-V2-20260709-001 · Slice 7
--
-- One row per generated artifact records only the work already created and
-- the remaining idempotent provenance/status operations. It is deliberately
-- project scoped: an artifact from another project can never be attached to a
-- member-visible recovery row.
-- ============================================================================

CREATE TABLE public.ai_promotion_recoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ph_projects(id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL REFERENCES public.ai_generated_artifacts(id) ON DELETE CASCADE,
  created_work_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  create_failures jsonb NOT NULL DEFAULT '[]'::jsonb,
  pending_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  artifact_status_pending boolean NOT NULL DEFAULT false,
  state text NOT NULL DEFAULT 'partial' CHECK (state IN ('partial', 'complete')),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_promotion_recoveries_artifact_unique UNIQUE (artifact_id),
  CONSTRAINT ai_promotion_recoveries_created_work_items_array
    CHECK (jsonb_typeof(created_work_items) = 'array'),
  CONSTRAINT ai_promotion_recoveries_create_failures_array
    CHECK (jsonb_typeof(create_failures) = 'array'),
  CONSTRAINT ai_promotion_recoveries_pending_links_array
    CHECK (jsonb_typeof(pending_links) = 'array'),
  CONSTRAINT ai_promotion_recoveries_complete_has_no_pending_work
    CHECK (
      state = 'partial'
      OR (
        artifact_status_pending = false
        AND jsonb_array_length(pending_links) = 0
      )
    )
);

COMMENT ON TABLE public.ai_promotion_recoveries IS
  'Durable, project-scoped recovery ledger for DocIntel artifact promotion. Stores existing work and only remaining idempotent status/link operations; it never queues work creation or deletion.';
COMMENT ON COLUMN public.ai_promotion_recoveries.created_work_items IS
  'JSON array of already-created work item snapshots: id, item_key, title, kind.';
COMMENT ON COLUMN public.ai_promotion_recoveries.create_failures IS
  'JSON array of user-visible work-creation failures. These are recorded, never retried by the provenance recovery path.';
COMMENT ON COLUMN public.ai_promotion_recoveries.pending_links IS
  'JSON array of pending provenance pairs: document_id, work_item_id, work_kind. Recovery retries only these idempotent links.';

CREATE INDEX idx_ai_promotion_recoveries_project_state
  ON public.ai_promotion_recoveries (project_id, state, updated_at DESC);

-- A foreign key on artifact_id protects existence. This trigger additionally
-- protects the artifact/project pairing, including privileged callers that
-- bypass RLS, without introducing a SECURITY DEFINER function.
CREATE OR REPLACE FUNCTION public.docintel_assert_promotion_recovery_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.ai_generated_artifacts artifact
    WHERE artifact.id = NEW.artifact_id
      AND artifact.project_id = NEW.project_id
  ) THEN
    RAISE EXCEPTION
      'ai_promotion_recoveries artifact_id % does not belong to project_id %',
      NEW.artifact_id,
      NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ai_promotion_recoveries_scope
  BEFORE INSERT OR UPDATE OF project_id, artifact_id
  ON public.ai_promotion_recoveries
  FOR EACH ROW EXECUTE FUNCTION public.docintel_assert_promotion_recovery_scope();

CREATE TRIGGER trg_ai_promotion_recoveries_touch
  BEFORE UPDATE ON public.ai_promotion_recoveries
  FOR EACH ROW EXECUTE FUNCTION public.docintel_touch_updated_at();

-- Same immutable audit posture as ai_generated_artifacts and document links.
-- The existing SECURITY DEFINER audit trigger is compatible: this ledger has
-- an `id` primary key and its before/after JSON is intentionally preserved.
CREATE TRIGGER trg_ai_promotion_recoveries_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_promotion_recoveries
  FOR EACH ROW EXECUTE FUNCTION public.docintel_audit();

ALTER TABLE public.ai_promotion_recoveries ENABLE ROW LEVEL SECURITY;

-- Supabase's current default ACL grants all table privileges to Data API
-- roles. Make this table's client surface explicit instead: a browser may
-- read/upsert/complete through RLS, while anon has no table privilege and no
-- delete path is exposed to authenticated users.
REVOKE ALL ON public.ai_promotion_recoveries FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_promotion_recoveries TO authenticated;

-- Mirror DocIntel's direct project-member pattern. The artifact/project match
-- is repeated in every policy so a client cannot write a recovery row for an
-- artifact that is merely guessable but belongs to another project.
CREATE POLICY ai_promotion_recoveries_select
  ON public.ai_promotion_recoveries
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id
      FROM public.ph_project_members
      WHERE user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1
      FROM public.ai_generated_artifacts artifact
      WHERE artifact.id = ai_promotion_recoveries.artifact_id
        AND artifact.project_id = ai_promotion_recoveries.project_id
    )
  );

CREATE POLICY ai_promotion_recoveries_insert
  ON public.ai_promotion_recoveries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT project_id
      FROM public.ph_project_members
      WHERE user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1
      FROM public.ai_generated_artifacts artifact
      WHERE artifact.id = ai_promotion_recoveries.artifact_id
        AND artifact.project_id = ai_promotion_recoveries.project_id
    )
  );

CREATE POLICY ai_promotion_recoveries_update
  ON public.ai_promotion_recoveries
  FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id
      FROM public.ph_project_members
      WHERE user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1
      FROM public.ai_generated_artifacts artifact
      WHERE artifact.id = ai_promotion_recoveries.artifact_id
        AND artifact.project_id = ai_promotion_recoveries.project_id
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT project_id
      FROM public.ph_project_members
      WHERE user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1
      FROM public.ai_generated_artifacts artifact
      WHERE artifact.id = ai_promotion_recoveries.artifact_id
        AND artifact.project_id = ai_promotion_recoveries.project_id
    )
  );
