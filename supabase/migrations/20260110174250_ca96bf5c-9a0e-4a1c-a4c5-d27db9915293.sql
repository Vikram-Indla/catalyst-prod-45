-- =====================================================
-- REQUIREMENT ASSIST™ - SUPABASE DATABASE SCHEMA
-- Catalyst Enterprise Platform
-- Version: 1.1 (CORRECTED)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE ra_generation_status AS ENUM ('draft', 'processing', 'published', 'failed');
CREATE TYPE ra_item_type AS ENUM ('prd', 'epic', 'feature', 'story');
CREATE TYPE ra_template_type AS ENUM ('prd', 'epic', 'feature', 'story');
CREATE TYPE ra_user_role AS ENUM ('admin', 'manager', 'user', 'viewer');
CREATE TYPE ra_compliance_framework AS ENUM ('dga', 'nca', 'babok');

-- =====================================================
-- USER ROLES (separate from user_profiles)
-- =====================================================

CREATE TABLE ra_user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role ra_user_role DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =====================================================
-- SECURITY DEFINER FUNCTIONS (avoids RLS recursion)
-- =====================================================

CREATE OR REPLACE FUNCTION has_ra_role(required_role ra_user_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM ra_user_roles
        WHERE user_id = auth.uid()
        AND role = required_role
    );
END;
$$;

CREATE OR REPLACE FUNCTION has_ra_role_any(required_roles ra_user_role[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM ra_user_roles
        WHERE user_id = auth.uid()
        AND role = ANY(required_roles)
    );
END;
$$;

CREATE OR REPLACE FUNCTION get_ra_user_role()
RETURNS ra_user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role ra_user_role;
BEGIN
    SELECT role INTO user_role
    FROM ra_user_roles
    WHERE user_id = auth.uid();
    
    RETURN COALESCE(user_role, 'viewer'::ra_user_role);
END;
$$;

-- =====================================================
-- GENERATIONS (main entity)
-- =====================================================

CREATE TABLE ra_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_number SERIAL,
    display_id TEXT GENERATED ALWAYS AS ('GEN-' || LPAD(generation_number::TEXT, 4, '0')) STORED,
    title TEXT NOT NULL,
    program_id UUID,
    project_id UUID,
    user_id UUID REFERENCES auth.users(id),
    status ra_generation_status DEFAULT 'draft',
    input_text TEXT,
    input_file_url TEXT,
    input_file_name TEXT,
    input_word_count INTEGER DEFAULT 0,
    ai_model TEXT DEFAULT 'claude-3.5-sonnet',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 4000,
    tokens_used INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    output_prd BOOLEAN DEFAULT TRUE,
    output_epics BOOLEAN DEFAULT TRUE,
    output_features BOOLEAN DEFAULT TRUE,
    output_stories BOOLEAN DEFAULT TRUE,
    output_test_cases BOOLEAN DEFAULT FALSE,
    output_acceptance_criteria BOOLEAN DEFAULT TRUE,
    compliance_dga BOOLEAN DEFAULT TRUE,
    compliance_nca BOOLEAN DEFAULT TRUE,
    compliance_babok BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_ra_generations_user ON ra_generations(user_id);
CREATE INDEX idx_ra_generations_status ON ra_generations(status);
CREATE INDEX idx_ra_generations_created ON ra_generations(created_at DESC);
CREATE INDEX idx_ra_generations_program ON ra_generations(program_id);

-- =====================================================
-- GENERATED ITEMS (PRDs, Epics, Features, Stories)
-- =====================================================

CREATE TABLE ra_generated_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_id UUID NOT NULL REFERENCES ra_generations(id) ON DELETE CASCADE,
    item_type ra_item_type NOT NULL,
    item_number SERIAL,
    display_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    acceptance_criteria TEXT,
    parent_id UUID REFERENCES ra_generated_items(id),
    sort_order INTEGER DEFAULT 0,
    confidence_score DECIMAL(5,2),
    confidence_breakdown JSONB,
    compliance_results JSONB,
    is_published BOOLEAN DEFAULT FALSE,
    is_linked BOOLEAN DEFAULT FALSE,
    external_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ra_items_generation ON ra_generated_items(generation_id);
CREATE INDEX idx_ra_items_type ON ra_generated_items(item_type);
CREATE INDEX idx_ra_items_parent ON ra_generated_items(parent_id);

-- =====================================================
-- TEMPLATES
-- =====================================================

CREATE TABLE ra_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    template_type ra_template_type NOT NULL,
    description TEXT,
    template_content TEXT NOT NULL,
    version TEXT DEFAULT '1.0',
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ra_templates_type ON ra_templates(template_type);

-- =====================================================
-- COMPLIANCE RULES
-- =====================================================

CREATE TABLE ra_compliance_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework ra_compliance_framework NOT NULL,
    rule_code TEXT NOT NULL,
    rule_name TEXT NOT NULL,
    rule_description TEXT,
    validation_prompt TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(framework, rule_code)
);

