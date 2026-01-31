-- ═══════════════════════════════════════════════════════════════════════════════
-- PLANHUB™ DATABASE MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════════
-- Version: 1.0.0
-- Module: PlanHub Project Planning
-- Platform: Supabase (PostgreSQL)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Plan lifecycle status
CREATE TYPE planhub_plan_status AS ENUM ('draft', 'active', 'review', 'archived');

-- Plan health indicators
CREATE TYPE planhub_plan_health AS ENUM ('ontrack', 'atrisk', 'critical');

-- Task type classification
CREATE TYPE planhub_task_type AS ENUM ('phase', 'task', 'milestone');

-- Plan sentiment/aggressiveness
CREATE TYPE planhub_sentiment AS ENUM ('conservative', 'moderate', 'aggressive');

-- Audit action types
CREATE TYPE planhub_audit_action AS ENUM ('create', 'update', 'delete', 'access', 'export', 'share', 'restore');

-- User roles in PlanHub
CREATE TYPE planhub_role AS ENUM ('admin', 'manager', 'editor', 'viewer');

-- ═══════════════════════════════════════════════════════════════════════════════
-- CORE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Plans table
CREATE TABLE planhub_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    description TEXT,
    status planhub_plan_status NOT NULL DEFAULT 'draft',
    health planhub_plan_health NOT NULL DEFAULT 'ontrack',
    lead_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    start_date DATE,
    end_date DATE,
    duration_days INTEGER,
    budget DECIMAL(15, 2),
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    sentiment planhub_sentiment NOT NULL DEFAULT 'moderate',
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate plan code if not provided
CREATE OR REPLACE FUNCTION planhub_generate_plan_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := UPPER(
            SUBSTRING(
                REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9 ]', '', 'g'),
                1, 3
            )
        ) || '-' || SUBSTRING(NEW.id::TEXT, 1, 4);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER planhub_plans_code_trigger
    BEFORE INSERT ON planhub_plans
    FOR EACH ROW
    EXECUTE FUNCTION planhub_generate_plan_code();

