
-- ═══ JIRA USER SYNC SCHEMA ═══

CREATE TABLE IF NOT EXISTS jira_identity_map (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jira_connection_id    UUID,
  jira_account_id       TEXT,
  catalyst_user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email                 TEXT NOT NULL UNIQUE,
  display_name          TEXT NOT NULL,
  avatar_url            TEXT,
  jira_groups           TEXT[] DEFAULT '{}',
  jira_project_keys     TEXT[] DEFAULT '{}',
  is_active_in_jira     BOOLEAN DEFAULT true,
  is_active_in_catalyst BOOLEAN DEFAULT true,
  auth_mode             TEXT DEFAULT 'jira_proxy'
    CHECK (auth_mode IN ('jira_proxy','local','sso')),
  catalyst_only         BOOLEAN DEFAULT false,
  last_jira_login_at    TIMESTAMPTZ,
  last_catalyst_login_at TIMESTAMPTZ,
  last_synced_at        TIMESTAMPTZ,
  sync_version          INTEGER DEFAULT 1,
  conflict_fields       TEXT[] DEFAULT '{}',
  resource_role_id      UUID,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jira_user_project_perms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_map_id  UUID NOT NULL REFERENCES jira_identity_map(id) ON DELETE CASCADE,
  project_id       UUID NOT NULL,
  project_name     TEXT NOT NULL,
  project_key      TEXT NOT NULL,
  permission_level TEXT DEFAULT 'view'
    CHECK (permission_level IN ('full','edit','view','none')),
  synced_from_jira BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(identity_map_id, project_id)
);

CREATE TABLE IF NOT EXISTS jira_sync_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type            TEXT NOT NULL
    CHECK (run_type IN ('scheduled','manual','webhook','initial')),
  direction           TEXT NOT NULL
    CHECK (direction IN ('jira_to_catalyst','catalyst_to_jira','both')),
  status              TEXT DEFAULT 'running'
    CHECK (status IN ('running','completed','partial','failed')),
  users_created       INTEGER DEFAULT 0,
  users_updated       INTEGER DEFAULT 0,
  users_deactivated   INTEGER DEFAULT 0,
  users_failed        INTEGER DEFAULT 0,
  conflicts_detected  INTEGER DEFAULT 0,
  duration_ms         INTEGER,
  started_at          TIMESTAMPTZ DEFAULT now(),
  completed_at        TIMESTAMPTZ,
  triggered_by        UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS jira_sync_user_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id      UUID REFERENCES jira_sync_runs(id) ON DELETE CASCADE,
  identity_map_id  UUID REFERENCES jira_identity_map(id) ON DELETE CASCADE,
  email            TEXT,
  event_type       TEXT NOT NULL CHECK (event_type IN (
    'created','updated','deactivated','reactivated',
    'role_mapped','project_synced','skipped','failed',
    'conflict_detected','webhook_received'
  )),
  direction        TEXT,
  changed_fields   TEXT[],
  error_message    TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jira_auth_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalyst_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jira_account_id     TEXT NOT NULL,
  session_token_hash  TEXT NOT NULL,
  jira_session_valid  BOOLEAN DEFAULT true,
  validated_at        TIMESTAMPTZ DEFAULT now(),
  expires_at          TIMESTAMPTZ DEFAULT (now() + interval '8 hours'),
  revoked_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS jira_webhook_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type     TEXT NOT NULL,
  jira_account_id TEXT,
  raw_payload    JSONB NOT NULL,
  hmac_valid     BOOLEAN DEFAULT false,
  processed      BOOLEAN DEFAULT false,
  received_at    TIMESTAMPTZ DEFAULT now()
);

-- ENABLE RLS
ALTER TABLE jira_identity_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_user_project_perms ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_sync_user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES (admin full access, users see own record)
CREATE POLICY "admin_identity_map" ON jira_identity_map
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role='admin'));

CREATE POLICY "user_own_identity" ON jira_identity_map
  FOR SELECT USING (catalyst_user_id = auth.uid());

CREATE POLICY "admin_project_perms" ON jira_user_project_perms
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role='admin'));

CREATE POLICY "admin_sync_runs" ON jira_sync_runs
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role='admin'));

CREATE POLICY "admin_sync_events" ON jira_sync_user_events
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role='admin'));

CREATE POLICY "admin_auth_sessions" ON jira_auth_sessions
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role='admin'));

CREATE POLICY "admin_webhook_events" ON jira_webhook_events
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role='admin'));
