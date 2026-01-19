-- ============================================================
-- CATALYST SLACK INTEGRATION - ADMIN CONFIGURATION
-- ============================================================

-- ============================================================
-- PART 1: SLACK APP CONFIGURATION TABLE (Admin-managed)
-- ============================================================

CREATE TABLE IF NOT EXISTS slack_app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- App Credentials (encrypted in production)
    app_id VARCHAR(50),
    client_id VARCHAR(100) NOT NULL,
    client_secret_encrypted TEXT NOT NULL,
    signing_secret_encrypted TEXT,
    
    -- OAuth Configuration
    redirect_uri TEXT NOT NULL,
    bot_scopes TEXT[] DEFAULT ARRAY[
        'chat:write',
        'im:write', 
        'users:read',
        'users:read.email',
        'channels:read'
    ],
    
    -- Workspace Info (populated after first install)
    workspace_id VARCHAR(50),
    workspace_name VARCHAR(255),
    workspace_icon_url TEXT,
    bot_user_id VARCHAR(50),
    bot_access_token_encrypted TEXT,
    
    -- Configuration
    is_active BOOLEAN DEFAULT false,
    is_configured BOOLEAN DEFAULT false,
    default_channel_id VARCHAR(50),
    default_channel_name VARCHAR(100),
    
    -- Notification Routing Rules
    routing_rules JSONB DEFAULT '[]'::jsonb,
    
    -- Settings
    send_dm_by_default BOOLEAN DEFAULT true,
    send_to_channel BOOLEAN DEFAULT false,
    include_deep_links BOOLEAN DEFAULT true,
    rich_formatting BOOLEAN DEFAULT true,
    
    -- Metadata
    configured_by UUID REFERENCES auth.users(id),
    configured_at TIMESTAMPTZ,
    last_tested_at TIMESTAMPTZ,
    last_test_status VARCHAR(20),
    last_test_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Only one config row allowed (singleton pattern)
CREATE UNIQUE INDEX IF NOT EXISTS idx_slack_app_config_singleton 
    ON slack_app_config ((true));

-- ============================================================
-- PART 2: SLACK INTEGRATION AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS slack_integration_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    action VARCHAR(50) NOT NULL,
    actor_id UUID REFERENCES auth.users(id),
    actor_email VARCHAR(255),
    actor_ip VARCHAR(50),
    target_user_id UUID REFERENCES auth.users(id),
    target_user_email VARCHAR(255),
    details JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slack_audit_action ON slack_integration_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_slack_audit_created ON slack_integration_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slack_audit_actor ON slack_integration_audit_log(actor_id);

-- ============================================================
-- PART 3: SLACK CONNECTED USERS VIEW
-- ============================================================

CREATE OR REPLACE VIEW slack_connected_users AS
SELECT 
    ui.id,
    ui.user_id,
    p.full_name,
    p.email,
    p.avatar_url,
    ui.slack_user_id,
    ui.slack_team_id,
    ui.slack_team_name,
    ui.is_active,
    ui.connected_at,
    ui.disconnected_at,
    (SELECT COUNT(*) FROM notification_delivery_log ndl 
     JOIN user_notifications un ON un.id = ndl.notification_id
     WHERE un.user_id = ui.user_id 
     AND ndl.channel = 'slack' 
     AND ndl.status = 'delivered') as notifications_sent,
    (SELECT MAX(ndl.delivered_at) FROM notification_delivery_log ndl 
     JOIN user_notifications un ON un.id = ndl.notification_id
     WHERE un.user_id = ui.user_id 
     AND ndl.channel = 'slack') as last_notification_at
FROM user_integrations ui
JOIN profiles p ON p.id = ui.user_id
WHERE ui.integration_type = 'slack';

-- ============================================================
-- PART 4: HELPER FUNCTIONS
-- ============================================================