-- Tasks table (phases, tasks, milestones)
CREATE TABLE planhub_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES planhub_plans(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES planhub_tasks(id) ON DELETE CASCADE,
    wbs TEXT NOT NULL,
    name TEXT NOT NULL,
    type planhub_task_type NOT NULL DEFAULT 'task',
    days INTEGER DEFAULT 0,
    start_date DATE,
    end_date DATE,
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    is_expanded BOOLEAN NOT NULL DEFAULT TRUE,
    assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_date_range CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- Resources table
CREATE TABLE planhub_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES planhub_plans(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    assignment TEXT,
    utilization INTEGER NOT NULL DEFAULT 0 CHECK (utilization >= 0 AND utilization <= 100),
    start_date DATE,
    end_date DATE,
    vendor TEXT,
    skills TEXT[] DEFAULT '{}',
    notes TEXT,
    is_skeleton BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Versions table (plan snapshots)
CREATE TABLE planhub_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES planhub_plans(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    notes TEXT,
    is_baseline BOOLEAN NOT NULL DEFAULT FALSE,
    snapshot JSONB NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments table
CREATE TABLE planhub_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES planhub_plans(id) ON DELETE CASCADE,
    task_id UUID REFERENCES planhub_tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity log table
CREATE TABLE planhub_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planhub_plans(id) ON DELETE CASCADE,
    action planhub_audit_action NOT NULL,
    details JSONB DEFAULT '{}',
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ADMIN TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Plan templates
CREATE TABLE planhub_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    duration_days INTEGER NOT NULL DEFAULT 30,
    phases JSONB NOT NULL DEFAULT '[]',
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Module settings
CREATE TABLE planhub_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI configuration
CREATE TABLE planhub_ai_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_encrypted TEXT,
    model TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    temperature DECIMAL(2, 1) NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
    max_tokens INTEGER NOT NULL DEFAULT 2048,
    features_enabled JSONB NOT NULL DEFAULT '{
        "assistant_enabled": true,
        "suggestions_enabled": true,
        "risk_analysis_enabled": true,
        "report_generation_enabled": false
    }',
    updated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User roles in PlanHub
CREATE TABLE planhub_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role planhub_role NOT NULL DEFAULT 'viewer',
    granted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Permission definitions
CREATE TABLE planhub_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Role-permission mapping
CREATE TABLE planhub_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role planhub_role NOT NULL,
    permission_id UUID NOT NULL REFERENCES planhub_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(role, permission_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Plans indexes
CREATE INDEX idx_planhub_plans_status ON planhub_plans(status);
CREATE INDEX idx_planhub_plans_health ON planhub_plans(health);
CREATE INDEX idx_planhub_plans_lead ON planhub_plans(lead_id);
CREATE INDEX idx_planhub_plans_created_by ON planhub_plans(created_by);
CREATE INDEX idx_planhub_plans_created_at ON planhub_plans(created_at DESC);

-- Tasks indexes
CREATE INDEX idx_planhub_tasks_plan ON planhub_tasks(plan_id);
CREATE INDEX idx_planhub_tasks_parent ON planhub_tasks(parent_id);
CREATE INDEX idx_planhub_tasks_plan_parent ON planhub_tasks(plan_id, parent_id);
CREATE INDEX idx_planhub_tasks_assignee ON planhub_tasks(assignee_id);
CREATE INDEX idx_planhub_tasks_type ON planhub_tasks(type);
CREATE INDEX idx_planhub_tasks_position ON planhub_tasks(plan_id, position);

-- Resources indexes
CREATE INDEX idx_planhub_resources_plan ON planhub_resources(plan_id);
CREATE INDEX idx_planhub_resources_profile ON planhub_resources(profile_id);
CREATE INDEX idx_planhub_resources_skeleton ON planhub_resources(is_skeleton);
CREATE INDEX idx_planhub_resources_skills ON planhub_resources USING GIN(skills);

-- Activity log indexes
CREATE INDEX idx_planhub_activity_plan ON planhub_activity_log(plan_id);
CREATE INDEX idx_planhub_activity_user ON planhub_activity_log(user_id);
CREATE INDEX idx_planhub_activity_created ON planhub_activity_log(created_at DESC);
CREATE INDEX idx_planhub_activity_action ON planhub_activity_log(action);

-- Versions indexes
CREATE INDEX idx_planhub_versions_plan ON planhub_versions(plan_id);
CREATE INDEX idx_planhub_versions_baseline ON planhub_versions(plan_id, is_baseline);

-- Comments indexes
CREATE INDEX idx_planhub_comments_plan ON planhub_comments(plan_id);
CREATE INDEX idx_planhub_comments_task ON planhub_comments(task_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION planhub_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER planhub_plans_updated
    BEFORE UPDATE ON planhub_plans
    FOR EACH ROW EXECUTE FUNCTION planhub_update_timestamp();

CREATE TRIGGER planhub_tasks_updated
    BEFORE UPDATE ON planhub_tasks
    FOR EACH ROW EXECUTE FUNCTION planhub_update_timestamp();

CREATE TRIGGER planhub_resources_updated
    BEFORE UPDATE ON planhub_resources
    FOR EACH ROW EXECUTE FUNCTION planhub_update_timestamp();

CREATE TRIGGER planhub_templates_updated
    BEFORE UPDATE ON planhub_templates
    FOR EACH ROW EXECUTE FUNCTION planhub_update_timestamp();

CREATE TRIGGER planhub_settings_updated
    BEFORE UPDATE ON planhub_settings
    FOR EACH ROW EXECUTE FUNCTION planhub_update_timestamp();

CREATE TRIGGER planhub_ai_config_updated
    BEFORE UPDATE ON planhub_ai_config
    FOR EACH ROW EXECUTE FUNCTION planhub_update_timestamp();

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT LOGGING TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION planhub_log_plan_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO planhub_activity_log (plan_id, action, details, user_id)
        VALUES (NEW.id, 'create', jsonb_build_object('name', NEW.name), NEW.created_by);
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO planhub_activity_log (plan_id, action, details, user_id)
        VALUES (NEW.id, 'update', jsonb_build_object(
            'changes', jsonb_build_object(
                'name', CASE WHEN OLD.name != NEW.name THEN jsonb_build_object('old', OLD.name, 'new', NEW.name) ELSE NULL END,
                'status', CASE WHEN OLD.status != NEW.status THEN jsonb_build_object('old', OLD.status, 'new', NEW.status) ELSE NULL END,
                'health', CASE WHEN OLD.health != NEW.health THEN jsonb_build_object('old', OLD.health, 'new', NEW.health) ELSE NULL END
            )
        ), auth.uid());
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO planhub_activity_log (plan_id, action, details, user_id)
        VALUES (OLD.id, 'delete', jsonb_build_object('name', OLD.name), auth.uid());
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER planhub_plans_audit
    AFTER INSERT OR UPDATE OR DELETE ON planhub_plans
    FOR EACH ROW EXECUTE FUNCTION planhub_log_plan_activity();

CREATE OR REPLACE FUNCTION planhub_log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO planhub_activity_log (plan_id, action, details, user_id)
        VALUES (NEW.plan_id, 'create', jsonb_build_object('task_name', NEW.name, 'task_type', NEW.type), auth.uid());
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log significant changes
        IF OLD.progress != NEW.progress OR OLD.is_flagged != NEW.is_flagged OR OLD.name != NEW.name THEN
            INSERT INTO planhub_activity_log (plan_id, action, details, user_id)
            VALUES (NEW.plan_id, 'update', jsonb_build_object(
                'task_id', NEW.id,
                'task_name', NEW.name,
                'progress', CASE WHEN OLD.progress != NEW.progress THEN jsonb_build_object('old', OLD.progress, 'new', NEW.progress) ELSE NULL END,
                'flagged', CASE WHEN OLD.is_flagged != NEW.is_flagged THEN NEW.is_flagged ELSE NULL END
            ), auth.uid());
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER planhub_tasks_audit
    AFTER INSERT OR UPDATE ON planhub_tasks
    FOR EACH ROW EXECUTE FUNCTION planhub_log_task_activity();

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE planhub_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE planhub_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE planhub_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE planhub_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE planhub_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE planhub_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE planhub_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE planhub_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE planhub_ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE planhub_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE planhub_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE planhub_role_permissions ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role
CREATE OR REPLACE FUNCTION planhub_get_user_role(user_uuid UUID)
RETURNS planhub_role AS $$
DECLARE
    user_role planhub_role;
BEGIN
    SELECT role INTO user_role FROM planhub_user_roles WHERE user_id = user_uuid;
    RETURN COALESCE(user_role, 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION planhub_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN planhub_get_user_role(auth.uid()) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Plans policies
CREATE POLICY "Plans viewable by authenticated users"
    ON planhub_plans FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Plans insertable by editors and above"
    ON planhub_plans FOR INSERT
    TO authenticated
    WITH CHECK (planhub_get_user_role(auth.uid()) IN ('admin', 'manager', 'editor'));

CREATE POLICY "Plans updatable by editors and above"
    ON planhub_plans FOR UPDATE
    TO authenticated
    USING (planhub_get_user_role(auth.uid()) IN ('admin', 'manager', 'editor'))
    WITH CHECK (planhub_get_user_role(auth.uid()) IN ('admin', 'manager', 'editor'));

CREATE POLICY "Plans deletable by managers and above"
    ON planhub_plans FOR DELETE
    TO authenticated
    USING (planhub_get_user_role(auth.uid()) IN ('admin', 'manager'));

-- Tasks policies (inherit from plan access)
CREATE POLICY "Tasks viewable by authenticated users"
    ON planhub_tasks FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Tasks insertable by editors and above"
    ON planhub_tasks FOR INSERT
    TO authenticated
    WITH CHECK (planhub_get_user_role(auth.uid()) IN ('admin', 'manager', 'editor'));

CREATE POLICY "Tasks updatable by editors and above"
    ON planhub_tasks FOR UPDATE
    TO authenticated
    USING (planhub_get_user_role(auth.uid()) IN ('admin', 'manager', 'editor'));

CREATE POLICY "Tasks deletable by editors and above"
    ON planhub_tasks FOR DELETE
    TO authenticated
    USING (planhub_get_user_role(auth.uid()) IN ('admin', 'manager', 'editor'));

-- Resources policies
CREATE POLICY "Resources viewable by authenticated users"
    ON planhub_resources FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Resources insertable by managers and above"
    ON planhub_resources FOR INSERT
    TO authenticated
    WITH CHECK (planhub_get_user_role(auth.uid()) IN ('admin', 'manager'));

CREATE POLICY "Resources updatable by managers and above"
    ON planhub_resources FOR UPDATE
    TO authenticated
    USING (planhub_get_user_role(auth.uid()) IN ('admin', 'manager'));

CREATE POLICY "Resources deletable by managers and above"
    ON planhub_resources FOR DELETE
    TO authenticated
    USING (planhub_get_user_role(auth.uid()) IN ('admin', 'manager'));

-- Versions policies
CREATE POLICY "Versions viewable by authenticated users"
    ON planhub_versions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Versions creatable by editors and above"
    ON planhub_versions FOR INSERT
    TO authenticated
    WITH CHECK (planhub_get_user_role(auth.uid()) IN ('admin', 'manager', 'editor'));

-- Comments policies
CREATE POLICY "Comments viewable by authenticated users"
    ON planhub_comments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Comments creatable by authenticated users"
    ON planhub_comments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Comments deletable by owner or admin"
    ON planhub_comments FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by OR planhub_is_admin());

-- Activity log policies
CREATE POLICY "Activity log viewable by authenticated users"
    ON planhub_activity_log FOR SELECT
    TO authenticated
    USING (true);

-- Templates policies
CREATE POLICY "Templates viewable by authenticated users"
    ON planhub_templates FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Templates insertable by admins"
    ON planhub_templates FOR INSERT
    TO authenticated
    WITH CHECK (planhub_is_admin());

CREATE POLICY "Templates updatable by admins"
    ON planhub_templates FOR UPDATE
    TO authenticated
    USING (planhub_is_admin());

CREATE POLICY "Templates deletable by admins"
    ON planhub_templates FOR DELETE
    TO authenticated
    USING (planhub_is_admin());

-- Settings policies (admin only)
CREATE POLICY "Settings viewable by authenticated users"
    ON planhub_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Settings insertable by admins"
    ON planhub_settings FOR INSERT
    TO authenticated
    WITH CHECK (planhub_is_admin());

CREATE POLICY "Settings updatable by admins"
    ON planhub_settings FOR UPDATE
    TO authenticated
    USING (planhub_is_admin());

CREATE POLICY "Settings deletable by admins"
    ON planhub_settings FOR DELETE
    TO authenticated
    USING (planhub_is_admin());

-- AI config policies (admin only)
CREATE POLICY "AI config viewable by authenticated users"
    ON planhub_ai_config FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "AI config insertable by admins"
    ON planhub_ai_config FOR INSERT
    TO authenticated
    WITH CHECK (planhub_is_admin());

CREATE POLICY "AI config updatable by admins"
    ON planhub_ai_config FOR UPDATE
    TO authenticated
    USING (planhub_is_admin());

CREATE POLICY "AI config deletable by admins"
    ON planhub_ai_config FOR DELETE
    TO authenticated
    USING (planhub_is_admin());

-- User roles policies
CREATE POLICY "User roles viewable by authenticated users"
    ON planhub_user_roles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "User roles insertable by admins"
    ON planhub_user_roles FOR INSERT
    TO authenticated
    WITH CHECK (planhub_is_admin());

CREATE POLICY "User roles updatable by admins"
    ON planhub_user_roles FOR UPDATE
    TO authenticated
    USING (planhub_is_admin());

CREATE POLICY "User roles deletable by admins"
    ON planhub_user_roles FOR DELETE
    TO authenticated
    USING (planhub_is_admin());

-- Permissions policies
CREATE POLICY "Permissions viewable by authenticated users"
    ON planhub_permissions FOR SELECT
    TO authenticated
    USING (true);

-- Role permissions policies
CREATE POLICY "Role permissions viewable by authenticated users"
    ON planhub_role_permissions FOR SELECT
    TO authenticated
    USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS FOR API
-- ═══════════════════════════════════════════════════════════════════════════════

-- Get plan with all relations
CREATE OR REPLACE FUNCTION planhub_get_plan_full(plan_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'plan', row_to_json(p.*),
        'lead', CASE WHEN p.lead_id IS NOT NULL THEN row_to_json(lead.*) ELSE NULL END,
        'tasks', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'task', row_to_json(t.*),
                    'assignee', CASE WHEN t.assignee_id IS NOT NULL THEN row_to_json(a.*) ELSE NULL END
                )
                ORDER BY t.position
            )
            FROM planhub_tasks t
            LEFT JOIN profiles a ON t.assignee_id = a.id
            WHERE t.plan_id = p.id
        ), '[]'::jsonb),
        'resources', COALESCE((
            SELECT jsonb_agg(row_to_json(r.*))
            FROM planhub_resources r
            WHERE r.plan_id = p.id
        ), '[]'::jsonb),
        'versions', COALESCE((
            SELECT jsonb_agg(row_to_json(v.*) ORDER BY v.created_at DESC)
            FROM planhub_versions v
            WHERE v.plan_id = p.id
        ), '[]'::jsonb),
        'comments', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'comment', row_to_json(c.*),
                    'author', row_to_json(ca.*)
                )
                ORDER BY c.created_at DESC
            )
            FROM planhub_comments c
            JOIN profiles ca ON c.created_by = ca.id
            WHERE c.plan_id = p.id
        ), '[]'::jsonb)
    ) INTO result
    FROM planhub_plans p
    LEFT JOIN profiles lead ON p.lead_id = lead.id
    WHERE p.id = plan_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create plan version snapshot
