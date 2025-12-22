-- =====================================================
-- CATALYST VIEWS FOUNDATION SCHEMA
-- Module 0: Core tables for Board, Timeline, Feature Map
-- =====================================================

-- -----------------------------------------------------
-- Table: work_item_dependencies
-- Purpose: Stores blocking dependencies (subset of links)
-- This is optimized for dependency visualization
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_item_dependencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- The item that depends on another (is blocked)
    dependent_type TEXT NOT NULL CHECK (dependent_type IN ('feature', 'story')),
    dependent_id UUID NOT NULL,
    
    -- The item that must complete first (blocker)
    blocker_type TEXT NOT NULL CHECK (blocker_type IN ('feature', 'story')),
    blocker_id UUID NOT NULL,
    
    -- Dependency metadata
    dependency_type TEXT NOT NULL DEFAULT 'finish_to_start' CHECK (dependency_type IN (
        'finish_to_start',
        'start_to_start',
        'finish_to_finish',
        'start_to_finish'
    )),
    
    -- Status tracking
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate dependencies
    UNIQUE(dependent_type, dependent_id, blocker_type, blocker_id)
);

-- Indexes for dependency queries
CREATE INDEX IF NOT EXISTS idx_dependencies_dependent ON public.work_item_dependencies(dependent_type, dependent_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_blocker ON public.work_item_dependencies(blocker_type, blocker_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_resolved ON public.work_item_dependencies(is_resolved);

-- -----------------------------------------------------
-- Table: view_preferences
-- Purpose: Stores user preferences for each view
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.view_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    
    -- View type
    view_type TEXT NOT NULL CHECK (view_type IN ('board', 'timeline', 'feature_map')),
    
    -- Preferences as JSON
    preferences JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One preference record per user/project/view
    UNIQUE(user_id, project_id, view_type)
);

-- Index for fast preference lookups
CREATE INDEX IF NOT EXISTS idx_view_preferences_lookup ON public.view_preferences(user_id, project_id, view_type);

-- -----------------------------------------------------
-- Add columns to existing tables if they don't exist
-- -----------------------------------------------------

-- Add status column to features if not exists (for Board view)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'features' AND column_name = 'workflow_status') THEN
        ALTER TABLE public.features ADD COLUMN workflow_status TEXT DEFAULT 'backlog';
    END IF;
END $$;

-- Add timeline fields to features if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'features' AND column_name = 'planned_start_date') THEN
        ALTER TABLE public.features ADD COLUMN planned_start_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'features' AND column_name = 'planned_end_date') THEN
        ALTER TABLE public.features ADD COLUMN planned_end_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'features' AND column_name = 'actual_start_date') THEN
        ALTER TABLE public.features ADD COLUMN actual_start_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'features' AND column_name = 'actual_end_date') THEN
        ALTER TABLE public.features ADD COLUMN actual_end_date DATE;
    END IF;
END $$;

-- Add WIP limit to workflow configuration
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'wip_limits') THEN
        ALTER TABLE public.projects ADD COLUMN wip_limits JSONB DEFAULT '{
            "design": 3,
            "ready_for_dev": 5,
            "in_development": 4,
            "qa_testing": 3,
            "uat_testing": 2
        }'::jsonb;
    END IF;
END $$;

-- -----------------------------------------------------
-- Row Level Security (RLS)
-- -----------------------------------------------------

ALTER TABLE public.work_item_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.view_preferences ENABLE ROW LEVEL SECURITY;

-- Dependencies policies
CREATE POLICY "Users can view dependencies" ON public.work_item_dependencies
    FOR SELECT USING (true);

CREATE POLICY "Users can create dependencies" ON public.work_item_dependencies
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update dependencies" ON public.work_item_dependencies
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete dependencies" ON public.work_item_dependencies
    FOR DELETE USING (auth.uid() = created_by);

-- View preferences: Users can only access their own
CREATE POLICY "Users can manage own preferences" ON public.view_preferences
    FOR ALL USING (auth.uid() = user_id);

-- -----------------------------------------------------
-- Functions for dependency management
-- -----------------------------------------------------

-- Function to check for circular dependencies
CREATE OR REPLACE FUNCTION check_circular_dependency(
    p_dependent_type TEXT,
    p_dependent_id UUID,
    p_blocker_type TEXT,
    p_blocker_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    has_circular BOOLEAN := FALSE;
BEGIN
    WITH RECURSIVE dep_chain AS (
        SELECT blocker_type, blocker_id, 1 as depth
        FROM work_item_dependencies
        WHERE dependent_type = p_blocker_type AND dependent_id = p_blocker_id
        
        UNION ALL
        
        SELECT d.blocker_type, d.blocker_id, dc.depth + 1
        FROM work_item_dependencies d
        JOIN dep_chain dc ON d.dependent_type = dc.blocker_type AND d.dependent_id = dc.blocker_id
        WHERE dc.depth < 100
    )
    SELECT EXISTS (
        SELECT 1 FROM dep_chain 
        WHERE blocker_type = p_dependent_type AND blocker_id = p_dependent_id
    ) INTO has_circular;
    
    RETURN has_circular;
END;
$$ LANGUAGE plpgsql;

-- Function to get all blockers for an item (recursive)
CREATE OR REPLACE FUNCTION get_all_blockers(
    p_item_type TEXT,
    p_item_id UUID
) RETURNS TABLE (
    blocker_type TEXT,
    blocker_id UUID,
    depth INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE blocker_chain AS (
        SELECT d.blocker_type, d.blocker_id, 1 as depth
        FROM work_item_dependencies d
        WHERE d.dependent_type = p_item_type 
          AND d.dependent_id = p_item_id
          AND d.is_resolved = FALSE
        
        UNION ALL
        
        SELECT d.blocker_type, d.blocker_id, bc.depth + 1
        FROM work_item_dependencies d
        JOIN blocker_chain bc ON d.dependent_type = bc.blocker_type 
                              AND d.dependent_id = bc.blocker_id
        WHERE d.is_resolved = FALSE AND bc.depth < 50
    )
    SELECT DISTINCT bc.blocker_type, bc.blocker_id, MIN(bc.depth)
    FROM blocker_chain bc
    GROUP BY bc.blocker_type, bc.blocker_id;
END;
$$ LANGUAGE plpgsql;

-- Function to count dependencies for an item
CREATE OR REPLACE FUNCTION get_dependency_counts(
    p_item_type TEXT,
    p_item_id UUID
) RETURNS TABLE (
    blocks_count INTEGER,
    blocked_by_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM work_item_dependencies 
         WHERE blocker_type = p_item_type AND blocker_id = p_item_id AND is_resolved = FALSE),
        (SELECT COUNT(*)::INTEGER FROM work_item_dependencies 
         WHERE dependent_type = p_item_type AND dependent_id = p_item_id AND is_resolved = FALSE);
END;
$$ LANGUAGE plpgsql;

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_views_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_dependencies_updated_at ON public.work_item_dependencies;
CREATE TRIGGER update_dependencies_updated_at
    BEFORE UPDATE ON public.work_item_dependencies
    FOR EACH ROW EXECUTE FUNCTION update_views_updated_at();

DROP TRIGGER IF EXISTS update_view_preferences_updated_at ON public.view_preferences;
CREATE TRIGGER update_view_preferences_updated_at
    BEFORE UPDATE ON public.view_preferences
    FOR EACH ROW EXECUTE FUNCTION update_views_updated_at();