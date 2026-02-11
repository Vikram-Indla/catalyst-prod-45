
-- Add missing columns to th_defects for G25 spec compliance
ALTER TABLE th_defects ADD COLUMN IF NOT EXISTS component VARCHAR(255);
ALTER TABLE th_defects ADD COLUMN IF NOT EXISTS affected_version VARCHAR(100);
ALTER TABLE th_defects ADD COLUMN IF NOT EXISTS fixed_version VARCHAR(100);
ALTER TABLE th_defects ADD COLUMN IF NOT EXISTS resolution VARCHAR(50);
ALTER TABLE th_defects ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES tm_folders(id) ON DELETE SET NULL;
ALTER TABLE th_defects ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE th_defects ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE th_defects ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);
ALTER TABLE th_defects ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_th_defects_component ON th_defects(component);
CREATE INDEX IF NOT EXISTS idx_th_defects_resolution ON th_defects(resolution);
CREATE INDEX IF NOT EXISTS idx_th_defects_due_date ON th_defects(due_date);
CREATE INDEX IF NOT EXISTS idx_th_defects_folder ON th_defects(folder_id);

-- Update the get_defect_stats function to include overdue and unassigned
CREATE OR REPLACE FUNCTION get_defect_stats(p_project_id UUID DEFAULT NULL)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total', COUNT(*),
      'open', COUNT(*) FILTER (WHERE status IN ('new', 'open', 'reopened')),
      'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
      'resolved', COUNT(*) FILTER (WHERE status IN ('resolved', 'fixed')),
      'verified', COUNT(*) FILTER (WHERE status = 'verified'),
      'closed', COUNT(*) FILTER (WHERE status = 'closed'),
      'deferred', COUNT(*) FILTER (WHERE status = 'deferred'),
      'critical', COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('closed', 'verified')),
      'high', COUNT(*) FILTER (WHERE severity = 'high' AND status NOT IN ('closed', 'verified')),
      'medium', COUNT(*) FILTER (WHERE severity = 'medium' AND status NOT IN ('closed', 'verified')),
      'low', COUNT(*) FILTER (WHERE severity = 'low' AND status NOT IN ('closed', 'verified')),
      'unassigned', COUNT(*) FILTER (WHERE assigned_to IS NULL AND status NOT IN ('closed', 'verified')),
      'overdue', COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('closed', 'verified', 'resolved', 'fixed'))
    )
    FROM th_defects
    WHERE (p_project_id IS NULL OR TRUE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
