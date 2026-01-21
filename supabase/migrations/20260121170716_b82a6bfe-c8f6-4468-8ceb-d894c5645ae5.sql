-- Phase 5C: Test Data Management Tables

-- Test Data Sets table
CREATE TABLE public.test_data_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  data_type TEXT NOT NULL DEFAULT 'json', -- json, csv, sql
  data_content JSONB,
  is_sensitive BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Masking Rules table for PII protection
CREATE TABLE public.masking_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  field_pattern TEXT NOT NULL, -- regex pattern to match fields
  masking_type TEXT NOT NULL DEFAULT 'redact', -- redact, hash, partial, scramble
  masking_config JSONB, -- config like { "show_last": 4 } for partial
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Data Access Audit Log
CREATE TABLE public.data_access_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_set_id UUID REFERENCES public.test_data_sets(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL, -- view, export, modify, delete
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Test Case to Data Set linkage
CREATE TABLE public.test_case_data_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_case_id UUID REFERENCES public.test_cases(id) ON DELETE CASCADE,
  data_set_id UUID REFERENCES public.test_data_sets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(test_case_id, data_set_id)
);

-- Enable RLS
ALTER TABLE public.test_data_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masking_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_data_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_data_sets
CREATE POLICY "Users can view test data sets" ON public.test_data_sets
  FOR SELECT USING (true);

CREATE POLICY "Users can create test data sets" ON public.test_data_sets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update test data sets" ON public.test_data_sets
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete test data sets" ON public.test_data_sets
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for masking_rules
CREATE POLICY "Users can view masking rules" ON public.masking_rules
  FOR SELECT USING (true);

CREATE POLICY "Users can create masking rules" ON public.masking_rules
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update masking rules" ON public.masking_rules
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete masking rules" ON public.masking_rules
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for data_access_audit
CREATE POLICY "Users can view access audit" ON public.data_access_audit
  FOR SELECT USING (true);

CREATE POLICY "Users can create audit entries" ON public.data_access_audit
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for test_case_data_sets
CREATE POLICY "Users can view test case data sets" ON public.test_case_data_sets
  FOR SELECT USING (true);

CREATE POLICY "Users can manage test case data sets" ON public.test_case_data_sets
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Updated_at triggers
CREATE TRIGGER update_test_data_sets_updated_at
  BEFORE UPDATE ON public.test_data_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_masking_rules_updated_at
  BEFORE UPDATE ON public.masking_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();