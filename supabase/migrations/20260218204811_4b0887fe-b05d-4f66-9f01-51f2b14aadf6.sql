
-- ════════════════════════════════════════════════════════════════
-- CATALYST: Initiative Detail Panel — Database Migration
-- 6 tables, 5 trigger functions, RLS policies, and indexes.
-- ════════════════════════════════════════════════════════════════

-- TABLE 1: BUDGET LINE ITEMS
CREATE TABLE IF NOT EXISTS ph_initiative_budget_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  initiative_id UUID NOT NULL REFERENCES ph_initiatives(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'development', 'infrastructure', 'consulting', 'licensing',
    'training', 'operations', 'contingency', 'other'
  )),
  description TEXT NOT NULL,
  expense_type TEXT NOT NULL DEFAULT 'opex' CHECK (expense_type IN ('capex', 'opex')),
  planned_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  actual_amount DECIMAL(15,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'rejected', 'paid'
  )),
  vendor TEXT,
  po_number TEXT,
  invoice_date DATE,
  fiscal_quarter TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add budget_allocated to initiatives if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ph_initiatives' AND column_name = 'budget_allocated'
  ) THEN
    ALTER TABLE ph_initiatives ADD COLUMN budget_allocated DECIMAL(15,2) DEFAULT 0;
  END IF;
END $$;

-- TABLE 2: RISKS
CREATE TABLE IF NOT EXISTS ph_initiative_risks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  initiative_id UUID NOT NULL REFERENCES ph_initiatives(id) ON DELETE CASCADE,
  risk_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'technical', 'financial', 'resource', 'schedule',
    'scope', 'external', 'compliance', 'organizational'
  )),
  probability INTEGER NOT NULL CHECK (probability BETWEEN 1 AND 5),
  impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
  risk_score INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'mitigating', 'mitigated', 'accepted', 'closed', 'occurred'
  )),
  mitigation_plan TEXT,
  contingency_plan TEXT,
  owner_id UUID REFERENCES profiles(id),
  due_date DATE,
  raised_date DATE DEFAULT CURRENT_DATE,
  last_reviewed DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 3: MILESTONES
CREATE TABLE IF NOT EXISTS ph_initiative_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  initiative_id UUID NOT NULL REFERENCES ph_initiatives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'deliverable' CHECK (type IN (
    'phase_gate', 'deliverable', 'decision_point', 'external_dependency', 'event'
  )),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'in_progress', 'completed', 'missed', 'deferred'
  )),
  planned_date DATE NOT NULL,
  actual_date DATE,
  revised_date DATE,
  owner_id UUID REFERENCES profiles(id),
  completion_criteria TEXT,
  deliverables TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_critical_path BOOLEAN DEFAULT false,
  budget_release DECIMAL(15,2) DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 4: LINKS
CREATE TABLE IF NOT EXISTS ph_initiative_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  initiative_id UUID NOT NULL REFERENCES ph_initiatives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'external' CHECK (category IN (
    'document', 'design', 'repository', 'ticket',
    'communication', 'external', 'reference'
  )),
  description TEXT,
  is_pinned BOOLEAN DEFAULT false,
  added_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 5: ATTACHMENTS
