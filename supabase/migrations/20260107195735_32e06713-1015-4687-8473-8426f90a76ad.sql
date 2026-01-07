-- 1) Ensure RLS enabled
ALTER TABLE public.ai_assist_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assist_artifacts ENABLE ROW LEVEL SECURITY;

-- 2) Force RLS (prevents table owner bypass)
ALTER TABLE public.ai_assist_audit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assist_artifacts FORCE ROW LEVEL SECURITY;

-- 3) RLS policies (defense-in-depth; still valuable for anon/auth roles)
DO $$
BEGIN
  -- audit_events
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ai_assist_audit_events' AND policyname='audit_select'
  ) THEN
    CREATE POLICY audit_select ON public.ai_assist_audit_events
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ai_assist_audit_events' AND policyname='audit_insert'
  ) THEN
    CREATE POLICY audit_insert ON public.ai_assist_audit_events
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;

  -- Deny update/delete for authenticated explicitly
  DROP POLICY IF EXISTS audit_no_update ON public.ai_assist_audit_events;
  CREATE POLICY audit_no_update ON public.ai_assist_audit_events
    FOR UPDATE TO authenticated
    USING (false) WITH CHECK (false);

  DROP POLICY IF EXISTS audit_no_delete ON public.ai_assist_audit_events;
  CREATE POLICY audit_no_delete ON public.ai_assist_audit_events
    FOR DELETE TO authenticated
    USING (false);

  -- artifacts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ai_assist_artifacts' AND policyname='artifacts_select'
  ) THEN
    CREATE POLICY artifacts_select ON public.ai_assist_artifacts
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ai_assist_artifacts' AND policyname='artifacts_insert'
  ) THEN
    CREATE POLICY artifacts_insert ON public.ai_assist_artifacts
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;

  DROP POLICY IF EXISTS artifacts_no_update ON public.ai_assist_artifacts;
  CREATE POLICY artifacts_no_update ON public.ai_assist_artifacts
    FOR UPDATE TO authenticated
    USING (false) WITH CHECK (false);

  DROP POLICY IF EXISTS artifacts_no_delete ON public.ai_assist_artifacts;
  CREATE POLICY artifacts_no_delete ON public.ai_assist_artifacts
    FOR DELETE TO authenticated
    USING (false);
END $$;

-- 4) HARD IMMUTABILITY via triggers (blocks even service_role)
CREATE OR REPLACE FUNCTION public.ai_assist_block_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'IMMUTABLE_TABLE: % cannot be %', TG_TABLE_NAME, TG_OP
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- audit_events triggers
DROP TRIGGER IF EXISTS trg_ai_assist_audit_no_update ON public.ai_assist_audit_events;
CREATE TRIGGER trg_ai_assist_audit_no_update
BEFORE UPDATE ON public.ai_assist_audit_events
FOR EACH ROW EXECUTE FUNCTION public.ai_assist_block_mutation();

DROP TRIGGER IF EXISTS trg_ai_assist_audit_no_delete ON public.ai_assist_audit_events;
CREATE TRIGGER trg_ai_assist_audit_no_delete
BEFORE DELETE ON public.ai_assist_audit_events
FOR EACH ROW EXECUTE FUNCTION public.ai_assist_block_mutation();

-- artifacts triggers
DROP TRIGGER IF EXISTS trg_ai_assist_artifacts_no_update ON public.ai_assist_artifacts;
CREATE TRIGGER trg_ai_assist_artifacts_no_update
BEFORE UPDATE ON public.ai_assist_artifacts
FOR EACH ROW EXECUTE FUNCTION public.ai_assist_block_mutation();

DROP TRIGGER IF EXISTS trg_ai_assist_artifacts_no_delete ON public.ai_assist_artifacts;
CREATE TRIGGER trg_ai_assist_artifacts_no_delete
BEFORE DELETE ON public.ai_assist_artifacts
FOR EACH ROW EXECUTE FUNCTION public.ai_assist_block_mutation();