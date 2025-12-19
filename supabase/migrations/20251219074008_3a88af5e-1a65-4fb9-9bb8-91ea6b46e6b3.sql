-- ============================================================================
-- DEPENDENCY FRAMEWORK REFACTOR: Work Item Centric Model
-- ============================================================================

-- 1. Create new enum for dependency level (replaces team/program/external)
DO $$ BEGIN
  CREATE TYPE dependency_level_v2 AS ENUM ('execution', 'delivery', 'cross_level');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Expand dependency type enum to include new semantic types
DO $$ BEGIN
  ALTER TYPE dependency_type ADD VALUE IF NOT EXISTS 'blocks';
  ALTER TYPE dependency_type ADD VALUE IF NOT EXISTS 'is_blocked_by';
  ALTER TYPE dependency_type ADD VALUE IF NOT EXISTS 'enables';
  ALTER TYPE dependency_type ADD VALUE IF NOT EXISTS 'provides_input';
  ALTER TYPE dependency_type ADD VALUE IF NOT EXISTS 'approves';
  ALTER TYPE dependency_type ADD VALUE IF NOT EXISTS 'governs';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create work_item_type enum if not exists
DO $$ BEGIN
  CREATE TYPE work_item_dependency_type AS ENUM ('epic', 'feature');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Add new columns to dependencies table for work-item-centric model
ALTER TABLE public.dependencies
  ADD COLUMN IF NOT EXISTS requesting_work_item_id UUID,
  ADD COLUMN IF NOT EXISTS requesting_work_item_type work_item_dependency_type,
  ADD COLUMN IF NOT EXISTS depends_on_work_item_id UUID,
  ADD COLUMN IF NOT EXISTS depends_on_work_item_type work_item_dependency_type,
  ADD COLUMN IF NOT EXISTS dependency_level_v2 dependency_level_v2,
  ADD COLUMN IF NOT EXISTS is_cross_level_exception BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_blocked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS source_blocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_blocked_by UUID,
  ADD COLUMN IF NOT EXISTS target_delayed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS target_delayed_reason TEXT,
  ADD COLUMN IF NOT EXISTS target_delayed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS target_delayed_by UUID,
  ADD COLUMN IF NOT EXISTS requestor_owner_id UUID,
  ADD COLUMN IF NOT EXISTS respondent_owner_id UUID,
  ADD COLUMN IF NOT EXISTS derived_requesting_container_type TEXT,
  ADD COLUMN IF NOT EXISTS derived_requesting_container_id UUID,
  ADD COLUMN IF NOT EXISTS derived_respondent_container_type TEXT,
  ADD COLUMN IF NOT EXISTS derived_respondent_container_id UUID,
  ADD COLUMN IF NOT EXISTS quarter_derived_from_date BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS container_uses_sprints BOOLEAN DEFAULT FALSE;

-- 5. Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_dependencies_requesting_work_item 
  ON public.dependencies (requesting_work_item_type, requesting_work_item_id);

CREATE INDEX IF NOT EXISTS idx_dependencies_depends_on_work_item 
  ON public.dependencies (depends_on_work_item_type, depends_on_work_item_id);

CREATE INDEX IF NOT EXISTS idx_dependencies_dependency_level_v2 
  ON public.dependencies (dependency_level_v2);

CREATE INDEX IF NOT EXISTS idx_dependencies_requestor_owner 
  ON public.dependencies (requestor_owner_id);

CREATE INDEX IF NOT EXISTS idx_dependencies_respondent_owner 
  ON public.dependencies (respondent_owner_id);

-- 6. Create function to derive container from work item
CREATE OR REPLACE FUNCTION public.derive_dependency_container(
  p_work_item_type work_item_dependency_type,
  p_work_item_id UUID
) RETURNS TABLE(container_type TEXT, container_id UUID) AS $$
BEGIN
  IF p_work_item_type = 'epic' THEN
    -- Epic belongs to a Program
    RETURN QUERY
    SELECT 'program'::TEXT, e.program_id
    FROM public.epics e
    WHERE e.id = p_work_item_id;
  ELSIF p_work_item_type = 'feature' THEN
    -- Feature belongs to a Project
    RETURN QUERY
    SELECT 'project'::TEXT, f.project_id
    FROM public.features f
    WHERE f.id = p_work_item_id;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 7. Create function to auto-derive dependency level from work item types
CREATE OR REPLACE FUNCTION public.derive_dependency_level(
  p_requesting_type work_item_dependency_type,
  p_depends_on_type work_item_dependency_type
) RETURNS dependency_level_v2 AS $$
BEGIN
  IF p_requesting_type = 'epic' AND p_depends_on_type = 'epic' THEN
    RETURN 'execution'::dependency_level_v2;
  ELSIF p_requesting_type = 'feature' AND p_depends_on_type = 'feature' THEN
    RETURN 'delivery'::dependency_level_v2;
  ELSE
    RETURN 'cross_level'::dependency_level_v2;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;

-- 8. Create function to derive quarter from date
CREATE OR REPLACE FUNCTION public.derive_quarter_from_date(p_date DATE)
RETURNS TEXT AS $$
DECLARE
  q INT;
  y INT;
BEGIN
  IF p_date IS NULL THEN
    RETURN NULL;
  END IF;
  q := EXTRACT(QUARTER FROM p_date);
  y := EXTRACT(YEAR FROM p_date);
  RETURN 'Q' || q || ' ' || y;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;

-- 9. Create trigger to auto-populate derived fields on insert/update
CREATE OR REPLACE FUNCTION public.dependency_auto_derive_fields()
RETURNS TRIGGER AS $$
DECLARE
  req_container RECORD;
  dep_container RECORD;
