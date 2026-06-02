-- Phase 1: Presence & Availability ("Team Pulse")
-- Tables: user_presence, user_availability
-- View: v_user_effective_status
-- Function: shared_user_ids (visibility gate), clean_stale_presence (sweeper)
-- RLS: scoped to shared audience via assignment graph
-- Feature flag: presence_availability

-- ─── 1. Enums ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'presence_state') THEN
    CREATE TYPE presence_state AS ENUM ('available', 'away', 'busy', 'offline', 'on_leave');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'availability_kind') THEN
    CREATE TYPE availability_kind AS ENUM ('vacation', 'public_holiday', 'sick', 'ooo');
  END IF;
END $$;

-- ─── 2. user_presence ─────────────────────────────────────────────────────────
-- One row per user. Upserted by the heartbeat hook every 45 seconds.
-- state is overridden by active leave (see v_user_effective_status).

CREATE TABLE IF NOT EXISTS user_presence (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state          presence_state NOT NULL DEFAULT 'offline',
  last_seen_at   timestamptz    NOT NULL DEFAULT now(),
  manual_until   timestamptz,            -- nil = auto; set = manual override until this ts
  created_at     timestamptz    NOT NULL DEFAULT now(),
  updated_at     timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE user_presence REPLICA IDENTITY FULL;

-- Enable presence table for realtime
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
  END IF;
END $$;

-- ─── 3. user_availability ─────────────────────────────────────────────────────
-- Scheduled leave windows. A user may have at most one active row
-- (enforced in application layer; overlaps allowed but effective status
-- always takes the latest starts_at row for simplicity).

CREATE TABLE IF NOT EXISTS user_availability (
  id              bigint         PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id         uuid           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind            availability_kind NOT NULL DEFAULT 'vacation',
  starts_at       timestamptz    NOT NULL,
  ends_at         timestamptz    NOT NULL,
  note            text,
  backup_user_id  uuid           REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT ends_after_starts CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS user_availability_user_id_idx ON user_availability (user_id);
CREATE INDEX IF NOT EXISTS user_availability_active_idx  ON user_availability (user_id, starts_at, ends_at);

ALTER TABLE user_availability REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_availability'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_availability;
  END IF;
END $$;

-- ─── 4. shared_user_ids — visibility scope function ──────────────────────────
-- Returns all user IDs the viewer is allowed to see presence for.
-- Shared audience = (users who share ≥1 project via ph_issues assignment graph)
--                 ∪ (users who share ≥1 product via business_requests)
--                 ∪ (project_members on shared projects)

CREATE OR REPLACE FUNCTION shared_user_ids(viewer uuid)
RETURNS TABLE (shared_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH viewer_jira AS (
    SELECT jira_account_id FROM profiles WHERE id = viewer
  ),
  -- Project keys where the viewer is involved (assignee or reporter)
  viewer_projects AS (
    SELECT DISTINCT i.project_key
    FROM ph_issues i
    CROSS JOIN viewer_jira vj
    WHERE i.assignee_account_id = vj.jira_account_id
       OR i.reporter_account_id = vj.jira_account_id
  ),
  -- All other profile rows that appear in those project_keys
  project_peers AS (
    SELECT DISTINCT p.id AS shared_id
    FROM ph_issues i
    JOIN viewer_projects vp ON vp.project_key = i.project_key
    JOIN profiles p ON (
      p.jira_account_id = i.assignee_account_id
      OR p.jira_account_id = i.reporter_account_id
    )
    WHERE p.id <> viewer
  ),
  -- Product IDs where the viewer is involved in business_requests
  viewer_products AS (
    SELECT DISTINCT product_id
    FROM business_requests
    WHERE created_by = viewer
       OR po_user_id = viewer
       OR project_manager_user_id = viewer
  ),
  -- All other profiles involved in those products
  product_peers AS (
    SELECT DISTINCT p.id AS shared_id
    FROM business_requests br
    JOIN viewer_products vp ON vp.product_id = br.product_id
    JOIN profiles p ON (
      p.id = br.created_by
      OR p.id = br.po_user_id
      OR p.id = br.project_manager_user_id
    )
    WHERE p.id <> viewer
  ),
  -- project_members peers (legacy table, 32 rows)
  member_peers AS (
    SELECT DISTINCT pm2.user_id AS shared_id
    FROM project_members pm1
    JOIN project_members pm2 ON pm2.project_id = pm1.project_id
    WHERE pm1.user_id = viewer
      AND pm2.user_id <> viewer
  )
  SELECT shared_id FROM project_peers
  UNION SELECT shared_id FROM product_peers
  UNION SELECT shared_id FROM member_peers
$$;

-- ─── 5. v_user_effective_status view ─────────────────────────────────────────
-- If the user has an active leave window now → state = on_leave, ring = RED.
-- Otherwise → use user_presence.state.
-- Exposes back_on = ends_at + 1 day for the "Back Jun X" badge.

CREATE OR REPLACE VIEW v_user_effective_status AS
SELECT
  pr.id                                                       AS user_id,
  pr.full_name,
  pr.avatar_url,
  COALESCE(up.last_seen_at, now() - interval '1 year')       AS last_seen_at,
  CASE
    WHEN av.id IS NOT NULL THEN 'on_leave'::text
    ELSE COALESCE(up.state::text, 'offline')
  END                                                         AS effective_state,
  av.kind                                                     AS leave_kind,
  av.ends_at                                                  AS leave_ends_at,
  (av.ends_at + interval '1 day')::date                      AS back_on,
  av.backup_user_id
FROM profiles pr
LEFT JOIN user_presence up ON up.user_id = pr.id
LEFT JOIN LATERAL (
  SELECT *
  FROM user_availability ua
  WHERE ua.user_id = pr.id
    AND ua.starts_at <= now()
    AND ua.ends_at   >= now()
  ORDER BY ua.starts_at DESC
  LIMIT 1
) av ON true;

-- ─── 6. clean_stale_presence — offline sweeper ───────────────────────────────
-- Sets any user with last_seen_at older than 5 minutes to offline.
-- Called by pg_cron (wired separately) or the edge function heartbeat cleanup.

CREATE OR REPLACE FUNCTION clean_stale_presence()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE user_presence
  SET state = 'offline', updated_at = now()
  WHERE last_seen_at < now() - interval '5 minute'
    AND state <> 'offline'
    AND (manual_until IS NULL OR manual_until < now());
$$;

-- ─── 7. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE user_presence    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;

-- user_presence: read own + shared audience
DROP POLICY IF EXISTS "presence_select" ON user_presence;
CREATE POLICY "presence_select" ON user_presence
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (SELECT shared_id FROM shared_user_ids(auth.uid()))
  );

-- user_presence: insert/update own row only
DROP POLICY IF EXISTS "presence_upsert_own" ON user_presence;
CREATE POLICY "presence_upsert_own" ON user_presence
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- user_availability: select own + shared audience
DROP POLICY IF EXISTS "availability_select" ON user_availability;
CREATE POLICY "availability_select" ON user_availability
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (SELECT shared_id FROM shared_user_ids(auth.uid()))
  );

-- user_availability: write own row only
DROP POLICY IF EXISTS "availability_write_own" ON user_availability;
CREATE POLICY "availability_write_own" ON user_availability
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── 8. Feature flag ─────────────────────────────────────────────────────────

INSERT INTO feature_flags (flag_key, module_key, label, is_enabled, description)
VALUES (
  'presence_availability',
  'presence_availability',
  'Team Pulse',
  false,
  'Team Pulse — real-time presence, availability scheduling, and Team Pulse tab (Premium)'
)
ON CONFLICT (module_key) DO UPDATE SET
  description = EXCLUDED.description,
  label       = EXCLUDED.label,
  is_enabled  = false;  -- keep premium gate off by default
