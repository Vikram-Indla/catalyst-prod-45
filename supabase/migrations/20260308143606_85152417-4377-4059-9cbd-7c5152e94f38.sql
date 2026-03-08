-- B1: Extend ph_issues with source provenance columns
ALTER TABLE ph_issues
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'jira',
  ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'synced',
  ADD COLUMN IF NOT EXISTS pending_write_back_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION validate_ph_issues_source()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source NOT IN ('catalyst', 'jira') THEN
    RAISE EXCEPTION 'Invalid source value: %', NEW.source;
  END IF;
  IF NEW.sync_status IS NOT NULL AND NEW.sync_status NOT IN ('synced','stale','conflict','syncing','pending') THEN
    RAISE EXCEPTION 'Invalid sync_status value: %', NEW.sync_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_ph_issues_source ON ph_issues;
CREATE TRIGGER trg_validate_ph_issues_source
  BEFORE INSERT OR UPDATE ON ph_issues
  FOR EACH ROW EXECUTE FUNCTION validate_ph_issues_source();

CREATE INDEX IF NOT EXISTS idx_ph_issues_source ON ph_issues(source);
CREATE INDEX IF NOT EXISTS idx_ph_issues_sync_status ON ph_issues(sync_status);