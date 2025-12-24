-- Create work_manager_tasks table for storing tasks created in Work Manager
CREATE TABLE public.work_manager_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'Task' CHECK (type IN ('Project', 'Task', 'General')),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
  status TEXT NOT NULL DEFAULT 'Backlog' CHECK (status IN ('Backlog', 'Planned', 'In Progress', 'Waiting', 'Done')),
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  board_id TEXT,
  column_position INTEGER NOT NULL DEFAULT 0,
  due_date DATE,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_reason TEXT,
  blocked_at TIMESTAMPTZ,
  linked_item_type TEXT,
  linked_item_key TEXT,
  linked_item_title TEXT,
  recurrence TEXT NOT NULL DEFAULT 'None' CHECK (recurrence IN ('None', 'Daily', 'Weekly', 'Biweekly', 'Monthly')),
  tags TEXT[],
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for common queries
CREATE INDEX idx_work_manager_tasks_team_id ON public.work_manager_tasks(team_id);
CREATE INDEX idx_work_manager_tasks_assignee_id ON public.work_manager_tasks(assignee_id);
CREATE INDEX idx_work_manager_tasks_status ON public.work_manager_tasks(status);
CREATE INDEX idx_work_manager_tasks_due_date ON public.work_manager_tasks(due_date);

-- Create sequence for task keys
CREATE TABLE public.work_manager_task_sequences (
  team_id UUID PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Function to generate task key
CREATE OR REPLACE FUNCTION public.generate_work_manager_task_key(p_team_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_team_name TEXT;
  v_prefix TEXT;
  v_next_seq INTEGER;
BEGIN
  -- Get team name and create prefix
  SELECT name INTO v_team_name FROM teams WHERE id = p_team_id;
  IF v_team_name IS NULL THEN
    v_prefix := 'TSK';
  ELSE
    v_prefix := UPPER(LEFT(REGEXP_REPLACE(v_team_name, '[^A-Za-z]', '', 'g'), 3));
    IF LENGTH(v_prefix) < 3 THEN
      v_prefix := RPAD(v_prefix, 3, 'X');
    END IF;
  END IF;
  
  -- Get or create sequence
  INSERT INTO work_manager_task_sequences (team_id, last_sequence)
  VALUES (p_team_id, 0)
  ON CONFLICT (team_id) DO NOTHING;
  
  -- Increment and get next sequence
  UPDATE work_manager_task_sequences
  SET last_sequence = last_sequence + 1, updated_at = NOW()
  WHERE team_id = p_team_id
  RETURNING last_sequence INTO v_next_seq;
  
  RETURN 'TSK-' || LPAD(v_next_seq::TEXT, 4, '0');
END;
$function$;

-- Trigger to auto-generate task key
CREATE OR REPLACE FUNCTION public.auto_generate_task_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.key IS NULL AND NEW.team_id IS NOT NULL THEN
    NEW.key := generate_work_manager_task_key(NEW.team_id);
  ELSIF NEW.key IS NULL THEN
    NEW.key := 'TSK-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_auto_generate_task_key
  BEFORE INSERT ON public.work_manager_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_task_key();

-- Trigger to update updated_at
CREATE TRIGGER update_work_manager_tasks_updated_at
  BEFORE UPDATE ON public.work_manager_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.work_manager_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_manager_task_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_manager_tasks - only approved users can access
CREATE POLICY "Approved users can view tasks"
  ON public.work_manager_tasks
  FOR SELECT
  USING (public.current_user_is_approved());

CREATE POLICY "Approved users can create tasks"
  ON public.work_manager_tasks
  FOR INSERT
  WITH CHECK (public.current_user_is_approved());

CREATE POLICY "Approved users can update tasks"
  ON public.work_manager_tasks
  FOR UPDATE
  USING (public.current_user_is_approved());

CREATE POLICY "Approved users can delete tasks"
  ON public.work_manager_tasks
  FOR DELETE
  USING (public.current_user_is_approved());

-- RLS Policies for sequences
CREATE POLICY "Approved users can manage sequences"
  ON public.work_manager_task_sequences
  FOR ALL
  USING (public.current_user_is_approved());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_manager_tasks;