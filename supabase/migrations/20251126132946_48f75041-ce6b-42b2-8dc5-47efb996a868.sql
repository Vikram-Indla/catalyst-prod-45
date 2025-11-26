-- Add date columns to strategy_snapshots
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'strategy_snapshots' AND column_name = 'start_date') THEN
    ALTER TABLE public.strategy_snapshots ADD COLUMN start_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'strategy_snapshots' AND column_name = 'end_date') THEN
    ALTER TABLE public.strategy_snapshots ADD COLUMN end_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'strategy_snapshots' AND column_name = 'description') THEN
    ALTER TABLE public.strategy_snapshots ADD COLUMN description TEXT;
  END IF;
END $$;

-- Create goals table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES public.strategy_snapshots(id) ON DELETE CASCADE NOT NULL,
  level TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner_user_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create roadmap_items table
CREATE TABLE IF NOT EXISTS public.roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_increment_id UUID REFERENCES public.program_increments(id) ON DELETE CASCADE NOT NULL,
  work_item_id UUID REFERENCES public.features(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  has_milestone_flag BOOLEAN NOT NULL DEFAULT false,
  has_star_marker BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add goal_id to objectives
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objectives' AND column_name = 'goal_id') THEN
    ALTER TABLE public.objectives ADD COLUMN goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'Allow authenticated users to view goals') THEN
    CREATE POLICY "Allow authenticated users to view goals" ON public.goals FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'Admins and program managers can manage goals') THEN
    CREATE POLICY "Admins and program managers can manage goals" ON public.goals FOR ALL TO authenticated 
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'program_manager'))
    WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'program_manager'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'roadmap_items' AND policyname = 'Allow authenticated users to view roadmap items') THEN
    CREATE POLICY "Allow authenticated users to view roadmap items" ON public.roadmap_items FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'roadmap_items' AND policyname = 'Admins and program managers can manage roadmap items') THEN
    CREATE POLICY "Admins and program managers can manage roadmap items" ON public.roadmap_items FOR ALL TO authenticated 
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'program_manager'))
    WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'program_manager'));
  END IF;
END $$;

-- Triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_goals_updated_at') THEN
    CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_roadmap_items_updated_at') THEN
    CREATE TRIGGER update_roadmap_items_updated_at BEFORE UPDATE ON public.roadmap_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Seed: Update snapshot
UPDATE public.strategy_snapshots SET start_date = '2024-01-01', end_date = '2024-12-31', description = 'Enterprise strategy for 2024' WHERE name = 'Corporate Strategy 2024';

-- Seed: Goals
INSERT INTO public.goals (id, snapshot_id, level, title, description, status)
SELECT '22222222-2222-2222-2222-222222222222', id, 'STRATEGIC', 'Accelerate Digital Transformation', 'Drive enterprise-wide digital initiatives', 'On track'
FROM public.strategy_snapshots WHERE name = 'Corporate Strategy 2024' ON CONFLICT (id) DO NOTHING;

INSERT INTO public.goals (id, snapshot_id, level, title, description, status)
SELECT '22222222-2222-2222-2222-222222222223', id, 'STRATEGIC', 'Expand Market Presence', 'Grow into new market segments', 'At risk'
FROM public.strategy_snapshots WHERE name = 'Corporate Strategy 2024' ON CONFLICT (id) DO NOTHING;

-- Seed: PIs (using 'planned' for all)
INSERT INTO public.program_increments (id, portfolio_id, name, start_date, end_date, state)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM public.portfolios LIMIT 1),
  'PI-' || n,
  '2024-01-01'::date + (n * 90 || ' days')::interval,
  '2024-01-01'::date + ((n + 1) * 90 || ' days')::interval,
  'planned'::pi_state
FROM generate_series(5, 7) AS n
WHERE NOT EXISTS (SELECT 1 FROM public.program_increments WHERE name = 'PI-' || n);

-- Seed: Roadmap Items
INSERT INTO public.roadmap_items (program_increment_id, work_item_id, start_date, end_date, has_milestone_flag, has_star_marker)
SELECT 
  pi.id,
  f.id,
  pi.start_date + (row_number() OVER (PARTITION BY pi.id) * 10 || ' days')::interval,
  pi.start_date + (row_number() OVER (PARTITION BY pi.id) * 10 + 20 || ' days')::interval,
  (random() > 0.7)::boolean,
  (random() > 0.8)::boolean
FROM public.program_increments pi
CROSS JOIN LATERAL (SELECT id FROM public.features ORDER BY random() LIMIT 2) f
WHERE pi.name IN ('PI-5', 'PI-6', 'PI-7')
AND NOT EXISTS (SELECT 1 FROM public.roadmap_items ri WHERE ri.work_item_id = f.id AND ri.program_increment_id = pi.id);