CREATE TABLE IF NOT EXISTS ph_initiative_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  initiative_id UUID NOT NULL REFERENCES ph_initiatives(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'document',
  description TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 6: AUDIT LOG (IMMUTABLE)
CREATE TABLE IF NOT EXISTS ph_initiative_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  initiative_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'initiative',
  entity_id UUID,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_audit_initiative 
  ON ph_initiative_audit_log(initiative_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action 
  ON ph_initiative_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_risks_initiative 
  ON ph_initiative_risks(initiative_id, risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_milestones_initiative 
  ON ph_initiative_milestones(initiative_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_budget_initiative 
  ON ph_initiative_budget_items(initiative_id);
CREATE INDEX IF NOT EXISTS idx_links_initiative 
  ON ph_initiative_links(initiative_id);
CREATE INDEX IF NOT EXISTS idx_attachments_initiative 
  ON ph_initiative_attachments(initiative_id);

-- TRIGGER FUNCTION: Initiative Changes
CREATE OR REPLACE FUNCTION log_initiative_changes()
RETURNS TRIGGER AS $$
DECLARE
  user_uuid UUID;
BEGIN
  user_uuid := auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (NEW.id, user_uuid, 'created', 'initiative', NEW.id, 
      jsonb_build_object('initiative_key', NEW.initiative_key, 'title', NEW.title));
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id)
    VALUES (OLD.id, user_uuid, 'deleted', 'initiative', OLD.id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value)
      VALUES (NEW.id, user_uuid, 'status_changed', 'initiative', NEW.id, 'status', OLD.status, NEW.status);
    END IF;

    IF OLD.title IS DISTINCT FROM NEW.title THEN
      INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value)
      VALUES (NEW.id, user_uuid, 'updated', 'initiative', NEW.id, 'title', OLD.title, NEW.title);
    END IF;

    IF OLD.progress IS DISTINCT FROM NEW.progress THEN
      INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value)
      VALUES (NEW.id, user_uuid, 'updated', 'initiative', NEW.id, 'progress', OLD.progress::TEXT, NEW.progress::TEXT);
    END IF;

    IF OLD.description IS DISTINCT FROM NEW.description THEN
      INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value)
      VALUES (NEW.id, user_uuid, 'updated', 'initiative', NEW.id, 'description', LEFT(OLD.description, 200), LEFT(NEW.description, 200));
    END IF;

    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value)
      VALUES (NEW.id, user_uuid, 'updated', 'initiative', NEW.id, 'assignee_id', OLD.assignee_id::TEXT, NEW.assignee_id::TEXT);
    END IF;

    IF OLD.department_id IS DISTINCT FROM NEW.department_id THEN
      INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value)
      VALUES (NEW.id, user_uuid, 'updated', 'initiative', NEW.id, 'department_id', OLD.department_id::TEXT, NEW.department_id::TEXT);
    END IF;

    IF OLD.business_owner_id IS DISTINCT FROM NEW.business_owner_id THEN
      INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value)
      VALUES (NEW.id, user_uuid, 'updated', 'initiative', NEW.id, 'business_owner_id', OLD.business_owner_id::TEXT, NEW.business_owner_id::TEXT);
    END IF;

    IF OLD.target_quarter IS DISTINCT FROM NEW.target_quarter THEN
      INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value)
      VALUES (NEW.id, user_uuid, 'updated', 'initiative', NEW.id, 'target_quarter', OLD.target_quarter, NEW.target_quarter);
    END IF;

    IF OLD.budget_allocated IS DISTINCT FROM NEW.budget_allocated THEN
      INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value)
      VALUES (NEW.id, user_uuid, 'updated', 'initiative', NEW.id, 'budget_allocated', OLD.budget_allocated::TEXT, NEW.budget_allocated::TEXT);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER FUNCTION: Risk Changes
CREATE OR REPLACE FUNCTION log_risk_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (NEW.initiative_id, auth.uid(), 'risk_added', 'risk', NEW.id,
      jsonb_build_object('risk_key', NEW.risk_key, 'title', NEW.title, 'severity', 
        CASE WHEN NEW.probability * NEW.impact >= 20 THEN 'Critical'
             WHEN NEW.probability * NEW.impact >= 15 THEN 'High'
             WHEN NEW.probability * NEW.impact >= 8 THEN 'Medium'
             ELSE 'Low' END));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value, metadata)
      VALUES (NEW.initiative_id, auth.uid(), 'updated', 'risk', NEW.id, 'status', OLD.status, NEW.status,
        jsonb_build_object('risk_key', NEW.risk_key, 'title', NEW.title));
    END IF;
    IF OLD.probability IS DISTINCT FROM NEW.probability OR OLD.impact IS DISTINCT FROM NEW.impact THEN
      INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value, metadata)
      VALUES (NEW.initiative_id, auth.uid(), 'updated', 'risk', NEW.id, 'risk_score', 
        (OLD.probability * OLD.impact)::TEXT, (NEW.probability * NEW.impact)::TEXT,
        jsonb_build_object('risk_key', NEW.risk_key, 'title', NEW.title));
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (OLD.initiative_id, auth.uid(), 'deleted', 'risk', OLD.id,
      jsonb_build_object('risk_key', OLD.risk_key, 'title', OLD.title));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER FUNCTION: Milestone Changes
CREATE OR REPLACE FUNCTION log_milestone_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (NEW.initiative_id, auth.uid(), 'milestone_added', 'milestone', NEW.id,
      jsonb_build_object('title', NEW.title, 'planned_date', NEW.planned_date::TEXT, 'type', NEW.type));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
      INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, metadata)
      VALUES (NEW.initiative_id, auth.uid(), 'milestone_completed', 'milestone', NEW.id,
        jsonb_build_object('title', NEW.title, 'actual_date', NEW.actual_date::TEXT, 'budget_release', NEW.budget_release::TEXT));
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value, metadata)
      VALUES (NEW.initiative_id, auth.uid(), 'updated', 'milestone', NEW.id, 'status', OLD.status, NEW.status,
        jsonb_build_object('title', NEW.title));
    END IF;
    IF OLD.planned_date IS DISTINCT FROM NEW.planned_date THEN
      INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value, metadata)
      VALUES (NEW.initiative_id, auth.uid(), 'updated', 'milestone', NEW.id, 'planned_date', OLD.planned_date::TEXT, NEW.planned_date::TEXT,
        jsonb_build_object('title', NEW.title));
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (OLD.initiative_id, auth.uid(), 'deleted', 'milestone', OLD.id,
      jsonb_build_object('title', OLD.title));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER FUNCTION: Budget Item Changes
