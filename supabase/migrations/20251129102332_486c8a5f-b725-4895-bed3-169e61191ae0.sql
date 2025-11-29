-- =====================================================
-- CATALYST DEPENDENCIES MODULE - DATABASE SCHEMA
-- =====================================================
-- This migration extends the existing dependencies table and creates supporting tables
-- for the complete Jira Align-inspired Dependencies framework.

-- 1. Create external_entities table for External Dependencies
CREATE TABLE IF NOT EXISTS public.external_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  entity_type TEXT, -- 'Vendor', 'Legal', 'Partner', 'Consultant', 'Contractor', etc.
  description TEXT,
  proxy_owner_id UUID, -- Internal user who manages this external entity
  contact_info JSONB, -- {email, phone, company}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Extend dependency_status enum to support full lifecycle
DO $$ BEGIN
  ALTER TYPE dependency_status ADD VALUE IF NOT EXISTS 'pending_commit';
  ALTER TYPE dependency_status ADD VALUE IF NOT EXISTS 'negotiation';
  ALTER TYPE dependency_status ADD VALUE IF NOT EXISTS 'committed';
  ALTER TYPE dependency_status ADD VALUE IF NOT EXISTS 'in_progress';
  ALTER TYPE dependency_status ADD VALUE IF NOT EXISTS 'delivered';
  ALTER TYPE dependency_status ADD VALUE IF NOT EXISTS 'no_work_done';
  ALTER TYPE dependency_status ADD VALUE IF NOT EXISTS 'rejected';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Extend dependency_type enum
DO $$ BEGIN
  ALTER TYPE dependency_type ADD VALUE IF NOT EXISTS 'program';
  ALTER TYPE dependency_type ADD VALUE IF NOT EXISTS 'external';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Add new columns to dependencies table for full Jira Align behavior
ALTER TABLE public.dependencies
ADD COLUMN IF NOT EXISTS dependency_level TEXT CHECK (dependency_level IN ('team', 'program', 'external')),
ADD COLUMN IF NOT EXISTS requesting_team_id UUID REFERENCES public.teams(id),
ADD COLUMN IF NOT EXISTS requesting_program_id UUID REFERENCES public.programs(id),
ADD COLUMN IF NOT EXISTS depends_on_team_id UUID REFERENCES public.teams(id),
ADD COLUMN IF NOT EXISTS depends_on_program_id UUID REFERENCES public.programs(id),
ADD COLUMN IF NOT EXISTS external_entity_id UUID REFERENCES public.external_entities(id),
ADD COLUMN IF NOT EXISTS owner_id UUID,
ADD COLUMN IF NOT EXISTS pi_id UUID REFERENCES public.program_increments(id),
ADD COLUMN IF NOT EXISTS needed_by_sprint_id UUID REFERENCES public.iterations(id),
ADD COLUMN IF NOT EXISTS needed_by_date DATE,
ADD COLUMN IF NOT EXISTS committed_by_sprint_id UUID REFERENCES public.iterations(id),
ADD COLUMN IF NOT EXISTS committed_by_date DATE,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS blocked_requestor BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_respondent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_reason_requestor TEXT,
ADD COLUMN IF NOT EXISTS blocked_reason_respondent TEXT,
ADD COLUMN IF NOT EXISTS no_work_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS notify_on_commit BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_delivery BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS subscribed_users UUID[],
ADD COLUMN IF NOT EXISTS related_stories_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rank_order INTEGER;

