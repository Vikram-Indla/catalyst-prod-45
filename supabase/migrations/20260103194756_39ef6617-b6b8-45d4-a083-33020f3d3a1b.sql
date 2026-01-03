-- ═══════════════════════════════════════════════════════════════════════════════
-- ENTERPRISE TEST CASE MANAGEMENT SCHEMA ENHANCEMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1) Add missing columns to test_cases
ALTER TABLE public.test_cases
ADD COLUMN IF NOT EXISTS risk varchar(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS case_key varchar(50);

-- 2) Add missing columns to test_case_steps  
ALTER TABLE public.test_case_steps
ADD COLUMN IF NOT EXISTS evidence_required varchar(20) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS step_tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS shared_step_group_id uuid;

-- 3) Create shared_step_groups table
CREATE TABLE IF NOT EXISTS public.shared_step_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id),
  name varchar(200) NOT NULL,
  description text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4) Create shared_step_items table
CREATE TABLE IF NOT EXISTS public.shared_step_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.shared_step_groups(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  action_rich text NOT NULL,
  data_input_rich text,
  expected_result_rich text,
  evidence_required varchar(20) DEFAULT 'none',
  created_at timestamptz DEFAULT now()
);

-- 5) Create test_case_variables table (for parameterization)
CREATE TABLE IF NOT EXISTS public.test_case_variables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- 6) Create test_case_dataset_values table
CREATE TABLE IF NOT EXISTS public.test_case_dataset_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES public.test_case_datasets(id) ON DELETE CASCADE,
  variable_id uuid NOT NULL REFERENCES public.test_case_variables(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz DEFAULT now()
);

-- 7) Create test_case_links table (for traceability)
CREATE TABLE IF NOT EXISTS public.test_case_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
  linked_type varchar(50) NOT NULL, -- requirement, story, feature, defect, incident, test_set, cycle, release
  linked_id uuid NOT NULL,
  linked_key varchar(100),
  linked_title varchar(500),
  relation varchar(20) DEFAULT 'relates', -- relates, blocks, blocked_by
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 8) Create test_audit_log table
CREATE TABLE IF NOT EXISTS public.test_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type varchar(50) NOT NULL,
  entity_id uuid NOT NULL,
  action varchar(50) NOT NULL,
  changes_json jsonb,
  actor_id uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 9) Create indexes
CREATE INDEX IF NOT EXISTS idx_shared_step_groups_project ON public.shared_step_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_shared_step_items_group ON public.shared_step_items(group_id);
CREATE INDEX IF NOT EXISTS idx_test_case_variables_case ON public.test_case_variables(case_id);
CREATE INDEX IF NOT EXISTS idx_test_case_dataset_values_dataset ON public.test_case_dataset_values(dataset_id);
CREATE INDEX IF NOT EXISTS idx_test_case_links_case ON public.test_case_links(case_id);
CREATE INDEX IF NOT EXISTS idx_test_case_links_linked ON public.test_case_links(linked_type, linked_id);
CREATE INDEX IF NOT EXISTS idx_test_audit_log_entity ON public.test_audit_log(entity_type, entity_id);

-- 10) Add FK reference for shared_step_group_id in test_case_steps
ALTER TABLE public.test_case_steps
ADD CONSTRAINT fk_shared_step_group 
FOREIGN KEY (shared_step_group_id) REFERENCES public.shared_step_groups(id) ON DELETE SET NULL;

-- 11) Enable RLS on all new tables
ALTER TABLE public.shared_step_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_step_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_dataset_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_audit_log ENABLE ROW LEVEL SECURITY;

-- 12) Create RLS policies for authenticated users
CREATE POLICY "Authenticated users can manage shared_step_groups"
ON public.shared_step_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage shared_step_items"
ON public.shared_step_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage test_case_variables"
ON public.test_case_variables FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage test_case_dataset_values"
ON public.test_case_dataset_values FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage test_case_links"
ON public.test_case_links FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage test_audit_log"
ON public.test_audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 13) Update trigger for updated_at on new tables
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shared_step_groups_updated_at
BEFORE UPDATE ON public.shared_step_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();