-- ════════════════════════════════════════════════════════════════════════════
-- CATALYST SPACES MODULE - DATABASE SCHEMA
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- ENUM TYPES
-- ════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    CREATE TYPE space_type AS ENUM ('kanban', 'business', 'service');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE space_status AS ENUM ('active', 'archived', 'trashed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE space_access AS ENUM ('private', 'team', 'organization');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE member_role AS ENUM ('administrator', 'member', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE version_status AS ENUM ('unreleased', 'released', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- SPACE CATEGORIES TABLE (must be created before spaces for FK)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS space_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#64748b',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default categories
INSERT INTO space_categories (name, description, color, sort_order) VALUES
    ('Engineering', 'Software development and technical projects', '#2563eb', 1),
    ('Product', 'Product management and feature development', '#0d9488', 2),
    ('Marketing', 'Marketing campaigns and communications', '#d97706', 3),
    ('Operations', 'Business operations and processes', '#8b5cf6', 4),
    ('Finance', 'Financial planning and reporting', '#10b981', 5),
    ('HR', 'Human resources and talent management', '#ec4899', 6)
ON CONFLICT (name) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- SPACES TABLE
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core fields
    name VARCHAR(80) NOT NULL,
    key VARCHAR(10) NOT NULL UNIQUE,
    description TEXT,
    
    -- Type and status
    type space_type NOT NULL DEFAULT 'kanban',
    status space_status NOT NULL DEFAULT 'active',
    access space_access NOT NULL DEFAULT 'private',
    
    -- Visual
    color VARCHAR(7) NOT NULL DEFAULT '#2563eb',
    avatar_url TEXT,
    
    -- Relationships
    lead_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category_id UUID REFERENCES space_categories(id) ON DELETE SET NULL,
    
    -- External links
    external_url TEXT,
    
    -- Settings
    default_assignee VARCHAR(20) DEFAULT 'unassigned',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    trashed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_spaces_status ON spaces(status);
CREATE INDEX IF NOT EXISTS idx_spaces_type ON spaces(type);
CREATE INDEX IF NOT EXISTS idx_spaces_category ON spaces(category_id);
CREATE INDEX IF NOT EXISTS idx_spaces_lead ON spaces(lead_id);
CREATE INDEX IF NOT EXISTS idx_spaces_key ON spaces(key);

-- ════════════════════════════════════════════════════════════════════════════
-- SPACE MEMBERS TABLE
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS space_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(space_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_space_members_space ON space_members(space_id);
CREATE INDEX IF NOT EXISTS idx_space_members_user ON space_members(user_id);
CREATE INDEX IF NOT EXISTS idx_space_members_role ON space_members(role);

-- ════════════════════════════════════════════════════════════════════════════
-- SPACE COMPONENTS TABLE
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS space_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    lead_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    default_assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(space_id, name)
);

CREATE INDEX IF NOT EXISTS idx_space_components_space ON space_components(space_id);
CREATE INDEX IF NOT EXISTS idx_space_components_lead ON space_components(lead_id);

-- ════════════════════════════════════════════════════════════════════════════
-- SPACE VERSIONS TABLE
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS space_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    status version_status NOT NULL DEFAULT 'unreleased',
    start_date DATE,
    release_date DATE,
    actual_release_date DATE,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    total_issues INT DEFAULT 0,
    completed_issues INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    released_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    UNIQUE(space_id, name)
);

CREATE INDEX IF NOT EXISTS idx_space_versions_space ON space_versions(space_id);
CREATE INDEX IF NOT EXISTS idx_space_versions_status ON space_versions(status);
CREATE INDEX IF NOT EXISTS idx_space_versions_release ON space_versions(release_date);

-- ════════════════════════════════════════════════════════════════════════════
-- SPACE FEATURES TABLE
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS space_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    board_enabled BOOLEAN NOT NULL DEFAULT true,
    backlog_enabled BOOLEAN NOT NULL DEFAULT true,
    timeline_enabled BOOLEAN NOT NULL DEFAULT true,
    releases_enabled BOOLEAN NOT NULL DEFAULT true,
    reports_enabled BOOLEAN NOT NULL DEFAULT true,
    automation_enabled BOOLEAN NOT NULL DEFAULT true,
    code_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(space_id)
);