-- 5. Create dependency_negotiations table for tracking negotiation history
CREATE TABLE IF NOT EXISTS public.dependency_negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dependency_id UUID NOT NULL REFERENCES public.dependencies(id) ON DELETE CASCADE,
  proposed_by UUID, -- user who made the proposal
  proposed_date DATE,
  proposed_sprint_id UUID REFERENCES public.iterations(id),
  counter_proposal BOOLEAN DEFAULT false,
  notes TEXT,
  status TEXT CHECK (status IN ('proposed', 'accepted', 'rejected', 'superseded')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create dependency_audit_log table
CREATE TABLE IF NOT EXISTS public.dependency_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dependency_id UUID NOT NULL REFERENCES public.dependencies(id) ON DELETE CASCADE,
  changed_by UUID,
  action TEXT NOT NULL, -- 'created', 'updated', 'committed', 'delivered', 'blocked', etc.
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Create work_item_links table (for predecessor/successor relationships)
CREATE TABLE IF NOT EXISTS public.work_item_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_work_item_id UUID NOT NULL,
  from_work_item_type TEXT NOT NULL CHECK (from_work_item_type IN ('epic', 'feature', 'story', 'task')),
  to_work_item_id UUID NOT NULL,
  to_work_item_type TEXT NOT NULL CHECK (to_work_item_type IN ('epic', 'feature', 'story', 'task')),
  link_type TEXT DEFAULT 'predecessor' CHECK (link_type IN ('predecessor', 'successor', 'related', 'blocks', 'blocked_by')),
  program_id UUID REFERENCES public.programs(id),
  pi_id UUID REFERENCES public.program_increments(id),
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Enable RLS on all new tables
ALTER TABLE public.external_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependency_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependency_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_item_links ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for external_entities
CREATE POLICY "Users can view external entities"
  ON public.external_entities FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage external entities"
  ON public.external_entities FOR ALL
  USING (is_admin(auth.uid()));

-- 10. Create RLS policies for dependency_negotiations
CREATE POLICY "Users can view dependency negotiations"
  ON public.dependency_negotiations FOR SELECT
  USING (true);

CREATE POLICY "Users can create dependency negotiations"
  ON public.dependency_negotiations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 11. Create RLS policies for dependency_audit_log
CREATE POLICY "Users can view dependency audit logs"
  ON public.dependency_audit_log FOR SELECT
  USING (true);

-- 12. Create RLS policies for work_item_links
CREATE POLICY "Users can view work item links"
  ON public.work_item_links FOR SELECT
  USING (true);

CREATE POLICY "Users can manage work item links"
  ON public.work_item_links FOR ALL
  USING (auth.uid() IS NOT NULL);

-- 13. Update existing dependencies RLS to be more permissive
DROP POLICY IF EXISTS "dependencies_select_policy" ON public.dependencies;
CREATE POLICY "Users can view all dependencies"
  ON public.dependencies FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "dependencies_insert_policy" ON public.dependencies;
CREATE POLICY "Users can create dependencies"
  ON public.dependencies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "dependencies_update_policy" ON public.dependencies;
CREATE POLICY "Users can update dependencies"
  ON public.dependencies FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- 14. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dependencies_pi ON public.dependencies(pi_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_requesting_team ON public.dependencies(requesting_team_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_depends_on_team ON public.dependencies(depends_on_team_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_requesting_program ON public.dependencies(requesting_program_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_depends_on_program ON public.dependencies(depends_on_program_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_status ON public.dependencies(status);
CREATE INDEX IF NOT EXISTS idx_dependencies_level ON public.dependencies(dependency_level);
CREATE INDEX IF NOT EXISTS idx_dependency_negotiations_dependency ON public.dependency_negotiations(dependency_id);
CREATE INDEX IF NOT EXISTS idx_dependency_audit_log_dependency ON public.dependency_audit_log(dependency_id);
CREATE INDEX IF NOT EXISTS idx_work_item_links_from ON public.work_item_links(from_work_item_id, from_work_item_type);
CREATE INDEX IF NOT EXISTS idx_work_item_links_to ON public.work_item_links(to_work_item_id, to_work_item_type);

-- 15. Create update trigger for external_entities
CREATE OR REPLACE FUNCTION update_external_entities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER external_entities_updated_at
  BEFORE UPDATE ON public.external_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_external_entities_updated_at();

-- 16. Create trigger to auto-log dependency changes
CREATE OR REPLACE FUNCTION log_dependency_changes()
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
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER dependency_audit_trigger
  AFTER INSERT OR UPDATE ON public.dependencies
  FOR EACH ROW
  EXECUTE FUNCTION log_dependency_changes();