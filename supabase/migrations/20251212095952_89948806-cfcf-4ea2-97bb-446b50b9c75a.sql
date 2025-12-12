-- =====================================================
-- OPTION SETS & OPTION VALUES - Centralized Lookup System
-- =====================================================

-- Option Sets: The list definitions
CREATE TABLE public.option_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Option Values: Items inside each list
CREATE TABLE public.option_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  option_set_id UUID NOT NULL REFERENCES public.option_sets(id) ON DELETE CASCADE,
  value_key TEXT NOT NULL,
  label TEXT NOT NULL,
  label_ar TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_value_key_per_set UNIQUE (option_set_id, value_key)
);

-- Enable RLS
ALTER TABLE public.option_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Read access for everyone, write for authenticated users
CREATE POLICY "Anyone can view option_sets" ON public.option_sets
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage option_sets" ON public.option_sets
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view option_values" ON public.option_values
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage option_values" ON public.option_values
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Indexes for performance
CREATE INDEX idx_option_values_set_id ON public.option_values(option_set_id);
CREATE INDEX idx_option_values_active ON public.option_values(is_active);
CREATE INDEX idx_option_sets_key ON public.option_sets(key);

-- Trigger for updated_at
CREATE TRIGGER update_option_sets_updated_at
  BEFORE UPDATE ON public.option_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_option_values_updated_at
  BEFORE UPDATE ON public.option_values
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SEED DATA: Migrate existing hardcoded options
-- =====================================================

-- 1. DEPARTMENT
INSERT INTO public.option_sets (key, name, description, is_system)
VALUES ('DEPARTMENT', 'Department', 'Organization departments', true);

INSERT INTO public.option_values (option_set_id, value_key, label, label_ar, sort_order)
SELECT 
  (SELECT id FROM public.option_sets WHERE key = 'DEPARTMENT'),
  value_key,
  label,
  label_ar,
  sort_order
FROM (VALUES
  ('it', 'Information Technology', 'تقنية المعلومات', 1),
  ('operations', 'Operations', 'العمليات', 2),
  ('finance', 'Finance', 'المالية', 3),
  ('hr', 'Human Resources', 'الموارد البشرية', 4),
  ('marketing', 'Marketing', 'التسويق', 5),
  ('sales', 'Sales', 'المبيعات', 6),
  ('legal', 'Legal', 'الشؤون القانونية', 7),
  ('strategy', 'Strategy', 'الاستراتيجية', 8),
  ('business', 'Business', 'الأعمال', 9),
  ('other', 'Other', 'أخرى', 10)
) AS t(value_key, label, label_ar, sort_order);

-- 2. DELIVERY_PLATFORM
INSERT INTO public.option_sets (key, name, description, is_system)
VALUES ('DELIVERY_PLATFORM', 'Delivery Platform', 'Available delivery platforms', true);

INSERT INTO public.option_values (option_set_id, value_key, label, label_ar, sort_order)
SELECT 
  (SELECT id FROM public.option_sets WHERE key = 'DELIVERY_PLATFORM'),
  value_key,
  label,
  label_ar,
  sort_order
FROM (VALUES
  ('Senaei Platform', 'Senaei Platform', 'منصة صناعي', 1),
  ('Innovation Platform', 'Innovation Platform', 'منصة الابتكار', 2),
  ('Tahommena', 'Tahommena', 'طموحنا', 3),
  ('Compass', 'Compass', 'البوصلة', 4),
  ('Mini Apps', 'Mini Apps', 'التطبيقات المصغرة', 5),
  ('Website', 'Website', 'الموقع الإلكتروني', 6),
  ('Investor Journey', 'Investor Journey', 'رحلة المستثمر', 7),
  ('Catalyst', 'Catalyst', 'كاتاليست', 8),
  ('RHQ Services', 'RHQ Services', 'خدمات المقر الإقليمي', 9),
  ('Other', 'Other', 'أخرى', 10)
) AS t(value_key, label, label_ar, sort_order);

-- 3. DELIVERY_TRACK
INSERT INTO public.option_sets (key, name, description, is_system)
VALUES ('DELIVERY_TRACK', 'Delivery Track', 'Delivery tracks for work items', false);

INSERT INTO public.option_values (option_set_id, value_key, label, sort_order)
SELECT 
  (SELECT id FROM public.option_sets WHERE key = 'DELIVERY_TRACK'),
  value_key,
  label,
  sort_order
FROM (VALUES
  ('BAU Fast Track', 'BAU Fast Track', 1),
  ('Project', 'Project', 2),
  ('Entity Integration', 'Entity Integration', 3),
  ('Digital', 'Digital', 4),
  ('Core Banking', 'Core Banking', 5),
  ('Payments', 'Payments', 6),
  ('Analytics', 'Analytics', 7)
) AS t(value_key, label, sort_order);

