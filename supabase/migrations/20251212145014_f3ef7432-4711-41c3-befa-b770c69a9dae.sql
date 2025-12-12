-- Program Key Aliases for backward compatibility (portfolios = Programs in UI)
CREATE TABLE IF NOT EXISTS public.program_key_aliases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  old_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(old_key)
);

-- Project Key Aliases for backward compatibility (programs table = Projects in UI)
CREATE TABLE IF NOT EXISTS public.project_key_aliases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  old_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(old_key)
);

-- Enable RLS
ALTER TABLE public.program_key_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_key_aliases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for program_key_aliases
CREATE POLICY "Anyone can view program key aliases"
  ON public.program_key_aliases FOR SELECT USING (true);

CREATE POLICY "Admins can manage program key aliases"
  ON public.program_key_aliases FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for project_key_aliases
CREATE POLICY "Anyone can view project key aliases"
  ON public.project_key_aliases FOR SELECT USING (true);

CREATE POLICY "Admins can manage project key aliases"
  ON public.project_key_aliases FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for fast lookup
CREATE INDEX idx_program_key_aliases_old_key ON public.program_key_aliases(old_key);
CREATE INDEX idx_project_key_aliases_old_key ON public.project_key_aliases(old_key);
CREATE INDEX idx_program_key_aliases_program_id ON public.program_key_aliases(program_id);
CREATE INDEX idx_project_key_aliases_project_id ON public.project_key_aliases(project_id);