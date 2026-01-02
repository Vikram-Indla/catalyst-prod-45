-- Enterprise Grid Views table for saved grid configurations
CREATE TABLE IF NOT EXISTS public.enterprise_grid_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  grid_id TEXT NOT NULL, -- Unique identifier for each grid (e.g., 'test-cases', 'defects', 'stories')
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  columns_config JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{id, visible, width, order}]
  sort_config JSONB DEFAULT '[]'::jsonb, -- [{column, direction}]
  filter_config JSONB DEFAULT '[]'::jsonb, -- [{column, operator, value}]
  group_by TEXT DEFAULT NULL,
  row_height TEXT DEFAULT 'normal', -- 'compact', 'normal', 'comfortable'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_grid_view UNIQUE (user_id, grid_id, name)
);

-- User's active view per grid
CREATE TABLE IF NOT EXISTS public.enterprise_grid_user_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  grid_id TEXT NOT NULL,
  active_view_id UUID REFERENCES public.enterprise_grid_views(id) ON DELETE SET NULL,
  quick_filters JSONB DEFAULT '{}'::jsonb, -- Quick filter states
  search_query TEXT DEFAULT '',
  selected_row_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_grid_state UNIQUE (user_id, grid_id)
);

-- Enable RLS
ALTER TABLE public.enterprise_grid_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_grid_user_state ENABLE ROW LEVEL SECURITY;

-- RLS policies for grid views
CREATE POLICY "Users can view their own grid views" 
ON public.enterprise_grid_views 
FOR SELECT 
USING (auth.uid() = user_id OR is_shared = true);

CREATE POLICY "Users can create their own grid views" 
ON public.enterprise_grid_views 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grid views" 
ON public.enterprise_grid_views 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grid views" 
ON public.enterprise_grid_views 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for user state
CREATE POLICY "Users can view their own grid state" 
ON public.enterprise_grid_user_state 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own grid state" 
ON public.enterprise_grid_user_state 
FOR ALL 
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_grid_views_user_grid ON public.enterprise_grid_views(user_id, grid_id);
CREATE INDEX idx_grid_state_user_grid ON public.enterprise_grid_user_state(user_id, grid_id);

-- Updated at trigger
CREATE TRIGGER update_enterprise_grid_views_updated_at
BEFORE UPDATE ON public.enterprise_grid_views
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enterprise_grid_user_state_updated_at
BEFORE UPDATE ON public.enterprise_grid_user_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();