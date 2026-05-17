-- Creates public.projects table which is referenced by subsequent migrations.
-- Includes all columns that later migrations add via ALTER TABLE ADD COLUMN IF NOT EXISTS.
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key TEXT,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  program_id UUID,
  status TEXT DEFAULT 'active',
  is_default BOOLEAN DEFAULT FALSE,
  display_status TEXT DEFAULT 'active',
  settings JSONB DEFAULT '{}'::jsonb,
  wip_limits JSONB DEFAULT '{}'::jsonb,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view projects"
  ON public.projects FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage projects"
  ON public.projects FOR ALL
  USING (public.is_admin(auth.uid()));
