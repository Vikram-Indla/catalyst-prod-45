-- Create deploy_gate table
CREATE TABLE IF NOT EXISTS public.deploy_gate (
  id integer PRIMARY KEY DEFAULT 1,
  production_deploy_enabled boolean NOT NULL DEFAULT false,
  disabled_at timestamp with time zone,
  disabled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  disabled_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create deploy_settings table
CREATE TABLE IF NOT EXISTS public.deploy_settings (
  id integer PRIMARY KEY DEFAULT 1,
  github_pat text,
  vercel_token text,
  github_repo text DEFAULT 'Vikram-Indla/catalyst-prod-45',
  github_workflow_id text DEFAULT 'vercel-deploy.yml',
  vercel_project_id text,
  vercel_org_id text,
  production_url text DEFAULT 'https://ksa-catalyst.com',
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Create deploy_summaries table
CREATE TABLE IF NOT EXISTS public.deploy_summaries (
  id bigserial PRIMARY KEY,
  run_id bigint NOT NULL UNIQUE,
  summary text NOT NULL,
  commit_sha text,
  commit_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deploy_gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deploy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deploy_summaries ENABLE ROW LEVEL SECURITY;

-- RLS policies: admins only
CREATE POLICY "Admin read deploy_gate"
  ON public.deploy_gate FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin')));

CREATE POLICY "Admin update deploy_gate"
  ON public.deploy_gate FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin')));

CREATE POLICY "Admin read deploy_settings"
  ON public.deploy_settings FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin')));

CREATE POLICY "Admin update deploy_settings"
  ON public.deploy_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin')));

CREATE POLICY "Admin read deploy_summaries"
  ON public.deploy_summaries FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin')));

-- Insert default rows
INSERT INTO public.deploy_gate (id, production_deploy_enabled) VALUES (1, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.deploy_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
