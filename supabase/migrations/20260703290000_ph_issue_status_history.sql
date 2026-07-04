-- CAT-REPORTS-HUB-20260703-001 gap closure S2.3 — D-004 unlock.
-- Status-transition capture for ph_issues. The client mutates ph_issues.status from
-- six independent code paths (canonical detail hook, workhub view, kanban drag,
-- generic field hook, work-item repo, future callers) — a DB trigger is the only
-- chokepoint that catches them all. History accrues from install time; no synthetic
-- backfill (zero-assumption law: absent transition dates render as absent).

CREATE TABLE IF NOT EXISTS ph_issue_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL,
  issue_key TEXT,
  project_key TEXT,
  issue_type TEXT,
  from_status TEXT,
  to_status TEXT NOT NULL,
  from_status_category TEXT,
  to_status_category TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'trigger'
);

CREATE INDEX IF NOT EXISTS ph_issue_status_history_issue_idx ON ph_issue_status_history (issue_id, changed_at);
CREATE INDEX IF NOT EXISTS ph_issue_status_history_key_idx ON ph_issue_status_history (issue_key, changed_at);
CREATE INDEX IF NOT EXISTS ph_issue_status_history_type_time_idx ON ph_issue_status_history (issue_type, changed_at);

ALTER TABLE ph_issue_status_history ENABLE ROW LEVEL SECURITY;

-- Read-only surface for reports; writes happen only via the trigger below.
DROP POLICY IF EXISTS ph_issue_status_history_select ON ph_issue_status_history;
CREATE POLICY ph_issue_status_history_select ON ph_issue_status_history FOR SELECT
  TO authenticated USING (true);

CREATE OR REPLACE FUNCTION ph_issues_capture_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NOT NULL THEN
      INSERT INTO ph_issue_status_history
        (issue_id, issue_key, project_key, issue_type, from_status, to_status,
         from_status_category, to_status_category, changed_by, source)
      VALUES
        (NEW.id, NEW.issue_key, NEW.project_key, NEW.issue_type, NULL, NEW.status,
         NULL, NEW.status_category, auth.uid(), 'insert');
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO ph_issue_status_history
      (issue_id, issue_key, project_key, issue_type, from_status, to_status,
       from_status_category, to_status_category, changed_by, source)
    VALUES
      (NEW.id, NEW.issue_key, NEW.project_key, NEW.issue_type, OLD.status, NEW.status,
       OLD.status_category, NEW.status_category, auth.uid(), 'update');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ph_issues_status_history_trg ON ph_issues;
CREATE TRIGGER ph_issues_status_history_trg
  AFTER INSERT OR UPDATE OF status ON ph_issues
  FOR EACH ROW EXECUTE FUNCTION ph_issues_capture_status_history();

-- tm_defects: stamp resolved_at on closure so the closure-trend report has a date
-- column that stays truthful (cleared again on reopen).
CREATE OR REPLACE FUNCTION tm_defects_stamp_resolved_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('resolved', 'closed') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.resolved_at := COALESCE(NEW.resolved_at, now());
  ELSIF NEW.status IN ('open', 'in_progress', 'reopened') AND OLD.status IN ('resolved', 'closed') THEN
    NEW.resolved_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tm_defects_resolved_at_trg ON tm_defects;
CREATE TRIGGER tm_defects_resolved_at_trg
  BEFORE UPDATE OF status ON tm_defects
  FOR EACH ROW EXECUTE FUNCTION tm_defects_stamp_resolved_at();
