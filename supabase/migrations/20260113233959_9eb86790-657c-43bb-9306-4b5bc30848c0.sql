-- ============================================================
-- PLANNER KANBAN MODULE - DATABASE MIGRATION
-- Creates planner_statuses and planner_tasks tables
-- Maps to existing profiles and teams tables
-- ============================================================

-- ============================================================
-- TABLE: planner_statuses (Kanban Columns)
-- ============================================================
CREATE TABLE public.planner_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) NOT NULL DEFAULT '#2563eb',
  position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_completed_status BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planner_statuses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for planner_statuses
CREATE POLICY "Users can view all statuses" 
ON public.planner_statuses FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage statuses" 
ON public.planner_statuses FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default statuses
INSERT INTO public.planner_statuses (name, slug, color, position, is_default, is_completed_status) VALUES
  ('Backlog', 'backlog', '#9ca3af', 0, true, false),
  ('Planned', 'planned', '#2563eb', 1, false, false),
  ('In Progress', 'in-progress', '#d97706', 2, false, false),
  ('Review', 'review', '#8b5cf6', 3, false, false),
  ('Done', 'done', '#10b981', 4, false, true);

-- ============================================================
-- TABLE: planner_tasks
-- Maps to existing profiles (assignee) and teams (workstream)
-- ============================================================
CREATE TABLE public.planner_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(20) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status_id UUID NOT NULL REFERENCES public.planner_statuses(id) ON DELETE RESTRICT,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  workstream_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  position INTEGER NOT NULL DEFAULT 0,
  blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.planner_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for planner_tasks
CREATE POLICY "Users can view all tasks" 
ON public.planner_tasks FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create tasks" 
ON public.planner_tasks FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tasks" 
ON public.planner_tasks FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tasks" 
ON public.planner_tasks FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Indexes for performance
CREATE INDEX idx_planner_tasks_status ON public.planner_tasks(status_id);
CREATE INDEX idx_planner_tasks_workstream ON public.planner_tasks(workstream_id);
CREATE INDEX idx_planner_tasks_assignee ON public.planner_tasks(assignee_id);
CREATE INDEX idx_planner_tasks_deleted ON public.planner_tasks(deleted_at);

-- ============================================================
-- FUNCTION: Auto-generate task key (PLN-XXX)
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_planner_task_key()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(key FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.planner_tasks
  WHERE key ~ '^PLN-[0-9]+$';
  
  NEW.key := 'PLN-' || next_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_planner_task_key
  BEFORE INSERT ON public.planner_tasks
  FOR EACH ROW
  WHEN (NEW.key IS NULL OR NEW.key = '')
  EXECUTE FUNCTION public.generate_planner_task_key();

-- ============================================================
-- FUNCTION: Update timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_planner_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_planner_tasks_updated_at
  BEFORE UPDATE ON public.planner_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_planner_updated_at();

CREATE TRIGGER update_planner_statuses_updated_at
  BEFORE UPDATE ON public.planner_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_planner_updated_at();

-- ============================================================
-- FUNCTIONS: Reordering helpers for drag & drop
-- ============================================================
CREATE OR REPLACE FUNCTION public.reorder_planner_tasks_down(
  p_status_id UUID,
  p_old_position INTEGER,
  p_new_position INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.planner_tasks
  SET position = position - 1
  WHERE status_id = p_status_id
    AND position > p_old_position
    AND position <= p_new_position
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.reorder_planner_tasks_up(
  p_status_id UUID,
  p_old_position INTEGER,
  p_new_position INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.planner_tasks
  SET position = position + 1
  WHERE status_id = p_status_id
    AND position >= p_new_position
    AND position < p_old_position
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- Enable Realtime for both tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_tasks;