-- ════════════════════════════════════════════════════════════════════════════
-- SPACE PERMISSIONS TABLE
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS space_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    permission_key VARCHAR(50) NOT NULL,
    administrator BOOLEAN NOT NULL DEFAULT false,
    member BOOLEAN NOT NULL DEFAULT false,
    viewer BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(space_id, permission_key)
);

-- ════════════════════════════════════════════════════════════════════════════
-- SPACE STARRED (User favorites)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS space_starred (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(space_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_space_starred_user ON space_starred(user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- SPACE ACTIVITY LOG
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS space_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_space_activity_space ON space_activity(space_id);
CREATE INDEX IF NOT EXISTS idx_space_activity_user ON space_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_space_activity_created ON space_activity(created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- TRIGGERS FOR UPDATED_AT
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_spaces_updated_at ON spaces;
CREATE TRIGGER update_spaces_updated_at
    BEFORE UPDATE ON spaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_space_members_updated_at ON space_members;
CREATE TRIGGER update_space_members_updated_at
    BEFORE UPDATE ON space_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_space_components_updated_at ON space_components;
CREATE TRIGGER update_space_components_updated_at
    BEFORE UPDATE ON space_components
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_space_versions_updated_at ON space_versions;
CREATE TRIGGER update_space_versions_updated_at
    BEFORE UPDATE ON space_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_space_features_updated_at ON space_features;
CREATE TRIGGER update_space_features_updated_at
    BEFORE UPDATE ON space_features
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_space_permissions_updated_at ON space_permissions;
CREATE TRIGGER update_space_permissions_updated_at
    BEFORE UPDATE ON space_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_space_categories_updated_at ON space_categories;
CREATE TRIGGER update_space_categories_updated_at
    BEFORE UPDATE ON space_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ════════════════════════════════════════════════════════════════════════════
-- FUNCTION TO CREATE DEFAULT PERMISSIONS FOR NEW SPACE
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_default_space_permissions(p_space_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO space_permissions (space_id, permission_key, administrator, member, viewer) VALUES
        (p_space_id, 'browse_space', true, true, true),
        (p_space_id, 'create_work_items', true, true, false),
        (p_space_id, 'edit_work_items', true, true, false),
        (p_space_id, 'delete_work_items', true, false, false),
        (p_space_id, 'transition_work_items', true, true, false),
        (p_space_id, 'assign_work_items', true, true, false),
        (p_space_id, 'schedule_work_items', true, true, false),
        (p_space_id, 'manage_versions', true, false, false),
        (p_space_id, 'manage_components', true, false, false),
        (p_space_id, 'administer_space', true, false, false)
    ON CONFLICT (space_id, permission_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════════════════
-- TRIGGER TO AUTO-CREATE FEATURES AND PERMISSIONS ON NEW SPACE
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION on_space_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default features
    INSERT INTO space_features (space_id)
    VALUES (NEW.id)
    ON CONFLICT (space_id) DO NOTHING;
    
    -- Create default permissions
    PERFORM create_default_space_permissions(NEW.id);
    
    -- Add creator as administrator
    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO space_members (space_id, user_id, role, added_by)
        VALUES (NEW.id, NEW.created_by, 'administrator', NEW.created_by)
        ON CONFLICT (space_id, user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_on_space_created ON spaces;
CREATE TRIGGER trigger_on_space_created
    AFTER INSERT ON spaces
    FOR EACH ROW
    EXECUTE FUNCTION on_space_created();

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_starred ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_activity ENABLE ROW LEVEL SECURITY;

-- Categories are readable by everyone
CREATE POLICY space_categories_select ON space_categories FOR SELECT USING (true);

-- Spaces: Users can see spaces they're members of, or organization-access spaces
CREATE POLICY spaces_select ON spaces FOR SELECT USING (
    access = 'organization' OR
    EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = spaces.id
        AND space_members.user_id = auth.uid()
    )
);

-- Spaces: Authenticated users can create spaces
CREATE POLICY spaces_insert ON spaces FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Spaces: Only administrators can update spaces
CREATE POLICY spaces_update ON spaces FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = spaces.id
        AND space_members.user_id = auth.uid()
        AND space_members.role = 'administrator'
    )
);

-- Spaces: Only administrators can delete spaces
CREATE POLICY spaces_delete ON spaces FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = spaces.id
        AND space_members.user_id = auth.uid()
        AND space_members.role = 'administrator'
    )
);

-- Members: Viewable by other members
CREATE POLICY space_members_select ON space_members FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM space_members sm
        WHERE sm.space_id = space_members.space_id
        AND sm.user_id = auth.uid()
    )
);

