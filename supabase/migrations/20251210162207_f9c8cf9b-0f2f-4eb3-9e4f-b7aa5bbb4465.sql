
-- ============================================
-- OKR v2 Schema Migration (Fixed)
-- ============================================

-- 1. Insert OKR v2 feature flag (using correct column name 'enabled')
INSERT INTO public.feature_flags (flag_key, enabled, description)
VALUES ('okr_v2_enabled', false, 'Enable OKR v2 unified objectives model (Theme → Objective → KR → Work)')
ON CONFLICT (flag_key) DO NOTHING;

-- 2. Create KR Work Contributions table (KR → Work Item links with contribution %)
CREATE TABLE IF NOT EXISTS public.kr_work_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID NOT NULL REFERENCES public.key_results_v2(id) ON DELETE CASCADE,
  work_item_id UUID NOT NULL,
  work_item_type TEXT NOT NULL CHECK (work_item_type IN ('epic', 'feature', 'story')),
  contribution_percent NUMERIC NOT NULL CHECK (contribution_percent > 0 AND contribution_percent <= 100),
  calculated_progress NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(key_result_id, work_item_id)
);

-- Enable RLS on kr_work_contributions
ALTER TABLE public.kr_work_contributions ENABLE ROW LEVEL SECURITY;

-- RLS policies for kr_work_contributions
CREATE POLICY "Authenticated users can view kr_work_contributions" 
ON public.kr_work_contributions FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert kr_work_contributions" 
ON public.kr_work_contributions FOR INSERT 
TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update kr_work_contributions" 
ON public.kr_work_contributions FOR UPDATE 
TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete kr_work_contributions" 
ON public.kr_work_contributions FOR DELETE 
TO authenticated USING (true);

-- 3. Add v2 fields to key_results_v2 table
ALTER TABLE public.key_results_v2 
ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'increase',
ADD COLUMN IF NOT EXISTS update_frequency TEXT DEFAULT 'weekly',
ADD COLUMN IF NOT EXISTS last_update_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_manual_override_allowed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS override_value NUMERIC,
ADD COLUMN IF NOT EXISTS override_reason TEXT,
ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS health TEXT DEFAULT 'grey',
ADD COLUMN IF NOT EXISTS progress NUMERIC DEFAULT 0;

-- 4. Add v2 fields to objectives table
ALTER TABLE public.objectives 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'org-wide',
ADD COLUMN IF NOT EXISTS overall_progress NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_v2 BOOLEAN DEFAULT false;

-- 5. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_kr_work_contributions_kr_id ON public.kr_work_contributions(key_result_id);
CREATE INDEX IF NOT EXISTS idx_kr_work_contributions_work_item ON public.kr_work_contributions(work_item_id, work_item_type);
CREATE INDEX IF NOT EXISTS idx_objectives_is_v2 ON public.objectives(is_v2);
CREATE INDEX IF NOT EXISTS idx_objectives_theme_id ON public.objectives(theme_id);

-- 6. Create trigger function for updating kr_work_contributions.updated_at
CREATE OR REPLACE FUNCTION public.update_kr_work_contributions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS update_kr_work_contributions_timestamp ON public.kr_work_contributions;
CREATE TRIGGER update_kr_work_contributions_timestamp
  BEFORE UPDATE ON public.kr_work_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_kr_work_contributions_updated_at();