-- 4. PLANNED_QUARTER
INSERT INTO public.option_sets (key, name, description, is_system)
VALUES ('PLANNED_QUARTER', 'Planned Quarter', 'Available planning quarters', false);

INSERT INTO public.option_values (option_set_id, value_key, label, sort_order)
SELECT 
  (SELECT id FROM public.option_sets WHERE key = 'PLANNED_QUARTER'),
  value_key,
  label,
  sort_order
FROM (VALUES
  ('Q1-2025', 'Q1 2025', 1),
  ('Q2-2025', 'Q2 2025', 2),
  ('Q3-2025', 'Q3 2025', 3),
  ('Q4-2025', 'Q4 2025', 4),
  ('Q1-2026', 'Q1 2026', 5),
  ('Q2-2026', 'Q2 2026', 6),
  ('Q3-2026', 'Q3 2026', 7),
  ('Q4-2026', 'Q4 2026', 8),
  ('Q1-2027', 'Q1 2027', 9),
  ('Q2-2027', 'Q2 2027', 10),
  ('Q3-2027', 'Q3 2027', 11),
  ('Q4-2027', 'Q4 2027', 12)
) AS t(value_key, label, sort_order);

-- 5. PRIORITY
INSERT INTO public.option_sets (key, name, description, is_system)
VALUES ('PRIORITY', 'Priority', 'Priority levels for work items', true);

INSERT INTO public.option_values (option_set_id, value_key, label, color, sort_order)
SELECT 
  (SELECT id FROM public.option_sets WHERE key = 'PRIORITY'),
  value_key,
  label,
  color,
  sort_order
FROM (VALUES
  ('critical', 'Critical', 'bg-red-100 text-red-700', 1),
  ('high', 'High', 'bg-orange-100 text-orange-700', 2),
  ('medium', 'Medium', 'bg-amber-100 text-amber-700', 3),
  ('low', 'Low', 'bg-green-100 text-green-700', 4)
) AS t(value_key, label, color, sort_order);

-- 6. COMPLEXITY
INSERT INTO public.option_sets (key, name, description, is_system)
VALUES ('COMPLEXITY', 'Complexity', 'Complexity levels', true);

INSERT INTO public.option_values (option_set_id, value_key, label, sort_order)
SELECT 
  (SELECT id FROM public.option_sets WHERE key = 'COMPLEXITY'),
  value_key,
  label,
  sort_order
FROM (VALUES
  ('Low', 'Low', 1),
  ('Medium', 'Medium', 2),
  ('High', 'High', 3),
  ('Very High', 'Very High', 4)
) AS t(value_key, label, sort_order);

-- 7. URGENCY
INSERT INTO public.option_sets (key, name, description, is_system)
VALUES ('URGENCY', 'Urgency', 'Urgency levels', true);

INSERT INTO public.option_values (option_set_id, value_key, label, sort_order)
SELECT 
  (SELECT id FROM public.option_sets WHERE key = 'URGENCY'),
  value_key,
  label,
  sort_order
FROM (VALUES
  ('Low', 'Low', 1),
  ('Normal', 'Normal', 2),
  ('High', 'High', 3),
  ('Critical', 'Critical', 4)
) AS t(value_key, label, sort_order);

-- 8. RISK_RATING
INSERT INTO public.option_sets (key, name, description, is_system)
VALUES ('RISK_RATING', 'Risk Rating', 'Risk rating levels', true);

INSERT INTO public.option_values (option_set_id, value_key, label, color, sort_order)
SELECT 
  (SELECT id FROM public.option_sets WHERE key = 'RISK_RATING'),
  value_key,
  label,
  color,
  sort_order
FROM (VALUES
  ('Low', 'Low', 'bg-green-100 text-green-700', 1),
  ('Medium', 'Medium', 'bg-amber-100 text-amber-700', 2),
  ('High', 'High', 'bg-orange-100 text-orange-700', 3),
  ('Critical', 'Critical', 'bg-red-100 text-red-700', 4)
) AS t(value_key, label, color, sort_order);

-- 9. FUNDING_STATUS
INSERT INTO public.option_sets (key, name, description, is_system)
VALUES ('FUNDING_STATUS', 'Funding Status', 'Funding status options', false);

INSERT INTO public.option_values (option_set_id, value_key, label, sort_order)
SELECT 
  (SELECT id FROM public.option_sets WHERE key = 'FUNDING_STATUS'),
  value_key,
  label,
  sort_order
FROM (VALUES
  ('Not Budgeted', 'Not Budgeted', 1),
  ('Budget Requested', 'Budget Requested', 2),
  ('Partially Funded', 'Partially Funded', 3),
  ('Fully Funded', 'Fully Funded', 4)
) AS t(value_key, label, sort_order);

