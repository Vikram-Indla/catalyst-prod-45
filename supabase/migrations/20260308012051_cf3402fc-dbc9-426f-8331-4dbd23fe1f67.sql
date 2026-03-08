
-- Add Jira sync fields to boards table
ALTER TABLE boards ADD COLUMN IF NOT EXISTS jira_board_id text UNIQUE;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS jira_project_key text;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS last_jira_sync timestamptz;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS jira_sync_enabled boolean DEFAULT false;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_boards_jira_id ON boards(jira_board_id) WHERE jira_board_id IS NOT NULL;

-- Add jira_mapped flag to board_columns
ALTER TABLE board_columns ADD COLUMN IF NOT EXISTS jira_mapped boolean DEFAULT false;

-- RPC to upsert a Jira board on sync
CREATE OR REPLACE FUNCTION upsert_jira_board(
  p_jira_board_id text,
  p_jira_project_key text,
  p_name text,
  p_project_id uuid,
  p_columns jsonb,
  p_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_board_id uuid;
BEGIN
  INSERT INTO boards (
    name, project_id, is_personal, visibility,
    jira_board_id, jira_project_key, last_jira_sync, jira_sync_enabled, created_by
  ) VALUES (
    p_name, p_project_id, false, 'project',
    p_jira_board_id, p_jira_project_key, now(), true, p_user_id
  )
  ON CONFLICT (jira_board_id) DO UPDATE SET
    name = EXCLUDED.name,
    last_jira_sync = now()
  RETURNING id INTO v_board_id;

  DELETE FROM board_columns WHERE board_id = v_board_id AND jira_mapped = true;
  INSERT INTO board_columns (board_id, name, position, jira_mapped)
  SELECT v_board_id, c->>'name', (c->>'order')::int, true
  FROM jsonb_array_elements(p_columns) c;

  RETURN v_board_id;
END;
$$;
