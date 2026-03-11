
-- ═══════════════════════════════════════════════════════════
-- FEATURE FLAGS — Evolve existing table + create new tables
-- ═══════════════════════════════════════════════════════════

-- 1. Add new columns to existing feature_flags table
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS module_name TEXT NOT NULL DEFAULT '';
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Operations';
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'production';
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS route TEXT NOT NULL DEFAULT '';
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS icon_name TEXT NOT NULL DEFAULT 'Box';
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS icon_color TEXT NOT NULL DEFAULT 'neutral';
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS updated_by_name TEXT NOT NULL DEFAULT 'System';
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Backfill new columns from existing data
UPDATE feature_flags SET
  module_name = label,
  enabled = is_enabled,
  icon_name = COALESCE(icon, 'Box'),
  status = CASE WHEN is_enabled THEN 'live' ELSE 'draft' END,
  category = CASE
    WHEN group_name = 'Strategy' THEN 'Strategy'
    WHEN group_name = 'Product' THEN 'Product'
    WHEN group_name = 'Delivery' THEN 'Delivery'
    WHEN group_name = 'Quality' THEN 'Quality'
    WHEN group_name = 'Operations' THEN 'Operations'
    ELSE 'Operations'
  END
WHERE module_name = '' OR module_name IS NULL;

-- 3. Module dependencies table
CREATE TABLE IF NOT EXISTS feature_flag_dependencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  depends_on_key TEXT NOT NULL,
  dependency_type TEXT NOT NULL DEFAULT 'requires',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(flag_id, depends_on_key)
);

-- 4. Audit trail table
CREATE TABLE IF NOT EXISTS feature_flag_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_id UUID REFERENCES feature_flags(id) ON DELETE SET NULL,
  flag_module_key TEXT NOT NULL,
  action TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name TEXT NOT NULL DEFAULT 'System',
  metadata JSONB DEFAULT '{}',
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flags_environment ON feature_flags(environment);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_flag_id ON feature_flag_audit(flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_performed_at ON feature_flag_audit(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_flag_deps_flag_id ON feature_flag_dependencies(flag_id);

-- 6. Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_feature_flag_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER trg_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flag_timestamp();

-- 7. Trigger: auto-insert audit row on enable/disable
CREATE OR REPLACE FUNCTION audit_feature_flag_toggle()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.enabled IS DISTINCT FROM NEW.enabled THEN
    INSERT INTO feature_flag_audit (flag_id, flag_module_key, action, environment, performed_by, performed_by_name)
    VALUES (
      NEW.id,
      NEW.module_key,
      CASE WHEN NEW.enabled THEN 'enabled' ELSE 'disabled' END,
      NEW.environment,
      NEW.updated_by,
      COALESCE(NEW.updated_by_name, 'System')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feature_flags_audit ON feature_flags;
CREATE TRIGGER trg_feature_flags_audit
  AFTER UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION audit_feature_flag_toggle();

-- 8. RLS on new tables
ALTER TABLE feature_flag_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flag_deps_read" ON feature_flag_dependencies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "feature_flag_audit_read" ON feature_flag_audit
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "feature_flag_audit_admin_write" ON feature_flag_audit
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );
