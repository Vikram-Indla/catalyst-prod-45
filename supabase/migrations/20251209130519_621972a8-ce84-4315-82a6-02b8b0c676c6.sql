-- Create strategy_missions table for reusable missions
CREATE TABLE IF NOT EXISTS public.strategy_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enterprise_id UUID,
  title TEXT NOT NULL,
  statement TEXT,
  owner_id UUID,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DRAFT', 'ARCHIVED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create strategy_visions table for reusable visions
CREATE TABLE IF NOT EXISTS public.strategy_visions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enterprise_id UUID,
  title TEXT NOT NULL,
  statement TEXT,
  owner_id UUID,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DRAFT', 'ARCHIVED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create strategy_values table for reusable values
CREATE TABLE IF NOT EXISTS public.strategy_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enterprise_id UUID,
  title TEXT NOT NULL,
  statement TEXT,
  owner_id UUID,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DRAFT', 'ARCHIVED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create snapshot_strategy_links junction table for linking strategy objects to snapshots
CREATE TABLE IF NOT EXISTS public.snapshot_strategy_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES public.strategy_snapshots(id) ON DELETE CASCADE,
  mission_ids UUID[] DEFAULT '{}',
  vision_ids UUID[] DEFAULT '{}',
  value_ids UUID[] DEFAULT '{}',
  goal_ids UUID[] DEFAULT '{}',
  theme_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(snapshot_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.strategy_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_visions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshot_strategy_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for strategy_missions
CREATE POLICY "Allow all operations on strategy_missions" ON public.strategy_missions FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for strategy_visions
CREATE POLICY "Allow all operations on strategy_visions" ON public.strategy_visions FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for strategy_values
CREATE POLICY "Allow all operations on strategy_values" ON public.strategy_values FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for snapshot_strategy_links
CREATE POLICY "Allow all operations on snapshot_strategy_links" ON public.snapshot_strategy_links FOR ALL USING (true) WITH CHECK (true);

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_strategy_missions_updated_at
  BEFORE UPDATE ON public.strategy_missions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategy_visions_updated_at
  BEFORE UPDATE ON public.strategy_visions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategy_values_updated_at
  BEFORE UPDATE ON public.strategy_values
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_snapshot_strategy_links_updated_at
  BEFORE UPDATE ON public.snapshot_strategy_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();