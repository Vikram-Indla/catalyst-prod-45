-- P3-F4: Coverage history snapshots for tracking coverage progression

-- Table: tm_coverage_history
-- One row per project per day, capturing coverage state at that point in time
CREATE TABLE IF NOT EXISTS tm_coverage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_items INT NOT NULL,
  covered_items INT NOT NULL,
  coverage_pct NUMERIC(5, 2) NOT NULL GENERATED ALWAYS AS (
    CASE
      WHEN total_items = 0 THEN 0
      ELSE ROUND((covered_items::NUMERIC / total_items) * 100, 2)
    END
  ) STORED,
  UNIQUE(project_id, snapshot_date),
  CONSTRAINT valid_coverage CHECK (covered_items >= 0 AND total_items >= covered_items)
);

CREATE INDEX IF NOT EXISTS idx_tm_coverage_history_project_date
  ON tm_coverage_history(project_id, snapshot_date DESC);

-- Enable RLS
ALTER TABLE tm_coverage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Read all, write via admin or backfill RPC only
CREATE POLICY "read_tm_coverage_history" ON tm_coverage_history
  FOR SELECT USING (TRUE);

CREATE POLICY "insert_tm_coverage_history" ON tm_coverage_history
  FOR INSERT WITH CHECK (TRUE);

-- RPC: tm_backfill_coverage_history
-- Populates coverage history from today back N days
-- Called manually or via scheduled job to capture daily snapshots
CREATE OR REPLACE FUNCTION tm_backfill_coverage_history(p_days INT DEFAULT 30)
RETURNS TABLE (
  project_id UUID,
  project_name TEXT,
  snapshots_created INT
) LANGUAGE PLPGSQL
AS $$
DECLARE
  v_project_id UUID;
  v_project_name TEXT;
  v_date DATE;
  v_total INT;
  v_covered INT;
  v_count INT;
BEGIN
  -- Loop through each project
  FOR v_project_id, v_project_name IN
    SELECT p.id, p.name FROM projects p WHERE p.deleted_at IS NULL
  LOOP
    v_count := 0;

    -- Create snapshots for each day in the range
    FOR v_date IN
      SELECT CURRENT_DATE - (i * INTERVAL '1 day')::INT
      FROM generate_series(0, p_days) i
    LOOP
      -- Skip if snapshot already exists for this project/date
      IF NOT EXISTS (
        SELECT 1 FROM tm_coverage_history
        WHERE project_id = v_project_id AND snapshot_date = v_date
      ) THEN
        -- Count total stories/features for this project
        SELECT COUNT(*)
        INTO v_total
        FROM ph_issues
        WHERE project_id = v_project_id
          AND issue_type IN ('Story', 'Feature')
          AND deleted_at IS NULL
          AND created_at::DATE <= v_date;

        -- Count covered items (those with at least one test case link)
        SELECT COUNT(DISTINCT i.id)
        INTO v_covered
        FROM ph_issues i
        WHERE i.project_id = v_project_id
          AND i.issue_type IN ('Story', 'Feature')
          AND i.deleted_at IS NULL
          AND i.created_at::DATE <= v_date
          AND EXISTS (
            SELECT 1 FROM tm_requirement_links
            WHERE requirement_id = i.id
              AND requirement_type IN ('story', 'feature')
          );

        -- Insert snapshot
        INSERT INTO tm_coverage_history (project_id, snapshot_date, total_items, covered_items)
        VALUES (v_project_id, v_date, COALESCE(v_total, 0), COALESCE(v_covered, 0))
        ON CONFLICT (project_id, snapshot_date) DO NOTHING;

        v_count := v_count + 1;
      END IF;
    END LOOP;

    -- Return results for this project
    RETURN QUERY SELECT v_project_id, v_project_name, v_count;
  END LOOP;
END;
$$;

-- Grant execute on RPC
GRANT EXECUTE ON FUNCTION tm_backfill_coverage_history(INT) TO authenticated;
