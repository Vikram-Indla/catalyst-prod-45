-- Stub: project_members was a pre-existing Lovable table not created by any migration
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members (project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members (user_id);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project members are viewable by authenticated users" ON public.project_members;
CREATE POLICY "Project members are viewable by authenticated users"
  ON public.project_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Project members are manageable by authenticated users" ON public.project_members;
CREATE POLICY "Project members are manageable by authenticated users"
  ON public.project_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