-- Get Slack config (safe version without secrets)
CREATE OR REPLACE FUNCTION get_slack_config_safe()
RETURNS TABLE (
    id UUID,
    app_id VARCHAR,
    client_id VARCHAR,
    redirect_uri TEXT,
    bot_scopes TEXT[],
    workspace_id VARCHAR,
    workspace_name VARCHAR,
    workspace_icon_url TEXT,
    is_active BOOLEAN,
    is_configured BOOLEAN,
    default_channel_id VARCHAR,
    default_channel_name VARCHAR,
    send_dm_by_default BOOLEAN,
    send_to_channel BOOLEAN,
    routing_rules JSONB,
    configured_at TIMESTAMPTZ,
    last_tested_at TIMESTAMPTZ,
    last_test_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sac.id,
        sac.app_id,
        sac.client_id,
        sac.redirect_uri,
        sac.bot_scopes,
        sac.workspace_id,
        sac.workspace_name,
        sac.workspace_icon_url,
        sac.is_active,
        sac.is_configured,
        sac.default_channel_id,
        sac.default_channel_name,
        sac.send_dm_by_default,
        sac.send_to_channel,
        sac.routing_rules,
        sac.configured_at,
        sac.last_tested_at,
        sac.last_test_status
    FROM slack_app_config sac
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Slack stats
CREATE OR REPLACE FUNCTION get_slack_integration_stats()
RETURNS TABLE (
    total_connected_users BIGINT,
    active_connected_users BIGINT,
    total_notifications_sent BIGINT,
    notifications_last_24h BIGINT,
    notifications_last_7d BIGINT,
    failed_notifications_24h BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM user_integrations WHERE integration_type = 'slack')::BIGINT,
        (SELECT COUNT(*) FROM user_integrations WHERE integration_type = 'slack' AND is_active = true)::BIGINT,
        (SELECT COUNT(*) FROM notification_delivery_log WHERE channel = 'slack' AND status = 'delivered')::BIGINT,
        (SELECT COUNT(*) FROM notification_delivery_log WHERE channel = 'slack' AND status = 'delivered' AND delivered_at > now() - interval '24 hours')::BIGINT,
        (SELECT COUNT(*) FROM notification_delivery_log WHERE channel = 'slack' AND status = 'delivered' AND delivered_at > now() - interval '7 days')::BIGINT,
        (SELECT COUNT(*) FROM notification_delivery_log WHERE channel = 'slack' AND status = 'failed' AND created_at > now() - interval '24 hours')::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log audit action
CREATE OR REPLACE FUNCTION log_slack_audit(
    p_action VARCHAR,
    p_actor_id UUID,
    p_details JSONB DEFAULT '{}',
    p_status VARCHAR DEFAULT 'success',
    p_error TEXT DEFAULT NULL,
    p_target_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_actor_email VARCHAR;
    v_target_email VARCHAR;
    v_log_id UUID;
BEGIN
    SELECT email INTO v_actor_email FROM profiles WHERE id = p_actor_id;
    IF p_target_user_id IS NOT NULL THEN
        SELECT email INTO v_target_email FROM profiles WHERE id = p_target_user_id;
    END IF;
    
    INSERT INTO slack_integration_audit_log (
        action, actor_id, actor_email, target_user_id, target_user_email,
        details, status, error_message
    ) VALUES (
        p_action, p_actor_id, v_actor_email, p_target_user_id, v_target_email,
        p_details, p_status, p_error
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PART 5: RLS POLICIES
-- ============================================================

ALTER TABLE slack_app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_integration_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view/modify slack config
DROP POLICY IF EXISTS "Admins can manage slack config" ON slack_app_config;
CREATE POLICY "Admins can manage slack config" ON slack_app_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR role = 'super_admin')
        )
    );

-- Admins can view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON slack_integration_audit_log;
CREATE POLICY "Admins can view audit logs" ON slack_integration_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR role = 'super_admin')
        )
    );

-- ============================================================
-- PART 6: UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_slack_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_slack_config_updated_at ON slack_app_config;
CREATE TRIGGER trg_slack_config_updated_at
    BEFORE UPDATE ON slack_app_config
    FOR EACH ROW
    EXECUTE FUNCTION update_slack_config_updated_at();