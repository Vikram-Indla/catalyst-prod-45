-- CAT-WORKFLOW-STUDIO-20260702-001 / P3.3 — ph_issues consumes the type registry
--
-- Replaces the hardcoded 12-string CHECK on ph_issues.issue_type with the
-- governed ph_work_item_types registry:
--   * CHECK dropped defensively (name drifted across envs — scan pg_constraint)
--   * type_id uuid FK added NOT VALID, backfilled by display_name, validated
--   * BEFORE trigger resolves issue_type -> type_id on every write:
--       - Jira-sourced unknown types AUTO-REGISTER (sync can never fail on a
--         renamed/new Jira type; the row appears in the Studio for styling)
--       - native (catalyst) writes with an unregistered type RAISE — the
--         registry now provides the governance the CHECK used to
-- issue_type text stays forever (20+ views filter on the literals).

-- 1. Drop whatever issue_type CHECK this environment carries.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.ph_issues'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%issue_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.ph_issues DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- 2. type_id column + NOT VALID FK (no long lock on add).
ALTER TABLE public.ph_issues ADD COLUMN IF NOT EXISTS type_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ph_issues_type_id_fkey') THEN
    ALTER TABLE public.ph_issues
      ADD CONSTRAINT ph_issues_type_id_fkey
      FOREIGN KEY (type_id) REFERENCES public.ph_work_item_types(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS ph_issues_type_id_idx ON public.ph_issues (type_id);

-- 3. Resolver trigger. SECURITY DEFINER so the auto-register insert clears
--    the registry's RPC-only RLS (function is narrow: one lookup, one insert).
CREATE OR REPLACE FUNCTION public.ph_issues_resolve_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type_id uuid;
  v_key text;
BEGIN
  IF NEW.issue_type IS NULL THEN
    NEW.type_id := NULL;
    RETURN NEW;
  END IF;

  SELECT id INTO v_type_id
  FROM public.ph_work_item_types
  WHERE org_id IS NULL
    AND archived_at IS NULL
    AND lower(display_name) = lower(NEW.issue_type)
  LIMIT 1;

  IF v_type_id IS NULL THEN
    IF COALESCE(NEW.source, '') LIKE 'jira%' THEN
      v_key := regexp_replace(lower(trim(NEW.issue_type)), '[^a-z0-9]+', '_', 'g');
      v_key := trim(BOTH '_' FROM v_key);
      BEGIN
        INSERT INTO public.ph_work_item_types
          (org_id, type_key, display_name, icon, kind, group_key, is_system, description)
        VALUES
          (NULL, v_key, NEW.issue_type, 'task', 'standard', 'standard', false,
           'Auto-registered from Jira sync')
        RETURNING id INTO v_type_id;
      EXCEPTION WHEN unique_violation THEN
        SELECT id INTO v_type_id
        FROM public.ph_work_item_types
        WHERE org_id IS NULL AND archived_at IS NULL
          AND (lower(type_key) = v_key OR lower(display_name) = lower(NEW.issue_type))
        LIMIT 1;
      END;
    ELSE
      RAISE EXCEPTION 'ph_issues: work item type "%" is not registered — add it in Workflow Studio → Work item types',
        NEW.issue_type
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  NEW.type_id := v_type_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ph_issues_resolve_type ON public.ph_issues;
CREATE TRIGGER ph_issues_resolve_type
  BEFORE INSERT OR UPDATE OF issue_type ON public.ph_issues
  FOR EACH ROW EXECUTE FUNCTION public.ph_issues_resolve_type();

-- 4. Backfill in batches, then validate the FK.
DO $$
DECLARE v_batch integer;
BEGIN
  LOOP
    WITH batch AS (
      SELECT i.id, t.id AS tid
      FROM public.ph_issues i
      JOIN public.ph_work_item_types t
        ON t.org_id IS NULL AND t.archived_at IS NULL
       AND lower(t.display_name) = lower(i.issue_type)
      WHERE i.type_id IS NULL AND i.issue_type IS NOT NULL
      LIMIT 5000
    )
    UPDATE public.ph_issues i SET type_id = batch.tid
    FROM batch WHERE i.id = batch.id;
    GET DIAGNOSTICS v_batch = ROW_COUNT;
    EXIT WHEN v_batch = 0;
  END LOOP;
END $$;

ALTER TABLE public.ph_issues VALIDATE CONSTRAINT ph_issues_type_id_fkey;
