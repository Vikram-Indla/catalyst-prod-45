-- Create work item icon preferences table
CREATE TABLE public.work_item_icon_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_item_type TEXT NOT NULL UNIQUE,
  icon_style TEXT NOT NULL DEFAULT 'filled', -- 'filled', 'outline', 'minimal'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_item_icon_preferences ENABLE ROW LEVEL SECURITY;

-- Anyone can read icon preferences (public config)
CREATE POLICY "Anyone can read icon preferences"
ON public.work_item_icon_preferences
FOR SELECT
USING (true);

-- Only admins can modify icon preferences
CREATE POLICY "Admins can modify icon preferences"
ON public.work_item_icon_preferences
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for icon preferences
ALTER TABLE public.work_item_icon_preferences REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_item_icon_preferences;

-- Insert default values for all work item types
INSERT INTO public.work_item_icon_preferences (work_item_type, icon_style) VALUES
  ('theme', 'filled'),
  ('objective', 'filled'),
  ('business-request', 'filled'),
  ('epic', 'filled'),
  ('feature', 'filled'),
  ('story', 'filled'),
  ('defect', 'filled'),
  ('incident', 'filled'),
  ('dependency', 'filled'),
  ('risk', 'filled')
ON CONFLICT (work_item_type) DO NOTHING;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_work_item_icon_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_work_item_icon_preferences_updated_at
BEFORE UPDATE ON public.work_item_icon_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_work_item_icon_preferences_updated_at();