
CREATE TABLE IF NOT EXISTS public.plan_test_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.tm_test_plans(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES public.tm_test_cycles(id) ON DELETE CASCADE,
  linked_at timestamptz DEFAULT now(),
  linked_by uuid,
  UNIQUE(plan_id, cycle_id)
);

ALTER TABLE public.plan_test_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view plan_test_cycles"
  ON public.plan_test_cycles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert plan_test_cycles"
  ON public.plan_test_cycles FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete plan_test_cycles"
  ON public.plan_test_cycles FOR DELETE
  TO authenticated USING (true);