CREATE OR REPLACE FUNCTION log_budget_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (NEW.initiative_id, auth.uid(), 'budget_item_added', 'budget_item', NEW.id,
      jsonb_build_object('category', NEW.category, 'expense_type', NEW.expense_type, 
        'planned_amount', NEW.planned_amount::TEXT, 'description', NEW.description));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value, metadata)
      VALUES (NEW.initiative_id, auth.uid(), 'updated', 'budget_item', NEW.id, 'status', OLD.status, NEW.status,
        jsonb_build_object('description', NEW.description, 'planned_amount', NEW.planned_amount::TEXT));
    END IF;
    IF OLD.actual_amount IS DISTINCT FROM NEW.actual_amount THEN
      INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value, metadata)
      VALUES (NEW.initiative_id, auth.uid(), 'updated', 'budget_item', NEW.id, 'actual_amount', 
        OLD.actual_amount::TEXT, NEW.actual_amount::TEXT,
        jsonb_build_object('description', NEW.description));
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (OLD.initiative_id, auth.uid(), 'deleted', 'budget_item', OLD.id,
      jsonb_build_object('description', OLD.description, 'planned_amount', OLD.planned_amount::TEXT));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER FUNCTION: Link Changes
CREATE OR REPLACE FUNCTION log_link_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (NEW.initiative_id, auth.uid(), 'link_added', 'link', NEW.id,
      jsonb_build_object('title', NEW.title, 'url', NEW.url, 'category', NEW.category));
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO ph_initiative_audit_log(initiative_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (OLD.initiative_id, auth.uid(), 'deleted', 'link', OLD.id,
      jsonb_build_object('title', OLD.title));
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ATTACH TRIGGERS
DROP TRIGGER IF EXISTS initiative_audit_trigger ON ph_initiatives;
CREATE TRIGGER initiative_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ph_initiatives
  FOR EACH ROW EXECUTE FUNCTION log_initiative_changes();

DROP TRIGGER IF EXISTS risk_audit_trigger ON ph_initiative_risks;
CREATE TRIGGER risk_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ph_initiative_risks
  FOR EACH ROW EXECUTE FUNCTION log_risk_changes();

DROP TRIGGER IF EXISTS milestone_audit_trigger ON ph_initiative_milestones;
CREATE TRIGGER milestone_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ph_initiative_milestones
  FOR EACH ROW EXECUTE FUNCTION log_milestone_changes();

DROP TRIGGER IF EXISTS budget_audit_trigger ON ph_initiative_budget_items;
CREATE TRIGGER budget_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ph_initiative_budget_items
  FOR EACH ROW EXECUTE FUNCTION log_budget_changes();

DROP TRIGGER IF EXISTS link_audit_trigger ON ph_initiative_links;
CREATE TRIGGER link_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ph_initiative_links
  FOR EACH ROW EXECUTE FUNCTION log_link_changes();

-- ROW LEVEL SECURITY
ALTER TABLE ph_initiative_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_initiative_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_initiative_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_initiative_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_initiative_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_initiative_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read budget_items" ON ph_initiative_budget_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read risks" ON ph_initiative_risks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read milestones" ON ph_initiative_milestones FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read links" ON ph_initiative_links FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read attachments" ON ph_initiative_attachments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read audit_log" ON ph_initiative_audit_log FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated insert budget_items" ON ph_initiative_budget_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update budget_items" ON ph_initiative_budget_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete budget_items" ON ph_initiative_budget_items FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated insert risks" ON ph_initiative_risks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update risks" ON ph_initiative_risks FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete risks" ON ph_initiative_risks FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated insert milestones" ON ph_initiative_milestones FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update milestones" ON ph_initiative_milestones FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete milestones" ON ph_initiative_milestones FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated insert links" ON ph_initiative_links FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update links" ON ph_initiative_links FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete links" ON ph_initiative_links FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated insert attachments" ON ph_initiative_attachments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete attachments" ON ph_initiative_attachments FOR DELETE USING (auth.uid() IS NOT NULL);

-- Audit log is INSERT-ONLY for triggers (no user updates/deletes)
CREATE POLICY "Triggers insert audit_log" ON ph_initiative_audit_log FOR INSERT WITH CHECK (true);
