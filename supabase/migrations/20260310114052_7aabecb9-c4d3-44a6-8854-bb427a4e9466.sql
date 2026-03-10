-- Enable RLS on all public tables that are currently missing it
ALTER TABLE public.tm_set_key_sequence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_test_case_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hi_project_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hi_hierarchy_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hi_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_document_jira_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_key_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_template_categories ENABLE ROW LEVEL SECURITY;

-- Add permissive read policies for authenticated users
CREATE POLICY "Authenticated users can read tm_set_key_sequence" ON public.tm_set_key_sequence FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read tm_test_case_templates" ON public.tm_test_case_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read hi_project_sequences" ON public.hi_project_sequences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read hi_hierarchy_levels" ON public.hi_hierarchy_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read hi_priorities" ON public.hi_priorities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read kb_document_jira_issues" ON public.kb_document_jira_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read tm_key_sequences" ON public.tm_key_sequences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read tm_roles" ON public.tm_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read tm_permissions" ON public.tm_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read tm_template_categories" ON public.tm_template_categories FOR SELECT TO authenticated USING (true);

-- Add insert/update policies for authenticated users
CREATE POLICY "Authenticated users can insert tm_set_key_sequence" ON public.tm_set_key_sequence FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tm_set_key_sequence" ON public.tm_set_key_sequence FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert tm_test_case_templates" ON public.tm_test_case_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tm_test_case_templates" ON public.tm_test_case_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert hi_project_sequences" ON public.hi_project_sequences FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update hi_project_sequences" ON public.hi_project_sequences FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert hi_hierarchy_levels" ON public.hi_hierarchy_levels FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update hi_hierarchy_levels" ON public.hi_hierarchy_levels FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert hi_priorities" ON public.hi_priorities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update hi_priorities" ON public.hi_priorities FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert kb_document_jira_issues" ON public.kb_document_jira_issues FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update kb_document_jira_issues" ON public.kb_document_jira_issues FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert tm_key_sequences" ON public.tm_key_sequences FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tm_key_sequences" ON public.tm_key_sequences FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert tm_roles" ON public.tm_roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tm_roles" ON public.tm_roles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert tm_permissions" ON public.tm_permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tm_permissions" ON public.tm_permissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert tm_template_categories" ON public.tm_template_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tm_template_categories" ON public.tm_template_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);