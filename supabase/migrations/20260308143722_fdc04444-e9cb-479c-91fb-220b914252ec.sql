-- B2a: Jira sync conflicts
CREATE TABLE IF NOT EXISTS jira_sync_conflicts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ph_issue_id      UUID NOT NULL REFERENCES ph_issues(id) ON DELETE CASCADE,
  field_name       VARCHAR(100) NOT NULL,
  catalyst_value   TEXT,
  jira_value       TEXT,
  detected_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ,
  resolved_by      UUID,
  resolution       VARCHAR(20),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID,
  updated_by       UUID
);

CREATE OR REPLACE FUNCTION validate_jira_sync_conflicts_resolution()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.resolution IS NOT NULL AND NEW.resolution NOT IN ('keep_catalyst', 'keep_jira') THEN
    RAISE EXCEPTION 'Invalid resolution value: %', NEW.resolution;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_conflict_resolution ON jira_sync_conflicts;
CREATE TRIGGER trg_validate_conflict_resolution
  BEFORE INSERT OR UPDATE ON jira_sync_conflicts
  FOR EACH ROW EXECUTE FUNCTION validate_jira_sync_conflicts_resolution();

CREATE INDEX IF NOT EXISTS idx_jira_sync_conflicts_issue ON jira_sync_conflicts(ph_issue_id);
CREATE INDEX IF NOT EXISTS idx_jira_sync_conflicts_unresolved ON jira_sync_conflicts(resolved_at) WHERE resolved_at IS NULL;

-- B2b: Write-back queue
CREATE TABLE IF NOT EXISTS jira_write_back_queue (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ph_issue_id      UUID NOT NULL REFERENCES ph_issues(id) ON DELETE CASCADE,
  field_name       VARCHAR(100) NOT NULL,
  new_value        TEXT NOT NULL,
  queued_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at      TIMESTAMPTZ,
  approved_by      UUID,
  pushed_at        TIMESTAMPTZ,
  push_status      VARCHAR(20) DEFAULT 'queued',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID,
  updated_by       UUID
);

CREATE OR REPLACE FUNCTION validate_write_back_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.push_status NOT IN ('queued', 'approved', 'pushed', 'failed', 'rejected') THEN
    RAISE EXCEPTION 'Invalid push_status: %', NEW.push_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_write_back_status ON jira_write_back_queue;
CREATE TRIGGER trg_validate_write_back_status
  BEFORE INSERT OR UPDATE ON jira_write_back_queue
  FOR EACH ROW EXECUTE FUNCTION validate_write_back_status();

-- B2c: Add project_id column to existing jira_sync_logs (it exists but with different schema)
ALTER TABLE jira_sync_logs
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES ph_projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS triggered_by UUID,
  ADD COLUMN IF NOT EXISTS items_synced INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conflicts_found INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

CREATE INDEX IF NOT EXISTS idx_jira_sync_logs_ph_project ON jira_sync_logs(project_id, started_at DESC);

-- B3: Aggregation view
CREATE OR REPLACE VIEW project_sync_summary WITH (security_invoker=on) AS
SELECT
  p.id AS project_id,
  p.key AS project_key,
  COUNT(i.id) FILTER (WHERE i.source = 'catalyst') AS catalyst_count,
  COUNT(i.id) FILTER (WHERE i.source = 'jira')     AS jira_count,
  COUNT(i.id) FILTER (WHERE i.sync_status = 'conflict') AS conflict_count,
  COUNT(i.id) FILTER (WHERE i.sync_status = 'stale')    AS stale_count,
  MAX(i.last_synced_at) AS last_synced_at
FROM ph_projects p
LEFT JOIN ph_issues i ON i.project_key = p.key
GROUP BY p.id, p.key;

-- B4: RLS
ALTER TABLE jira_sync_conflicts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_write_back_queue ENABLE ROW LEVEL SECURITY;

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.is_ph_project_member(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ph_project_members
    WHERE user_id = _user_id AND project_id = _project_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_ph_project_editor(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ph_project_members
    WHERE user_id = _user_id AND project_id = _project_id
      AND role IN ('editor', 'admin', 'owner')
  );
$$;

-- Conflicts RLS
CREATE POLICY "Members view sync conflicts"
  ON jira_sync_conflicts FOR SELECT TO authenticated
  USING (
    ph_issue_id IN (
      SELECT i.id FROM ph_issues i
      JOIN ph_projects p ON p.key = i.project_key
      WHERE public.is_ph_project_member(auth.uid(), p.id)
    )
  );

CREATE POLICY "Editors resolve sync conflicts"
  ON jira_sync_conflicts FOR UPDATE TO authenticated
  USING (
    ph_issue_id IN (
      SELECT i.id FROM ph_issues i
      JOIN ph_projects p ON p.key = i.project_key
      WHERE public.is_ph_project_editor(auth.uid(), p.id)
    )
  );

-- Sync logs RLS (table already exists, add policies if not present)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'jira_sync_logs' AND policyname = 'Members view ph sync logs') THEN
    EXECUTE 'CREATE POLICY "Members view ph sync logs" ON jira_sync_logs FOR SELECT TO authenticated USING (project_id IS NULL OR public.is_ph_project_member(auth.uid(), project_id))';
  END IF;
END $$;

-- Write-back queue RLS
CREATE POLICY "Members view write-back queue"
  ON jira_write_back_queue FOR SELECT TO authenticated
  USING (
    ph_issue_id IN (
      SELECT i.id FROM ph_issues i
      JOIN ph_projects p ON p.key = i.project_key
      WHERE public.is_ph_project_member(auth.uid(), p.id)
    )
  );

CREATE POLICY "Editors manage write-back queue"
  ON jira_write_back_queue FOR INSERT TO authenticated
  WITH CHECK (
    ph_issue_id IN (
      SELECT i.id FROM ph_issues i
      JOIN ph_projects p ON p.key = i.project_key
      WHERE public.is_ph_project_editor(auth.uid(), p.id)
    )
  );

CREATE POLICY "Editors update write-back queue"
  ON jira_write_back_queue FOR UPDATE TO authenticated
  USING (
    ph_issue_id IN (
      SELECT i.id FROM ph_issues i
      JOIN ph_projects p ON p.key = i.project_key
      WHERE public.is_ph_project_editor(auth.uid(), p.id)
    )
  );