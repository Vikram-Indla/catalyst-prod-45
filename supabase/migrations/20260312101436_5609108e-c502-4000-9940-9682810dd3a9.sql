
-- ═══════════════════════════════════════════════════
-- RELEASEHUB v2 SCHEMA ADDITIONS
-- ═══════════════════════════════════════════════════

-- 1. Add missing columns to rh_releases
ALTER TABLE rh_releases ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE rh_releases ADD COLUMN IF NOT EXISTS description TEXT;

-- Create unique index on key (if populated)
CREATE UNIQUE INDEX IF NOT EXISTS rh_releases_key_unique ON rh_releases (key) WHERE key IS NOT NULL;

-- 2. Add missing columns to rh_changes
ALTER TABLE rh_changes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE rh_changes ADD COLUMN IF NOT EXISTS deployment_result TEXT DEFAULT NULL;
ALTER TABLE rh_changes ADD COLUMN IF NOT EXISTS assignee_id UUID;
ALTER TABLE rh_changes ADD COLUMN IF NOT EXISTS planned_date DATE;
ALTER TABLE rh_changes ADD COLUMN IF NOT EXISTS sign_off_template_id UUID;

-- 3. SIGN-OFF TEMPLATES
CREATE TABLE IF NOT EXISTS rh_sign_off_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  gate_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. SIGN-OFF TEMPLATE GATES
CREATE TABLE IF NOT EXISTS rh_sign_off_template_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES rh_sign_off_templates(id) ON DELETE CASCADE,
  gate_name TEXT NOT NULL,
  gate_order INTEGER NOT NULL,
  approver_role TEXT NOT NULL
);

-- 5. PRODUCTION EVENTS
CREATE TABLE IF NOT EXISTS rh_production_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  event_type TEXT NOT NULL,
  change_key TEXT,
  release_key TEXT,
  deployment_result TEXT,
  deployed_by TEXT NOT NULL,
  deployed_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. CHANGE ACTIVITY LOG
CREATE TABLE IF NOT EXISTS rh_change_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id UUID NOT NULL REFERENCES rh_changes(id) ON DELETE CASCADE,
  actor_name TEXT NOT NULL,
  actor_initials TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  is_ai BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. RELEASE ACTIVITY LOG
CREATE TABLE IF NOT EXISTS rh_release_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES rh_releases(id) ON DELETE CASCADE,
  actor_name TEXT NOT NULL,
  actor_initials TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  is_ai BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. CHANGE TEST CYCLES (per-change, not shared with TestHub)
CREATE TABLE IF NOT EXISTS rh_change_test_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id UUID NOT NULL REFERENCES rh_changes(id) ON DELETE CASCADE,
  cycle_name TEXT NOT NULL,
  result TEXT NOT NULL DEFAULT 'NOT_STARTED',
  total_cases INTEGER NOT NULL DEFAULT 0,
  passed_cases INTEGER NOT NULL DEFAULT 0,
  run_date DATE,
  runner_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══ ENABLE RLS ═══
ALTER TABLE rh_sign_off_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_sign_off_template_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_production_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_change_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_release_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_change_test_cycles ENABLE ROW LEVEL SECURITY;

-- ═══ RLS POLICIES ═══
CREATE POLICY "Authenticated full access on rh_sign_off_templates" ON rh_sign_off_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on rh_sign_off_template_gates" ON rh_sign_off_template_gates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on rh_production_events" ON rh_production_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on rh_change_activity_log" ON rh_change_activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on rh_release_activity_log" ON rh_release_activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on rh_change_test_cycles" ON rh_change_test_cycles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══ COMMAND CENTER KPI VIEW ═══
CREATE OR REPLACE VIEW rh_command_center_kpis AS
SELECT
  (SELECT COUNT(*) FROM rh_releases WHERE status IN ('planning','in_progress')) AS active_releases,
  (SELECT COUNT(*) FROM rh_changes WHERE status != 'in_production') AS changes_in_flight,
  (SELECT COUNT(*) FROM rh_change_signoffs WHERE status IN ('pending','waiting')) AS signoffs_pending,
  (SELECT COUNT(*) FROM rh_change_test_cycles WHERE result = 'IN_PROGRESS') AS test_cycles_running,
  (SELECT COUNT(*) FROM rh_changes WHERE release_id IS NULL) AS triage_count;
