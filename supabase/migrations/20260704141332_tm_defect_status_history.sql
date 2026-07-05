-- P3-F3: Defect status history tracking + MTTR computation

-- Table: tm_defect_status_history
-- Logs every status change on tm_defects for audit trail + MTTR calculation
CREATE TABLE IF NOT EXISTS tm_defect_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id UUID NOT NULL REFERENCES tm_defects(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id),
  CONSTRAINT valid_statuses CHECK (new_status IN ('new', 'open', 'assigned', 'in_progress', 'resolved', 'closed', 'deferred', 'reopened', 'wont_fix'))
);

CREATE INDEX IF NOT EXISTS idx_tm_defect_status_history_defect_id ON tm_defect_status_history(defect_id);
CREATE INDEX IF NOT EXISTS idx_tm_defect_status_history_changed_at ON tm_defect_status_history(changed_at);

-- Enable RLS
ALTER TABLE tm_defect_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Read all, write via trigger only
CREATE POLICY "read_tm_defect_status_history" ON tm_defect_status_history
  FOR SELECT USING (TRUE);

CREATE POLICY "insert_tm_defect_status_history" ON tm_defect_status_history
  FOR INSERT WITH CHECK (
    -- Only the trigger can insert (security definer function)
    TRUE
  );

-- Trigger function: Log status change
CREATE OR REPLACE FUNCTION tm_log_defect_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO tm_defect_status_history (defect_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on tm_defects.status update
DROP TRIGGER IF EXISTS tm_defect_status_change_trigger ON tm_defects;
CREATE TRIGGER tm_defect_status_change_trigger
  AFTER UPDATE OF status ON tm_defects
  FOR EACH ROW
  EXECUTE FUNCTION tm_log_defect_status_change();

-- RPC: tm_get_defect_mttr
-- Returns defect_id, created_at, closed_at (NULL if still open), mttr_hours
CREATE OR REPLACE FUNCTION tm_get_defect_mttr(p_project_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  defect_key TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  mttr_hours NUMERIC
) LANGUAGE SQL STABLE
AS $$
  SELECT
    d.id,
    d.defect_key,
    d.status,
    d.created_at,
    -- First transition to closed/resolved status
    (SELECT sh.changed_at FROM tm_defect_status_history sh
     WHERE sh.defect_id = d.id AND sh.new_status IN ('resolved', 'closed')
     ORDER BY sh.changed_at ASC
     LIMIT 1)::TIMESTAMPTZ AS closed_at,
    -- MTTR in hours from created_at to closed_at (NULL if still open)
    CASE
      WHEN (SELECT sh.changed_at FROM tm_defect_status_history sh
            WHERE sh.defect_id = d.id AND sh.new_status IN ('resolved', 'closed')
            ORDER BY sh.changed_at ASC
            LIMIT 1) IS NOT NULL
      THEN EXTRACT(EPOCH FROM (
        (SELECT sh.changed_at FROM tm_defect_status_history sh
         WHERE sh.defect_id = d.id AND sh.new_status IN ('resolved', 'closed')
         ORDER BY sh.changed_at ASC
         LIMIT 1) - d.created_at
      )) / 3600.0
      ELSE NULL
    END AS mttr_hours
  FROM tm_defects d
  WHERE p_project_id IS NULL OR d.project_id = p_project_id
  ORDER BY d.created_at DESC;
$$;

-- Grant execute on RPC
GRANT EXECUTE ON FUNCTION tm_get_defect_mttr(UUID) TO authenticated;