-- Members: Administrators can add members
CREATE POLICY space_members_insert ON space_members FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM space_members sm
        WHERE sm.space_id = space_members.space_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'administrator'
    )
);

-- Members: Administrators can update members
CREATE POLICY space_members_update ON space_members FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM space_members sm
        WHERE sm.space_id = space_members.space_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'administrator'
    )
);

-- Members: Administrators can remove members
CREATE POLICY space_members_delete ON space_members FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM space_members sm
        WHERE sm.space_id = space_members.space_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'administrator'
    )
);

-- Components: Viewable by space members
CREATE POLICY space_components_select ON space_components FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = space_components.space_id
        AND space_members.user_id = auth.uid()
    )
);

-- Components: Administrators can manage
CREATE POLICY space_components_insert ON space_components FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = space_components.space_id
        AND space_members.user_id = auth.uid()
        AND space_members.role = 'administrator'
    )
);

CREATE POLICY space_components_update ON space_components FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = space_components.space_id
        AND space_members.user_id = auth.uid()
        AND space_members.role = 'administrator'
    )
);

CREATE POLICY space_components_delete ON space_components FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = space_components.space_id
        AND space_members.user_id = auth.uid()
        AND space_members.role = 'administrator'
    )
);

-- Versions: Same pattern as components
CREATE POLICY space_versions_select ON space_versions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = space_versions.space_id
        AND space_members.user_id = auth.uid()
    )
);

CREATE POLICY space_versions_insert ON space_versions FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = space_versions.space_id
        AND space_members.user_id = auth.uid()
        AND space_members.role = 'administrator'
    )
);

CREATE POLICY space_versions_update ON space_versions FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = space_versions.space_id
        AND space_members.user_id = auth.uid()
        AND space_members.role = 'administrator'
    )
);

CREATE POLICY space_versions_delete ON space_versions FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = space_versions.space_id
        AND space_members.user_id = auth.uid()
        AND space_members.role = 'administrator'
    )
);

-- Features: Viewable by members, manageable by admins
CREATE POLICY space_features_select ON space_features FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = space_features.space_id
        AND space_members.user_id = auth.uid()
    )
);

CREATE POLICY space_features_update ON space_features FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = space_features.space_id
        AND space_members.user_id = auth.uid()
        AND space_members.role = 'administrator'
    )
);

-- Permissions: Viewable by members, manageable by admins
CREATE POLICY space_permissions_select ON space_permissions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = space_permissions.space_id
        AND space_members.user_id = auth.uid()
    )
);

CREATE POLICY space_permissions_update ON space_permissions FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = space_permissions.space_id
        AND space_members.user_id = auth.uid()
        AND space_members.role = 'administrator'
    )
);

-- Starred: Users can manage their own stars
CREATE POLICY space_starred_all ON space_starred FOR ALL USING (
    user_id = auth.uid()
);

-- Activity: Viewable by space members
CREATE POLICY space_activity_select ON space_activity FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = space_activity.space_id
        AND space_members.user_id = auth.uid()
    )
);

-- Activity: Members can insert activity
CREATE POLICY space_activity_insert ON space_activity FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = space_activity.space_id
        AND space_members.user_id = auth.uid()
    )
);