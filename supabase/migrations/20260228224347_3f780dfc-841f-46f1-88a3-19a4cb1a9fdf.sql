
-- kb_eval_set: stores evaluation questions
CREATE TABLE IF NOT EXISTS public.kb_eval_set (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  expected_key_points TEXT[] DEFAULT '{}',
  expected_sources TEXT[] DEFAULT '{}',
  category TEXT,
  difficulty TEXT DEFAULT 'medium',
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kb_eval_set ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage eval set"
  ON public.kb_eval_set FOR ALL
  USING (public.kb_is_admin());

-- kb_eval_results: stores evaluation run results
CREATE TABLE IF NOT EXISTS public.kb_eval_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  eval_id UUID REFERENCES public.kb_eval_set(id) ON DELETE CASCADE,
  run_date TIMESTAMPTZ DEFAULT now(),
  actual_answer TEXT,
  key_points_hit INT DEFAULT 0,
  key_points_total INT DEFAULT 0,
  hit_rate NUMERIC(5,3) DEFAULT 0,
  retrieval_method TEXT,
  chunks_retrieved INT DEFAULT 0,
  response_time_ms INT DEFAULT 0,
  confidence NUMERIC(5,3) DEFAULT 0,
  hallucination_detected BOOLEAN DEFAULT false
);

ALTER TABLE public.kb_eval_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage eval results"
  ON public.kb_eval_results FOR ALL
  USING (public.kb_is_admin());
