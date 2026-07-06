-- CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Slice B2: folder system model
-- Repository roots + system folders (Functional/UAT/Regression/Incident/Defect),
-- folder taxonomy, depth cap. Additive only.

-- 1) Taxonomy columns
ALTER TABLE public.tm_folders
  ADD COLUMN IF NOT EXISTS folder_type text NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

ALTER TABLE public.tm_folders
  DROP CONSTRAINT IF EXISTS tm_folders_folder_type_check;
ALTER TABLE public.tm_folders
  ADD CONSTRAINT tm_folders_folder_type_check
  CHECK (folder_type IN ('project_root', 'product_root', 'system', 'custom'));

-- 2) Depth cap (V2: custom folders to 6-7 levels). NOT VALID so pre-existing
-- deeper rows don't block the migration; new writes are enforced immediately.
ALTER TABLE public.tm_folders
  DROP CONSTRAINT IF EXISTS tm_folders_depth_max_check;
ALTER TABLE public.tm_folders
  ADD CONSTRAINT tm_folders_depth_max_check CHECK (depth <= 7) NOT VALID;

-- 3) System folders cannot collide per project/parent
CREATE UNIQUE INDEX IF NOT EXISTS tm_folders_system_unique
  ON public.tm_folders (project_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name)
  WHERE is_system = true;

-- 4) ltree-safe label helper (path labels allow [A-Za-z0-9_] only)
CREATE OR REPLACE FUNCTION public.tm_ltree_label(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9_]+', '_', 'g'), ''),
    'folder'
  );
$$;

-- 5) Idempotent provisioning: project root (named after project, rename blocked
-- in UI) + five system children. product_root type reserved for product-scoped
-- repositories (no tm product registry yet).
CREATE OR REPLACE FUNCTION public.tm_provision_system_folders(p_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_name text;
  v_root_id uuid;
  v_root_label text;
  v_sys_name text;
BEGIN
  SELECT name INTO v_project_name FROM public.tm_projects WHERE id = p_project_id;
  IF v_project_name IS NULL THEN
    RAISE EXCEPTION 'tm_provision_system_folders: unknown project %', p_project_id;
  END IF;

  v_root_label := public.tm_ltree_label(v_project_name);

  SELECT id INTO v_root_id
  FROM public.tm_folders
  WHERE project_id = p_project_id AND folder_type = 'project_root';

  IF v_root_id IS NULL THEN
    INSERT INTO public.tm_folders
      (project_id, name, parent_id, path, depth, sort_order, folder_type, is_system, icon)
    VALUES
      (p_project_id, v_project_name, NULL, v_root_label::ltree, 0, 0, 'project_root', true, 'folder')
    RETURNING id INTO v_root_id;
  END IF;

  FOR v_sys_name IN SELECT unnest(ARRAY['Functional', 'UAT', 'Regression', 'Incident', 'Defect'])
  LOOP
    INSERT INTO public.tm_folders
      (project_id, name, parent_id, path, depth, sort_order, folder_type, is_system, icon)
    SELECT
      p_project_id, v_sys_name, v_root_id,
      (v_root_label || '.' || public.tm_ltree_label(v_sys_name))::ltree,
      1,
      array_position(ARRAY['Functional', 'UAT', 'Regression', 'Incident', 'Defect'], v_sys_name),
      'system', true, 'folder'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tm_folders
      WHERE project_id = p_project_id
        AND parent_id = v_root_id
        AND name = v_sys_name
        AND is_system = true
    );
  END LOOP;

  RETURN v_root_id;
END;
$$;

-- 6) Auto-provision on new TestHub projects
CREATE OR REPLACE FUNCTION public.tm_trigger_provision_system_folders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.tm_provision_system_folders(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tm_projects_provision_system_folders ON public.tm_projects;
CREATE TRIGGER tm_projects_provision_system_folders
  AFTER INSERT ON public.tm_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.tm_trigger_provision_system_folders();

-- 7) Backfill: provision roots/system folders for existing active projects
DO $$
DECLARE
  v_id uuid;
BEGIN
  FOR v_id IN SELECT id FROM public.tm_projects WHERE is_active IS DISTINCT FROM false
  LOOP
    PERFORM public.tm_provision_system_folders(v_id);
  END LOOP;
END;
$$;