-- 10. CONTRACT_TYPE
INSERT INTO public.option_sets (key, name, description, is_system)
VALUES ('CONTRACT_TYPE', 'Contract Type', 'Contract type options', false);

INSERT INTO public.option_values (option_set_id, value_key, label, sort_order)
SELECT 
  (SELECT id FROM public.option_sets WHERE key = 'CONTRACT_TYPE'),
  value_key,
  label,
  sort_order
FROM (VALUES
  ('In-source', 'In-source', 1),
  ('Co-source', 'Co-source', 2),
  ('Outsource', 'Outsource', 3)
) AS t(value_key, label, sort_order);

-- 11. DELIVERY_MODEL
INSERT INTO public.option_sets (key, name, description, is_system)
VALUES ('DELIVERY_MODEL', 'Delivery Model', 'Delivery model options', false);

INSERT INTO public.option_values (option_set_id, value_key, label, sort_order)
SELECT 
  (SELECT id FROM public.option_sets WHERE key = 'DELIVERY_MODEL'),
  value_key,
  label,
  sort_order
FROM (VALUES
  ('Vendor Owns Build', 'Vendor Owns Build', 1),
  ('Vendor Build, Internal Support', 'Vendor Build, Internal Support', 2),
  ('Internal Build', 'Internal Build', 3)
) AS t(value_key, label, sort_order);

-- 12. CAPACITY_STATUS
INSERT INTO public.option_sets (key, name, description, is_system)
VALUES ('CAPACITY_STATUS', 'Capacity Status', 'Capacity status options', false);

INSERT INTO public.option_values (option_set_id, value_key, label, sort_order)
SELECT 
  (SELECT id FROM public.option_sets WHERE key = 'CAPACITY_STATUS'),
  value_key,
  label,
  sort_order
FROM (VALUES
  ('Not Assessed', 'Not Assessed', 1),
  ('Capacity Available', 'Capacity Available', 2),
  ('At Capacity', 'At Capacity', 3),
  ('Over Capacity', 'Over Capacity', 4)
) AS t(value_key, label, sort_order);

-- 13. BUDGET_YEAR
INSERT INTO public.option_sets (key, name, description, is_system)
VALUES ('BUDGET_YEAR', 'Budget Year', 'Fiscal year options', false);

INSERT INTO public.option_values (option_set_id, value_key, label, sort_order)
SELECT 
  (SELECT id FROM public.option_sets WHERE key = 'BUDGET_YEAR'),
  value_key,
  label,
  sort_order
FROM (VALUES
  ('FY 2024', 'FY 2024', 1),
  ('FY 2025', 'FY 2025', 2),
  ('FY 2026', 'FY 2026', 3),
  ('FY 2027', 'FY 2027', 4)
) AS t(value_key, label, sort_order);

-- 14. PROCESS_STEP (system-managed)
INSERT INTO public.option_sets (key, name, description, is_system)
VALUES ('PROCESS_STEP', 'Process Step', 'Workflow process steps', true);

INSERT INTO public.option_values (option_set_id, value_key, label, color, sort_order)
SELECT 
  (SELECT id FROM public.option_sets WHERE key = 'PROCESS_STEP'),
  value_key,
  label,
  color,
  sort_order
FROM (VALUES
  ('new_request', 'New request', 'bg-amber-100 text-amber-700', 1),
  ('new_demand', 'New demand', 'bg-slate-100 text-slate-600', 2),
  ('in_review', 'In review', 'bg-pink-100 text-pink-700', 3),
  ('analyse', 'Analyse', 'bg-violet-100 text-violet-700', 4),
  ('approved', 'Approved', 'bg-emerald-100 text-emerald-700', 5),
  ('ready_to_implement', 'Ready to implement', 'bg-blue-100 text-blue-700', 6),
  ('implement', 'Implement', 'bg-indigo-100 text-indigo-700', 7),
  ('closed', 'Closed', 'bg-emerald-100 text-emerald-700', 8),
  ('rejected', 'Rejected', 'bg-red-100 text-red-700', 9),
  ('on_hold', 'On-hold', 'bg-amber-100 text-amber-700', 10)
) AS t(value_key, label, color, sort_order);

-- 15. HEALTH_STATUS
INSERT INTO public.option_sets (key, name, description, is_system)
VALUES ('HEALTH_STATUS', 'Health Status', 'Health status indicators', true);

INSERT INTO public.option_values (option_set_id, value_key, label, color, sort_order)
SELECT 
  (SELECT id FROM public.option_sets WHERE key = 'HEALTH_STATUS'),
  value_key,
  label,
  color,
  sort_order
FROM (VALUES
  ('green', 'Green', 'bg-green-100 text-green-700', 1),
  ('amber', 'Amber', 'bg-amber-100 text-amber-700', 2),
  ('red', 'Red', 'bg-red-100 text-red-600', 3)
) AS t(value_key, label, color, sort_order);