CREATE INDEX idx_ra_compliance_framework ON ra_compliance_rules(framework);

-- =====================================================
-- GLOSSARY (Translation Terms)
-- =====================================================

CREATE TABLE ra_glossary_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    english_term TEXT NOT NULL,
    arabic_translation TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(english_term)
);

CREATE INDEX idx_ra_glossary_category ON ra_glossary_terms(category);

-- =====================================================
-- AI SETTINGS
-- =====================================================

CREATE TABLE ra_ai_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ai_model TEXT DEFAULT 'claude-3.5-sonnet',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 4000,
    system_prompt TEXT,
    auto_translation BOOLEAN DEFAULT TRUE,
    compliance_validation BOOLEAN DEFAULT TRUE,
    confidence_scoring BOOLEAN DEFAULT TRUE,
    draft_auto_save BOOLEAN DEFAULT TRUE,
    primary_language TEXT DEFAULT 'en',
    secondary_language TEXT DEFAULT 'ar',
    auto_detect_language BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ANALYTICS
-- =====================================================

CREATE TABLE ra_analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    generations_count INTEGER DEFAULT 0,
    items_generated INTEGER DEFAULT 0,
    avg_confidence DECIMAL(5,2),
    avg_processing_time_ms INTEGER,
    total_tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ra_analytics_date ON ra_analytics_daily(date DESC);

-- =====================================================
-- AUDIT LOG
-- =====================================================

CREATE TABLE ra_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ra_audit_user ON ra_audit_log(user_id);
CREATE INDEX idx_ra_audit_entity ON ra_audit_log(entity_type, entity_id);
CREATE INDEX idx_ra_audit_created ON ra_audit_log(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE ra_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ra_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ra_generated_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ra_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ra_glossary_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ra_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ra_compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ra_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE ra_audit_log ENABLE ROW LEVEL SECURITY;

-- User Roles policies
CREATE POLICY "Users can view own role" ON ra_user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles" ON ra_user_roles
    FOR ALL USING (has_ra_role('admin'::ra_user_role));

-- Generations policies
CREATE POLICY "Users can view own or published generations" ON ra_generations
    FOR SELECT USING (
        user_id = auth.uid() 
        OR status = 'published'
        OR has_ra_role_any(ARRAY['admin', 'manager']::ra_user_role[])
    );

CREATE POLICY "Users can create generations" ON ra_generations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own generations" ON ra_generations
    FOR UPDATE USING (
        user_id = auth.uid()
        OR has_ra_role_any(ARRAY['admin', 'manager']::ra_user_role[])
    );

CREATE POLICY "Admins and managers can delete" ON ra_generations
    FOR DELETE USING (
        user_id = auth.uid()
        OR has_ra_role_any(ARRAY['admin', 'manager']::ra_user_role[])
    );

-- Generated Items policies
CREATE POLICY "Items follow generation access" ON ra_generated_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ra_generations g 
            WHERE g.id = generation_id 
            AND (g.user_id = auth.uid() OR g.status = 'published')
        )
        OR has_ra_role_any(ARRAY['admin', 'manager']::ra_user_role[])
    );

CREATE POLICY "Users can manage items in own generations" ON ra_generated_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM ra_generations g 
            WHERE g.id = generation_id 
            AND g.user_id = auth.uid()
        )
        OR has_ra_role_any(ARRAY['admin', 'manager']::ra_user_role[])
    );

-- Templates policies
CREATE POLICY "Anyone can view active templates" ON ra_templates
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage templates" ON ra_templates
    FOR ALL USING (has_ra_role('admin'::ra_user_role));

