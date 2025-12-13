-- Create business_processes lookup table
CREATE TABLE public.business_processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on name_en
ALTER TABLE public.business_processes ADD CONSTRAINT business_processes_name_en_unique UNIQUE (name_en);

-- Create indexes
CREATE INDEX idx_business_processes_active ON public.business_processes (active);
CREATE INDEX idx_business_processes_sort_order ON public.business_processes (sort_order);

-- Enable RLS
ALTER TABLE public.business_processes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage business processes"
  ON public.business_processes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active business processes"
  ON public.business_processes FOR SELECT
  USING (active = true);

-- Create epic_business_processes join table (many-to-many)
CREATE TABLE public.epic_business_processes (
  epic_id UUID NOT NULL REFERENCES public.epics(id) ON DELETE CASCADE,
  business_process_id UUID NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (epic_id, business_process_id)
);

-- Create indexes for join table
CREATE INDEX idx_epic_business_processes_epic_id ON public.epic_business_processes (epic_id);
CREATE INDEX idx_epic_business_processes_business_process_id ON public.epic_business_processes (business_process_id);

-- Enable RLS on join table
ALTER TABLE public.epic_business_processes ENABLE ROW LEVEL SECURITY;

-- RLS policies for join table
CREATE POLICY "Users can view epic business processes"
  ON public.epic_business_processes FOR SELECT
  USING (true);

CREATE POLICY "Users can manage epic business processes"
  ON public.epic_business_processes FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at on business_processes
CREATE TRIGGER update_business_processes_updated_at
  BEFORE UPDATE ON public.business_processes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 29 business processes from user-provided list
INSERT INTO public.business_processes (name_en, active, sort_order) VALUES
  ('Standard Incentive', true, 1),
  ('Joining the Factories of the Future Program', true, 2),
  ('Fourth Industrial Revolution Program Grant', true, 3),
  ('Issuance of Industrial License', true, 4),
  ('Modify Industrial License', true, 5),
  ('Renew Industrial License', true, 6),
  ('Labor Enablement', true, 7),
  ('Transfer Ownership', true, 8),
  ('Cancel Industrial License', true, 9),
  ('Customs Exemption for Raw Materials', true, 10),
  ('Customs Exemption for Equipment and Spare Parts', true, 11),
  ('Customs Exemption for Additional Raw Materials', true, 12),
  ('Customs For Export', true, 13),
  ('Restricted Chemical Imports Permit', true, 14),
  ('Unrestricted Chemical Imports Permit', true, 15),
  ('Industrial Sector Competitiveness Application', true, 16),
  ('Addition of Customs Item from Local Industrial Capabilities List', true, 17),
  ('Complaint of Unfair Competition', true, 18),
  ('Industrial Site Allocation', true, 19),
  ('(RCJY) Industrial Site Allocation', true, 20),
  ('Environmental Permit for Construction (RCJY)', true, 21),
  ('Environmental Activity Classification', true, 22),
  ('Environmental Permit for Construction', true, 23),
  ('Industrial Scan', true, 24),
  ('Removal of Customs Item from Local Industrial Capabilities List', true, 25),
  ('Approval of the product/importer declaration form', true, 26),
  ('Availability of Petrochemical Raw Materials', true, 27),
  ('Upgrade Industrial License to Established', true, 28),
  ('Upgrade Industrial License to Production', true, 29);