-- ============================================================
-- CATALYST NOTIFICATION SYSTEM - DATABASE UPDATES
-- ============================================================

-- PART 1: Add missing columns to user_notifications table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notifications' AND column_name = 'channel'
    ) THEN
        ALTER TABLE user_notifications ADD COLUMN channel VARCHAR(20) DEFAULT 'in_app';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notifications' AND column_name = 'entity_type'
    ) THEN
        ALTER TABLE user_notifications ADD COLUMN entity_type VARCHAR(50);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notifications' AND column_name = 'entity_id'
    ) THEN
        ALTER TABLE user_notifications ADD COLUMN entity_id UUID;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notifications' AND column_name = 'actor_id'
    ) THEN
        ALTER TABLE user_notifications ADD COLUMN actor_id UUID REFERENCES profiles(id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notifications' AND column_name = 'severity'
    ) THEN
        ALTER TABLE user_notifications ADD COLUMN severity VARCHAR(20) DEFAULT 'info';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notifications' AND column_name = 'idempotency_key'
    ) THEN
        ALTER TABLE user_notifications ADD COLUMN idempotency_key VARCHAR(255);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idempotency 
            ON user_notifications(idempotency_key) WHERE idempotency_key IS NOT NULL;
    END IF;
END $$;

-- PART 2: Create user_integrations table for Slack
CREATE TABLE IF NOT EXISTS user_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    slack_user_id VARCHAR(50),
    slack_team_id VARCHAR(50),
    slack_team_name VARCHAR(255),
    bot_user_id VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    connected_at TIMESTAMPTZ DEFAULT now(),
    disconnected_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_integration UNIQUE (user_id, integration_type)
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_type ON user_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_user_integrations_active ON user_integrations(user_id, integration_type) WHERE is_active = true;

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own integrations" ON user_integrations;
CREATE POLICY "Users can view own integrations" ON user_integrations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own integrations" ON user_integrations;
CREATE POLICY "Users can update own integrations" ON user_integrations
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own integrations" ON user_integrations;
CREATE POLICY "Users can insert own integrations" ON user_integrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- PART 3: Create notification_delivery_log table
CREATE TABLE IF NOT EXISTS notification_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES user_notifications(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempted_at TIMESTAMPTZ DEFAULT now(),
    delivered_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    slack_message_ts VARCHAR(50),
    email_message_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_log_notification ON notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_delivery_log_status ON notification_delivery_log(status);

ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own delivery logs" ON notification_delivery_log;
CREATE POLICY "Users can view own delivery logs" ON notification_delivery_log
    FOR SELECT
    USING (
        notification_id IN (
            SELECT id FROM user_notifications WHERE user_id = auth.uid()
        )
    );

-- PART 4: Create user_notification_preferences table if not exists
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications_enabled BOOLEAN DEFAULT true,
    in_app_notifications_enabled BOOLEAN DEFAULT true,
    slack_enabled BOOLEAN DEFAULT false,
    slack_dm BOOLEAN DEFAULT false,
    notify_work_item_assigned BOOLEAN DEFAULT true,
    notify_work_item_state_change BOOLEAN DEFAULT true,
    notify_comments BOOLEAN DEFAULT true,
    notify_mentions BOOLEAN DEFAULT true,
    notify_subscriptions BOOLEAN DEFAULT true,
    notify_dependencies BOOLEAN DEFAULT true,
    email_frequency VARCHAR(20) DEFAULT 'immediate',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON user_notification_preferences(user_id);

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON user_notification_preferences;
CREATE POLICY "Users can view own preferences" ON user_notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON user_notification_preferences;
CREATE POLICY "Users can update own preferences" ON user_notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON user_notification_preferences;
CREATE POLICY "Users can insert own preferences" ON user_notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- PART 5: Helper function for creating notifications with deduplication
CREATE OR REPLACE FUNCTION create_notification_with_dedup(
    p_user_id UUID,
    p_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT,
    p_link VARCHAR,
    p_entity_type VARCHAR DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_actor_id UUID DEFAULT NULL,
    p_severity VARCHAR DEFAULT 'info',
    p_idempotency_key VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_existing_id UUID;
BEGIN
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_id 
        FROM user_notifications 
        WHERE idempotency_key = p_idempotency_key;
        
        IF v_existing_id IS NOT NULL THEN
            RETURN v_existing_id;
        END IF;
    END IF;
    
    IF p_user_id = p_actor_id THEN
        RETURN NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM user_notification_preferences
        WHERE user_id = p_user_id
        AND in_app_notifications_enabled = false
    ) THEN
        RETURN NULL;
    END IF;
    
    INSERT INTO user_notifications (
        id, user_id, type, title, message, link, 
        entity_type, entity_id, actor_id, severity, 
        idempotency_key, is_read, created_at
    )
    VALUES (
        gen_random_uuid(), p_user_id, p_type, p_title, p_message, p_link,
        p_entity_type, p_entity_id, p_actor_id, p_severity,
        p_idempotency_key, false, now()
    )
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PART 6: Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread ON user_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_entity ON user_notifications(entity_type, entity_id);