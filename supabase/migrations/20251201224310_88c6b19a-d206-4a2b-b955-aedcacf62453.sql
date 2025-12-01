-- Create test notification preferences table (separate from general notifications)
CREATE TABLE IF NOT EXISTS public.test_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notify_on_test_failure BOOLEAN DEFAULT true,
  notify_on_cycle_complete BOOLEAN DEFAULT true,
  daily_test_summary BOOLEAN DEFAULT false,
  weekly_test_report BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.test_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own test notification preferences"
  ON public.test_notification_preferences
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own test notification preferences"
  ON public.test_notification_preferences
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own test notification preferences"
  ON public.test_notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_test_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_test_notification_preferences_updated_at
  BEFORE UPDATE ON public.test_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_test_notification_preferences_updated_at();