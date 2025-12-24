-- JOB-006: Home Module Database Schema Optimization
-- Creates aggregation table and missing indexes for Home performance

-- ================================================
-- HOME_USER_SUMMARY - Pre-computed aggregations
-- ================================================
CREATE TABLE IF NOT EXISTS public.home_user_summary (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Operations counts
  operations_counts JSONB DEFAULT '{
    "total_incidents": 0,
    "major_incidents": 0,
    "sla_at_risk": 0,
    "awaiting_me": 0,
    "blocked": 0,
    "active_releases": 0
  }'::JSONB,
  
  -- Delivery counts
  delivery_counts JSONB DEFAULT '{
    "assigned": 0,
    "worked_on": 0,
    "starred": 0,
    "by_type": {"epic": 0, "feature": 0, "story": 0, "task": 0}
  }'::JSONB,
  
  -- Planner counts  
  planner_counts JSONB DEFAULT '{
    "planned": 0,
    "upcoming": 0,
    "pending_review": 0
  }'::JSONB,
  
  last_computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.home_user_summary ENABLE ROW LEVEL SECURITY;

-- Users can only read their own summary
CREATE POLICY "Users can read own home summary"
  ON public.home_user_summary
  FOR SELECT
  USING (auth.uid() = user_id);

-- System/triggers can update summaries
CREATE POLICY "System can manage home summaries"
  ON public.home_user_summary
  FOR ALL
  USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

