-- Create test_cycle_sets junction table to link cycles to test sets
CREATE TABLE public.test_cycle_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.test_cycles(id) ON DELETE CASCADE,
  set_id UUID NOT NULL REFERENCES public.test_sets(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT now(),
  added_by UUID REFERENCES public.profiles(id),
  UNIQUE(cycle_id, set_id)
);

-- Enable RLS
ALTER TABLE public.test_cycle_sets ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow authenticated users with project access
CREATE POLICY "Users can view test_cycle_sets" ON public.test_cycle_sets
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY "Users can insert test_cycle_sets" ON public.test_cycle_sets
  FOR INSERT WITH CHECK (public.current_user_is_approved());

CREATE POLICY "Users can delete test_cycle_sets" ON public.test_cycle_sets
  FOR DELETE USING (public.current_user_is_approved());

-- Create index for performance
CREATE INDEX idx_test_cycle_sets_cycle_id ON public.test_cycle_sets(cycle_id);
CREATE INDEX idx_test_cycle_sets_set_id ON public.test_cycle_sets(set_id);