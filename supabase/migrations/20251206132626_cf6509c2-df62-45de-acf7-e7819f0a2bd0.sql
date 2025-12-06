-- Create drawer_tab_configs table for Fields & Layout persistence
CREATE TABLE IF NOT EXISTS public.drawer_tab_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_line_id UUID REFERENCES public.business_lines(id) ON DELETE CASCADE,
  tab_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_line_id, tab_key)
);

-- Enable RLS
ALTER TABLE public.drawer_tab_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow all authenticated users to read, admins to write
CREATE POLICY "Anyone can view drawer tab configs" 
  ON public.drawer_tab_configs 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage drawer tab configs"
  ON public.drawer_tab_configs
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed default drawer tab configs (global scope - business_line_id = NULL)
INSERT INTO public.drawer_tab_configs (business_line_id, tab_key, display_name, is_visible, is_required, position) VALUES
  (NULL, 'demand-details', 'Demand Details', true, true, 1),
  (NULL, 'business-score', 'Business Score', true, false, 2),
  (NULL, 'budget', 'Budget', true, false, 3),
  (NULL, 'risks', 'Risks', true, false, 4),
  (NULL, 'milestones', 'Milestones', true, false, 5),
  (NULL, 'links', 'Links', true, false, 6),
  (NULL, 'discussions', 'Discussions', true, false, 7),
  (NULL, 'audit-history', 'Audit History', true, false, 8)
ON CONFLICT DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_drawer_tab_configs_updated_at
  BEFORE UPDATE ON public.drawer_tab_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();