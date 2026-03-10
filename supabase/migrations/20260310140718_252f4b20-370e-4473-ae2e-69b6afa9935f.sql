-- RLS enable is idempotent - safe to run again
-- These tables need RLS enabled in Live (already enabled in Test)
ALTER TABLE public.hi_hierarchy_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hi_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hi_project_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_document_jira_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_key_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_set_key_sequence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_test_case_templates ENABLE ROW LEVEL SECURITY;