-- ================================================
-- WORK_ITEM_ACTIVITY - Unified activity tracking
-- ================================================
CREATE TABLE IF NOT EXISTS public.work_item_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL,
  work_item_type TEXT NOT NULL CHECK (work_item_type IN ('epic', 'feature', 'story', 'task', 'incident')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('viewed', 'updated', 'commented', 'assigned', 'status_changed')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Enable RLS
ALTER TABLE public.work_item_activity ENABLE ROW LEVEL SECURITY;

-- Users can read their own activity
CREATE POLICY "Users can read own activity"
  ON public.work_item_activity
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own activity
CREATE POLICY "Users can create own activity"
  ON public.work_item_activity
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ================================================
-- MISSING INDEXES FOR HOME QUERIES
-- ================================================

-- Incidents: Composite index for assignee + status (Home Operations)
CREATE INDEX IF NOT EXISTS idx_incidents_assignee_status 
  ON public.incidents (assignee_id, status) 
  WHERE deleted_at IS NULL;

-- Incidents: SLA status for at-risk queries
CREATE INDEX IF NOT EXISTS idx_incidents_severity_status 
  ON public.incidents (severity, status) 
  WHERE deleted_at IS NULL;

-- Incidents: Updated at for recent activity
CREATE INDEX IF NOT EXISTS idx_incidents_updated_at 
  ON public.incidents (updated_at DESC) 
  WHERE deleted_at IS NULL;

-- Stories: Assignee index (missing)
CREATE INDEX IF NOT EXISTS idx_stories_assignee_id 
  ON public.stories (assignee_id) 
  WHERE deleted_at IS NULL;

-- Stories: Updated at for worked-on queries  
CREATE INDEX IF NOT EXISTS idx_stories_updated_at 
  ON public.stories (updated_at DESC) 
  WHERE deleted_at IS NULL;

-- Features: Updated at for worked-on queries
CREATE INDEX IF NOT EXISTS idx_features_updated_at 
  ON public.features (updated_at DESC) 
  WHERE deleted_at IS NULL;

-- Epics: Composite for assignee + status
CREATE INDEX IF NOT EXISTS idx_epics_assignee_status 
  ON public.epics (assignee_id, status) 
  WHERE deleted_at IS NULL;

-- Epics: Updated at for worked-on queries
CREATE INDEX IF NOT EXISTS idx_epics_updated_at 
  ON public.epics (updated_at DESC) 
  WHERE deleted_at IS NULL;

-- Work item activity: User + occurred_at (Home worked-on)
CREATE INDEX IF NOT EXISTS idx_work_item_activity_user_occurred 
  ON public.work_item_activity (user_id, occurred_at DESC);

-- Work item activity: Work item lookup
CREATE INDEX IF NOT EXISTS idx_work_item_activity_item 
  ON public.work_item_activity (work_item_type, work_item_id);

-- Starred items: User + created for Home starred tab
CREATE INDEX IF NOT EXISTS idx_starred_items_user_created 
  ON public.starred_items (user_id, created_at DESC);

-- Work manager tasks: Planner queries
CREATE INDEX IF NOT EXISTS idx_work_manager_tasks_created_by 
  ON public.work_manager_tasks (created_by);

CREATE INDEX IF NOT EXISTS idx_work_manager_tasks_updated_at 
  ON public.work_manager_tasks (updated_at DESC);

-- Home user summary: Last computed for refresh scheduling
CREATE INDEX IF NOT EXISTS idx_home_user_summary_last_computed 
  ON public.home_user_summary (last_computed_at);

-- ================================================
-- FUNCTION: Refresh Home User Summary
-- ================================================
CREATE OR REPLACE FUNCTION public.refresh_home_user_summary(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_operations JSONB;
  v_delivery JSONB;
  v_planner JSONB;
BEGIN
  -- Calculate Operations counts
  SELECT jsonb_build_object(
    'total_incidents', COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed')),
    'major_incidents', COUNT(*) FILTER (WHERE is_major_incident = true AND status NOT IN ('resolved', 'closed')),
    'sla_at_risk', COUNT(*) FILTER (WHERE severity IN ('SEV1', 'SEV2') AND status NOT IN ('resolved', 'closed')),
    'awaiting_me', COUNT(*) FILTER (WHERE assignee_id = p_user_id AND status NOT IN ('resolved', 'closed')),
    'blocked', 0,
    'active_releases', 0
  ) INTO v_operations
  FROM incidents
  WHERE deleted_at IS NULL
    AND (assignee_id = p_user_id OR reporter_id = p_user_id);

  -- Calculate Delivery counts
  WITH delivery_items AS (
    SELECT 'epic' as item_type, id, assignee_id, updated_at 
    FROM epics WHERE deleted_at IS NULL AND assignee_id = p_user_id
    UNION ALL
    SELECT 'feature', id, assignee_id, updated_at 
    FROM features WHERE deleted_at IS NULL AND assignee_id = p_user_id
    UNION ALL
    SELECT 'story', id, assignee_id, updated_at 
    FROM stories WHERE deleted_at IS NULL AND assignee_id = p_user_id
    UNION ALL
    SELECT 'task', id, assignee_id, updated_at 
    FROM work_manager_tasks WHERE assignee_id = p_user_id
  ),
  starred AS (
    SELECT COUNT(*) as cnt FROM starred_items WHERE user_id = p_user_id
  ),
  worked_on AS (
    SELECT COUNT(DISTINCT work_item_id) as cnt 
    FROM work_item_activity 
    WHERE user_id = p_user_id 
      AND occurred_at > NOW() - INTERVAL '7 days'
  )
  SELECT jsonb_build_object(
    'assigned', (SELECT COUNT(*) FROM delivery_items),
    'worked_on', COALESCE((SELECT cnt FROM worked_on), 0),
    'starred', COALESCE((SELECT cnt FROM starred), 0),
    'by_type', jsonb_build_object(
      'epic', (SELECT COUNT(*) FROM delivery_items WHERE item_type = 'epic'),
      'feature', (SELECT COUNT(*) FROM delivery_items WHERE item_type = 'feature'),
      'story', (SELECT COUNT(*) FROM delivery_items WHERE item_type = 'story'),
      'task', (SELECT COUNT(*) FROM delivery_items WHERE item_type = 'task')
    )
  ) INTO v_delivery;

  -- Calculate Planner counts
  SELECT jsonb_build_object(
    'planned', COUNT(*) FILTER (WHERE status = 'planned'),
    'upcoming', COUNT(*) FILTER (WHERE status = 'upcoming' OR (due_date BETWEEN NOW() AND NOW() + INTERVAL '14 days')),
    'pending_review', COUNT(*) FILTER (WHERE status = 'pending_review')
  ) INTO v_planner
  FROM work_manager_tasks
  WHERE created_by = p_user_id OR assignee_id = p_user_id;

  -- Upsert summary
  INSERT INTO home_user_summary (user_id, operations_counts, delivery_counts, planner_counts, last_computed_at, updated_at)
  VALUES (p_user_id, v_operations, v_delivery, v_planner, NOW(), NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET
    operations_counts = EXCLUDED.operations_counts,
    delivery_counts = EXCLUDED.delivery_counts,
    planner_counts = EXCLUDED.planner_counts,
    last_computed_at = NOW(),
    updated_at = NOW();
END;
$$;

-- ================================================
-- TRIGGER: Auto-track work item activity
-- ================================================
CREATE OR REPLACE FUNCTION public.track_work_item_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only track if there's an authenticated user
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Determine activity type
  INSERT INTO work_item_activity (work_item_id, work_item_type, user_id, activity_type, metadata)
  VALUES (
    NEW.id,
    TG_ARGV[0],
    auth.uid(),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'updated'
      WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'status_changed'
      ELSE 'updated'
    END,
    jsonb_build_object('operation', TG_OP)
  );
  
  RETURN NEW;
END;
$$;

-- Create triggers for work item activity tracking
DROP TRIGGER IF EXISTS track_epic_activity ON epics;
CREATE TRIGGER track_epic_activity
  AFTER INSERT OR UPDATE ON epics
  FOR EACH ROW
  EXECUTE FUNCTION track_work_item_activity('epic');

DROP TRIGGER IF EXISTS track_feature_activity ON features;
CREATE TRIGGER track_feature_activity
  AFTER INSERT OR UPDATE ON features
  FOR EACH ROW
  EXECUTE FUNCTION track_work_item_activity('feature');

DROP TRIGGER IF EXISTS track_story_activity ON stories;
CREATE TRIGGER track_story_activity
  AFTER INSERT OR UPDATE ON stories
  FOR EACH ROW
  EXECUTE FUNCTION track_work_item_activity('story');

-- Enable realtime for home_user_summary
ALTER PUBLICATION supabase_realtime ADD TABLE public.home_user_summary;