BEGIN
  -- Derive dependency level from work item types
  IF NEW.requesting_work_item_type IS NOT NULL AND NEW.depends_on_work_item_type IS NOT NULL THEN
    NEW.dependency_level_v2 := derive_dependency_level(NEW.requesting_work_item_type, NEW.depends_on_work_item_type);
    NEW.is_cross_level_exception := (NEW.dependency_level_v2 = 'cross_level');
  END IF;

  -- Derive requesting container
  IF NEW.requesting_work_item_type IS NOT NULL AND NEW.requesting_work_item_id IS NOT NULL THEN
    SELECT * INTO req_container 
    FROM derive_dependency_container(NEW.requesting_work_item_type, NEW.requesting_work_item_id);
    IF FOUND THEN
      NEW.derived_requesting_container_type := req_container.container_type;
      NEW.derived_requesting_container_id := req_container.container_id;
    END IF;
  END IF;

  -- Derive respondent container
  IF NEW.depends_on_work_item_type IS NOT NULL AND NEW.depends_on_work_item_id IS NOT NULL THEN
    SELECT * INTO dep_container 
    FROM derive_dependency_container(NEW.depends_on_work_item_type, NEW.depends_on_work_item_id);
    IF FOUND THEN
      NEW.derived_respondent_container_type := dep_container.container_type;
      NEW.derived_respondent_container_id := dep_container.container_id;
    END IF;
  END IF;

  -- Derive quarter from needed_by_date if not explicitly set
  IF NEW.needed_by_date IS NOT NULL AND (NEW.quarter IS NULL OR NEW.quarter_derived_from_date = TRUE) THEN
    NEW.quarter := derive_quarter_from_date(NEW.needed_by_date::DATE);
    NEW.quarter_derived_from_date := TRUE;
  END IF;

  -- Track blocked state changes for audit
  IF TG_OP = 'UPDATE' THEN
    IF NEW.source_blocked = TRUE AND (OLD.source_blocked IS NULL OR OLD.source_blocked = FALSE) THEN
      NEW.source_blocked_at := NOW();
      NEW.source_blocked_by := auth.uid();
    ELSIF NEW.source_blocked = FALSE AND OLD.source_blocked = TRUE THEN
      NEW.source_blocked_at := NULL;
      NEW.source_blocked_by := NULL;
      NEW.source_blocked_reason := NULL;
    END IF;

    IF NEW.target_delayed = TRUE AND (OLD.target_delayed IS NULL OR OLD.target_delayed = FALSE) THEN
      NEW.target_delayed_at := NOW();
      NEW.target_delayed_by := auth.uid();
    ELSIF NEW.target_delayed = FALSE AND OLD.target_delayed = TRUE THEN
      NEW.target_delayed_at := NULL;
      NEW.target_delayed_by := NULL;
      NEW.target_delayed_reason := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS dependency_auto_derive_trigger ON public.dependencies;
CREATE TRIGGER dependency_auto_derive_trigger
  BEFORE INSERT OR UPDATE ON public.dependencies
  FOR EACH ROW
  EXECUTE FUNCTION public.dependency_auto_derive_fields();

-- 10. Add constraint to validate commitment date when status >= pending_commit
CREATE OR REPLACE FUNCTION public.validate_dependency_commitment()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate committed_by_date is required when status is pending_commit or beyond
  IF NEW.status IN ('pending_commit', 'committed', 'in_progress', 'delivered', 'done') THEN
    IF NEW.committed_by_date IS NULL AND NEW.committed_by_sprint_id IS NULL THEN
      -- Allow for now but flag - can be made strict later
      NULL;
    END IF;
  END IF;

  -- If no_work_required is true, auto-set status
  IF NEW.no_work_required = TRUE THEN
    NEW.status := 'no_work_done';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS dependency_validate_commitment_trigger ON public.dependencies;
CREATE TRIGGER dependency_validate_commitment_trigger
  BEFORE INSERT OR UPDATE ON public.dependencies
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_dependency_commitment();

-- 11. Update the audit log trigger to capture new fields
CREATE OR REPLACE FUNCTION public.log_dependency_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.dependency_audit_log (dependency_id, changed_by, action, notes)
    VALUES (NEW.id, auth.uid(), 'created', 'Dependency created');
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.dependency_audit_log (dependency_id, changed_by, action, field_changed, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'status_changed', 'status', OLD.status::text, NEW.status::text);
    END IF;
    -- Log commitment
    IF OLD.committed_by_date IS NULL AND NEW.committed_by_date IS NOT NULL THEN
      INSERT INTO public.dependency_audit_log (dependency_id, changed_by, action, notes)
      VALUES (NEW.id, auth.uid(), 'committed', 'Dependency committed to date: ' || NEW.committed_by_date::text);
    END IF;
    -- Log source blocked changes
    IF OLD.source_blocked IS DISTINCT FROM NEW.source_blocked THEN
      INSERT INTO public.dependency_audit_log (dependency_id, changed_by, action, field_changed, old_value, new_value, notes)
      VALUES (NEW.id, auth.uid(), 'blocked_changed', 'source_blocked', 
              COALESCE(OLD.source_blocked::text, 'false'), 
              COALESCE(NEW.source_blocked::text, 'false'),
              NEW.source_blocked_reason);
    END IF;
    -- Log target delayed changes
    IF OLD.target_delayed IS DISTINCT FROM NEW.target_delayed THEN
      INSERT INTO public.dependency_audit_log (dependency_id, changed_by, action, field_changed, old_value, new_value, notes)
      VALUES (NEW.id, auth.uid(), 'delayed_changed', 'target_delayed', 
              COALESCE(OLD.target_delayed::text, 'false'), 
              COALESCE(NEW.target_delayed::text, 'false'),
              NEW.target_delayed_reason);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;