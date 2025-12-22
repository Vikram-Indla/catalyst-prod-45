-- Create manager follow-ups table for action items
CREATE TABLE public.manager_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  week_start DATE NOT NULL,
  content TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create audit history table
CREATE TABLE public.manager_follow_up_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follow_up_id UUID NOT NULL REFERENCES public.manager_follow_ups(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'updated', 'completed', 'reopened', 'deleted'
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  actor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manager_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_follow_up_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for manager_follow_ups
CREATE POLICY "Users can view follow-ups" ON public.manager_follow_ups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create follow-ups" ON public.manager_follow_ups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update follow-ups" ON public.manager_follow_ups
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete follow-ups" ON public.manager_follow_ups
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- RLS policies for history (read-only for users, insert via trigger)
CREATE POLICY "Users can view follow-up history" ON public.manager_follow_up_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert follow-up history" ON public.manager_follow_up_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_manager_follow_ups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_manager_follow_ups_timestamp
  BEFORE UPDATE ON public.manager_follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_manager_follow_ups_updated_at();

-- Create indexes for performance
CREATE INDEX idx_manager_follow_ups_team_member ON public.manager_follow_ups(team_member_id);
CREATE INDEX idx_manager_follow_ups_week ON public.manager_follow_ups(week_start);
CREATE INDEX idx_manager_follow_ups_team ON public.manager_follow_ups(team_id);
CREATE INDEX idx_manager_follow_up_history_follow_up ON public.manager_follow_up_history(follow_up_id);