-- Compliance Rules policies
CREATE POLICY "Anyone can view compliance rules" ON ra_compliance_rules
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage compliance rules" ON ra_compliance_rules
    FOR ALL USING (has_ra_role('admin'::ra_user_role));

-- Glossary policies
CREATE POLICY "Anyone can view glossary" ON ra_glossary_terms
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage glossary" ON ra_glossary_terms
    FOR ALL USING (has_ra_role('admin'::ra_user_role));

-- AI Settings policies
CREATE POLICY "Anyone can view settings" ON ra_ai_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage settings" ON ra_ai_settings
    FOR ALL USING (has_ra_role('admin'::ra_user_role));

-- Analytics policies
CREATE POLICY "Anyone can view analytics" ON ra_analytics_daily
    FOR SELECT USING (true);

CREATE POLICY "System can manage analytics" ON ra_analytics_daily
    FOR ALL USING (has_ra_role('admin'::ra_user_role));

-- Audit Log policies
CREATE POLICY "Users can view own audit entries" ON ra_audit_log
    FOR SELECT USING (user_id = auth.uid() OR has_ra_role('admin'::ra_user_role));

CREATE POLICY "System can create audit entries" ON ra_audit_log
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION ra_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ra_user_roles_updated_at
    BEFORE UPDATE ON ra_user_roles
    FOR EACH ROW EXECUTE FUNCTION ra_update_updated_at();

CREATE TRIGGER update_ra_generations_updated_at
    BEFORE UPDATE ON ra_generations
    FOR EACH ROW EXECUTE FUNCTION ra_update_updated_at();

CREATE TRIGGER update_ra_generated_items_updated_at
    BEFORE UPDATE ON ra_generated_items
    FOR EACH ROW EXECUTE FUNCTION ra_update_updated_at();

CREATE TRIGGER update_ra_templates_updated_at
    BEFORE UPDATE ON ra_templates
    FOR EACH ROW EXECUTE FUNCTION ra_update_updated_at();

CREATE TRIGGER update_ra_glossary_updated_at
    BEFORE UPDATE ON ra_glossary_terms
    FOR EACH ROW EXECUTE FUNCTION ra_update_updated_at();

CREATE TRIGGER update_ra_ai_settings_updated_at
    BEFORE UPDATE ON ra_ai_settings
    FOR EACH ROW EXECUTE FUNCTION ra_update_updated_at();

-- Generate display_id for items
CREATE OR REPLACE FUNCTION ra_generate_item_display_id()
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT;
    next_num INTEGER;
BEGIN
    CASE NEW.item_type
        WHEN 'prd' THEN prefix := 'PRD-';
        WHEN 'epic' THEN prefix := 'EPIC-';
        WHEN 'feature' THEN prefix := 'FEAT-';
        WHEN 'story' THEN prefix := 'US-';
    END CASE;
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(display_id FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1
    INTO next_num
    FROM ra_generated_items
    WHERE item_type = NEW.item_type;
    
    NEW.display_id := prefix || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ra_generate_item_id
    BEFORE INSERT ON ra_generated_items
    FOR EACH ROW EXECUTE FUNCTION ra_generate_item_display_id();

-- =====================================================
-- VIEWS
-- =====================================================

CREATE VIEW ra_generation_summary AS
SELECT 
    g.id,
    g.display_id,
    g.title,
    g.status,
    g.created_at,
    g.updated_at,
    g.published_at,
    g.program_id,
    g.project_id,
    g.user_id,
    COUNT(CASE WHEN gi.item_type = 'prd' THEN 1 END) as prd_count,
    COUNT(CASE WHEN gi.item_type = 'epic' THEN 1 END) as epic_count,
    COUNT(CASE WHEN gi.item_type = 'feature' THEN 1 END) as feature_count,
    COUNT(CASE WHEN gi.item_type = 'story' THEN 1 END) as story_count,
    AVG(gi.confidence_score) as avg_confidence
FROM ra_generations g
LEFT JOIN ra_generated_items gi ON g.id = gi.generation_id
WHERE g.deleted_at IS NULL
GROUP BY g.id;

-- =====================================================
-- REALTIME SUBSCRIPTIONS
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE ra_generations;
ALTER PUBLICATION supabase_realtime ADD TABLE ra_generated_items;