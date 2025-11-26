-- Create table for user forecast preferences
CREATE TABLE IF NOT EXISTS public.user_forecast_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visible_columns jsonb NOT NULL DEFAULT '["theme", "owner", "pi_estimate", "program_estimate", "team_estimate", "capacity_needed"]'::jsonb,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_forecast_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own preferences
CREATE POLICY "Users can view their own forecast preferences"
  ON public.user_forecast_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own forecast preferences"
  ON public.user_forecast_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own forecast preferences"
  ON public.user_forecast_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_forecast_preferences_updated_at
  BEFORE UPDATE ON public.user_forecast_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for work item forecast ranks
CREATE TABLE IF NOT EXISTS public.work_item_forecast_ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid NOT NULL,
  work_item_type text NOT NULL,
  pi_id uuid NOT NULL REFERENCES public.program_increments(id) ON DELETE CASCADE,
  rank integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(work_item_id, work_item_type, pi_id)
);

-- Enable RLS
ALTER TABLE public.work_item_forecast_ranks ENABLE ROW LEVEL SECURITY;

-- Policy: admins and program managers can manage ranks
CREATE POLICY "Admins and program managers can manage forecast ranks"
  ON public.work_item_forecast_ranks
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'program_manager'));

-- Policy: users can view ranks
CREATE POLICY "Users can view forecast ranks"
  ON public.work_item_forecast_ranks
  FOR SELECT
  TO authenticated
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_work_item_forecast_ranks_updated_at
  BEFORE UPDATE ON public.work_item_forecast_ranks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_user_forecast_preferences_user_id ON public.user_forecast_preferences(user_id);
CREATE INDEX idx_work_item_forecast_ranks_pi_id ON public.work_item_forecast_ranks(pi_id);
CREATE INDEX idx_work_item_forecast_ranks_work_item ON public.work_item_forecast_ranks(work_item_id, work_item_type);