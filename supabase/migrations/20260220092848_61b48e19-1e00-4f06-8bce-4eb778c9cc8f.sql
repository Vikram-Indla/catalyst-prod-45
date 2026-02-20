
-- ============================================================
-- ProjectHub Schema Alignment — Phase 1: Constraints & Columns
-- ============================================================

-- Drop old wh_ constraints that conflict
ALTER TABLE ph_work_items DROP CONSTRAINT IF EXISTS wh_work_items_priority_check;
ALTER TABLE ph_work_items DROP CONSTRAINT IF EXISTS wh_work_items_status_check;
ALTER TABLE ph_work_items DROP CONSTRAINT IF EXISTS wh_work_items_item_type_check;
ALTER TABLE ph_work_items DROP CONSTRAINT IF EXISTS wh_work_items_sync_source_check;
ALTER TABLE ph_releases DROP CONSTRAINT IF EXISTS wh_releases_status_check;

-- Normalize priority to lowercase
UPDATE ph_work_items SET priority = lower(priority) WHERE priority IS NOT NULL;

-- Add new priority constraint
ALTER TABLE ph_work_items ADD CONSTRAINT ph_work_items_priority_check
  CHECK (priority IN ('critical','high','medium','low'));

-- 1. ph_releases — add project_id and release_date
ALTER TABLE ph_releases ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES ph_projects(id) ON DELETE CASCADE;
ALTER TABLE ph_releases ADD COLUMN IF NOT EXISTS release_date DATE;

-- Backfill project_id
UPDATE ph_releases SET project_id = (SELECT id FROM ph_projects WHERE key = 'DMA' LIMIT 1) WHERE project_id IS NULL;

-- New status values for releases
UPDATE ph_releases SET status = 'planning' WHERE status = 'Planned';
UPDATE ph_releases SET status = 'in_progress' WHERE status IN ('Active', 'At Risk');
UPDATE ph_releases SET status = 'released' WHERE status = 'Completed';
UPDATE ph_releases SET status = 'archived' WHERE status = 'Cancelled';

ALTER TABLE ph_releases ADD CONSTRAINT ph_releases_status_check
  CHECK (status IN ('planning','in_progress','released','archived'));

-- RLS for ph_releases
ALTER TABLE ph_releases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can manage releases" ON ph_releases;
CREATE POLICY "Members can manage releases" ON ph_releases FOR ALL USING (
  project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "Anon read releases" ON ph_releases;
CREATE POLICY "Anon read releases" ON ph_releases FOR SELECT TO anon USING (true);

-- 2. ph_work_items — add missing columns
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS team TEXT;
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS environment TEXT;
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS security_level TEXT DEFAULT 'standard';
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS flag_reason TEXT;
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS cycle_time_days INTEGER;
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT now();

-- Security level constraint
ALTER TABLE ph_work_items ADD CONSTRAINT ph_work_items_security_level_check
  CHECK (security_level IN ('public','standard','confidential','restricted'));

-- Resolution constraint (allow NULL)
ALTER TABLE ph_work_items DROP CONSTRAINT IF EXISTS ph_work_items_resolution_check;
ALTER TABLE ph_work_items ADD CONSTRAINT ph_work_items_resolution_check
  CHECK (resolution IS NULL OR resolution IN ('done','wont_do','duplicate','cannot_reproduce'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wi_project ON ph_work_items(project_id);
CREATE INDEX IF NOT EXISTS idx_wi_parent ON ph_work_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_wi_assignee ON ph_work_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_wi_status ON ph_work_items(status_id);
CREATE INDEX IF NOT EXISTS idx_wi_type ON ph_work_items(type_id);
CREATE INDEX IF NOT EXISTS idx_wi_priority ON ph_work_items(priority);
CREATE INDEX IF NOT EXISTS idx_wi_sort ON ph_work_items(project_id, sort_order);

-- 3. Auto-generate item_key trigger
CREATE OR REPLACE FUNCTION ph_generate_item_key()
RETURNS TRIGGER AS $$
DECLARE proj_key TEXT; next_seq INTEGER;
BEGIN
  SELECT key INTO proj_key FROM ph_projects WHERE id = NEW.project_id;
  SELECT COALESCE(MAX(sequence_num), 0) + 1 INTO next_seq FROM ph_work_items WHERE project_id = NEW.project_id;
  NEW.sequence_num := next_seq;
  NEW.item_key := proj_key || '-' || next_seq;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_item_key ON ph_work_items;
CREATE TRIGGER trg_item_key BEFORE INSERT ON ph_work_items FOR EACH ROW EXECUTE FUNCTION ph_generate_item_key();

-- 4. Auto-calculate cycle_time
CREATE OR REPLACE FUNCTION ph_update_cycle_time()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
    NEW.status_changed_at := now();
    IF OLD.status_changed_at IS NOT NULL THEN
      NEW.cycle_time_days := EXTRACT(DAY FROM now() - OLD.status_changed_at)::INTEGER;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wi_cycle ON ph_work_items;
CREATE TRIGGER trg_wi_cycle BEFORE UPDATE ON ph_work_items FOR EACH ROW EXECUTE FUNCTION ph_update_cycle_time();

-- 5. Refresh RLS on ph_work_items
ALTER TABLE ph_work_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view" ON ph_work_items;
DROP POLICY IF EXISTS "Members can create" ON ph_work_items;
DROP POLICY IF EXISTS "Members can update" ON ph_work_items;
DROP POLICY IF EXISTS "Admins can delete" ON ph_work_items;
DROP POLICY IF EXISTS "Anon read work items" ON ph_work_items;

CREATE POLICY "Members can view" ON ph_work_items FOR SELECT USING (
  project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid())
);
CREATE POLICY "Members can create" ON ph_work_items FOR INSERT WITH CHECK (
  project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid())
);
CREATE POLICY "Members can update" ON ph_work_items FOR UPDATE USING (
  project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can delete" ON ph_work_items FOR DELETE USING (
  project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Anon read work items" ON ph_work_items FOR SELECT TO anon USING (true);
