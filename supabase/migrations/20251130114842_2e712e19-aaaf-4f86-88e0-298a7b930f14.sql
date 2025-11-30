-- Drop existing risks table and recreate with Jira Align specification
-- Source: Implementation Spec Section 11, BRD Section 8, PRD Section 2

-- Drop existing table
DROP TABLE IF EXISTS public.risks CASCADE;

-- Create risks table with Jira Align schema
CREATE TABLE public.risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_number SERIAL UNIQUE NOT NULL,
  title TEXT NOT NULL CHECK (length(title) <= 100),
  description TEXT NOT NULL CHECK (length(description) <= 400000),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed')),
  occurrence TEXT CHECK (occurrence IN ('Low', 'Medium', 'High', 'Critical')),
  impact TEXT CHECK (impact IN ('Low', 'Medium', 'High', 'Critical')),
  critical_path TEXT CHECK (critical_path IN ('Yes', 'No')),
  program_id UUID NOT NULL,
  program_increment_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('Theme', 'Epic', 'Capability', 'Feature', 'Program Increment')),
  related_item_id UUID,
  resolution_method TEXT NOT NULL DEFAULT 'Owned' CHECK (resolution_method IN ('Resolved', 'Owned', 'Accepted', 'Mitigated')),
  target_resolution_date DATE,
  notify TEXT CHECK (length(notify) <= 2000),
  consequence TEXT CHECK (length(consequence) <= 2000),
  contingency TEXT CHECK (length(contingency) <= 2000),
  mitigation TEXT CHECK (length(mitigation) <= 2000),
  resolution_status TEXT CHECK (length(resolution_status) <= 2000),
  tags TEXT CHECK (length(tags) <= 2000),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  -- Foreign key constraints
  CONSTRAINT fk_program FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE,
  CONSTRAINT fk_program_increment FOREIGN KEY (program_increment_id) REFERENCES public.program_increments(id) ON DELETE CASCADE,
  
  -- Conditional validation: mitigation required if resolution_method = 'Mitigated'
  CONSTRAINT check_mitigation_required CHECK (
    (resolution_method != 'Mitigated') OR (mitigation IS NOT NULL AND mitigation != '')
  ),
  
  -- Conditional validation: resolution_status required if resolution_method = 'Resolved'
  CONSTRAINT check_resolution_status_required CHECK (
    (resolution_method != 'Resolved') OR (resolution_status IS NOT NULL AND resolution_status != '')
  )
);

-- Enable RLS
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for program-level access
CREATE POLICY "Users can view risks in their programs"
  ON public.risks
  FOR SELECT
  USING (
    program_id IN (
      SELECT program_id FROM public.program_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create risks in their programs"
  ON public.risks
  FOR INSERT
  WITH CHECK (
    program_id IN (
      SELECT program_id FROM public.program_members WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update risks in their programs"
  ON public.risks
  FOR UPDATE
  USING (
    program_id IN (
      SELECT program_id FROM public.program_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete risks in their programs"
  ON public.risks
  FOR DELETE
  USING (
    program_id IN (
      SELECT program_id FROM public.program_members WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_risks_program_id ON public.risks(program_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_risks_program_increment_id ON public.risks(program_increment_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_risks_resolution_method ON public.risks(resolution_method) WHERE deleted_at IS NULL;
CREATE INDEX idx_risks_status ON public.risks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_risks_owner_id ON public.risks(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_risks_created_at ON public.risks(created_at DESC) WHERE deleted_at IS NULL;

-- Trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_risks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_risks_updated_at_trigger
  BEFORE UPDATE ON public.risks
  FOR EACH ROW
  EXECUTE FUNCTION update_risks_updated_at();

-- Function to auto-set status when resolution_method changes
CREATE OR REPLACE FUNCTION auto_update_risk_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When resolution_method changes to 'Resolved', set status to 'Closed'
  IF NEW.resolution_method = 'Resolved' AND (OLD.resolution_method IS NULL OR OLD.resolution_method != 'Resolved') THEN
    NEW.status = 'Closed';
  END IF;
  
  -- When resolution_method changes from 'Resolved' to anything else, set status to 'Open'
  IF OLD.resolution_method = 'Resolved' AND NEW.resolution_method != 'Resolved' THEN
    NEW.status = 'Open';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_risk_status_trigger
  BEFORE INSERT OR UPDATE OF resolution_method ON public.risks
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_risk_status();