CREATE OR REPLACE FUNCTION planhub_create_version(
    plan_uuid UUID,
    version_tag TEXT,
    version_notes TEXT DEFAULT NULL,
    set_baseline BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    new_version_id UUID;
    plan_snapshot JSONB;
BEGIN
    -- Build snapshot
    SELECT jsonb_build_object(
        'plan', (SELECT row_to_json(p.*) FROM planhub_plans p WHERE p.id = plan_uuid),
        'tasks', (SELECT COALESCE(jsonb_agg(row_to_json(t.*)), '[]'::jsonb) FROM planhub_tasks t WHERE t.plan_id = plan_uuid),
        'resources', (SELECT COALESCE(jsonb_agg(row_to_json(r.*)), '[]'::jsonb) FROM planhub_resources r WHERE r.plan_id = plan_uuid)
    ) INTO plan_snapshot;
    
    -- If setting as baseline, remove baseline from other versions
    IF set_baseline THEN
        UPDATE planhub_versions SET is_baseline = FALSE WHERE plan_id = plan_uuid;
    END IF;
    
    -- Insert version
    INSERT INTO planhub_versions (plan_id, tag, notes, is_baseline, snapshot, created_by)
    VALUES (plan_uuid, version_tag, version_notes, set_baseline, plan_snapshot, auth.uid())
    RETURNING id INTO new_version_id;
    
    RETURN new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore plan from version
CREATE OR REPLACE FUNCTION planhub_restore_version(version_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_record RECORD;
    task_data JSONB;
    resource_data JSONB;
BEGIN
    -- Get version
    SELECT * INTO v_record FROM planhub_versions WHERE id = version_uuid;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update plan
    UPDATE planhub_plans SET
        name = (v_record.snapshot->'plan'->>'name'),
        description = (v_record.snapshot->'plan'->>'description'),
        status = (v_record.snapshot->'plan'->>'status')::planhub_plan_status,
        health = (v_record.snapshot->'plan'->>'health')::planhub_plan_health,
        budget = (v_record.snapshot->'plan'->>'budget')::DECIMAL,
        confidence = (v_record.snapshot->'plan'->>'confidence')::INTEGER,
        sentiment = (v_record.snapshot->'plan'->>'sentiment')::planhub_sentiment
    WHERE id = v_record.plan_id;
    
    -- Delete existing tasks
    DELETE FROM planhub_tasks WHERE plan_id = v_record.plan_id;
    
    -- Restore tasks
    FOR task_data IN SELECT * FROM jsonb_array_elements(v_record.snapshot->'tasks')
    LOOP
        INSERT INTO planhub_tasks (
            id, plan_id, parent_id, wbs, name, type, days, start_date, end_date,
            progress, is_flagged, is_expanded, assignee_id, position
        ) VALUES (
            (task_data->>'id')::UUID,
            v_record.plan_id,
            (task_data->>'parent_id')::UUID,
            task_data->>'wbs',
            task_data->>'name',
            (task_data->>'type')::planhub_task_type,
            (task_data->>'days')::INTEGER,
            (task_data->>'start_date')::DATE,
            (task_data->>'end_date')::DATE,
            (task_data->>'progress')::INTEGER,
            (task_data->>'is_flagged')::BOOLEAN,
            (task_data->>'is_expanded')::BOOLEAN,
            (task_data->>'assignee_id')::UUID,
            (task_data->>'position')::INTEGER
        );
    END LOOP;
    
    -- Log restore action
    INSERT INTO planhub_activity_log (plan_id, action, details, user_id)
    VALUES (v_record.plan_id, 'restore', jsonb_build_object('version_tag', v_record.tag), auth.uid());
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reorder tasks
CREATE OR REPLACE FUNCTION planhub_reorder_tasks(task_positions JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    task_item JSONB;
BEGIN
    FOR task_item IN SELECT * FROM jsonb_array_elements(task_positions)
    LOOP
        UPDATE planhub_tasks 
        SET position = (task_item->>'position')::INTEGER,
            parent_id = (task_item->>'parent_id')::UUID
        WHERE id = (task_item->>'id')::UUID;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get admin statistics
CREATE OR REPLACE FUNCTION planhub_get_admin_stats()
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object(
        'total_plans', (SELECT COUNT(*) FROM planhub_plans),
        'active_plans', (SELECT COUNT(*) FROM planhub_plans WHERE status = 'active'),
        'total_users', (SELECT COUNT(*) FROM planhub_user_roles),
        'total_templates', (SELECT COUNT(*) FROM planhub_templates),
        'plans_by_health', (
            SELECT jsonb_object_agg(health, count)
            FROM (SELECT health, COUNT(*) as count FROM planhub_plans GROUP BY health) h
        ),
        'plans_by_status', (
            SELECT jsonb_object_agg(status, count)
            FROM (SELECT status, COUNT(*) as count FROM planhub_plans GROUP BY status) s
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════════

-- Insert default permissions
INSERT INTO planhub_permissions (name, description) VALUES
    ('view_plans', 'View all plans'),
    ('create_plans', 'Create new plans'),
    ('edit_plans', 'Edit existing plans'),
    ('delete_plans', 'Delete plans'),
    ('manage_resources', 'Manage resource assignments'),
    ('view_reports', 'View reports'),
    ('export_data', 'Export plan data'),
    ('use_ai_assistant', 'Use AI assistant'),
    ('admin_access', 'Access admin panel'),
    ('manage_users', 'Manage user roles'),
    ('manage_templates', 'Manage plan templates'),
    ('manage_settings', 'Manage module settings');

-- Map permissions to roles
INSERT INTO planhub_role_permissions (role, permission_id)
SELECT 'admin', id FROM planhub_permissions;

INSERT INTO planhub_role_permissions (role, permission_id)
SELECT 'manager', id FROM planhub_permissions 
WHERE name NOT IN ('admin_access', 'manage_users', 'manage_settings');

INSERT INTO planhub_role_permissions (role, permission_id)
SELECT 'editor', id FROM planhub_permissions 
WHERE name IN ('view_plans', 'create_plans', 'edit_plans', 'view_reports', 'export_data', 'use_ai_assistant');

INSERT INTO planhub_role_permissions (role, permission_id)
SELECT 'viewer', id FROM planhub_permissions 
WHERE name IN ('view_plans', 'view_reports');

-- ═══════════════════════════════════════════════════════════════════════════════
-- REALTIME SUBSCRIPTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE planhub_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE planhub_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE planhub_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE planhub_activity_log;