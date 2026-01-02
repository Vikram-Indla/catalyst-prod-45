-- Create test_findings table for traceability gap tracking
CREATE TABLE public.test_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  type VARCHAR(50) NOT NULL CHECK (type IN ('missing_tests', 'no_execution', 'repeated_failure', 'blocked_stale', 'coverage_gap', 'other')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  entities_json JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.test_findings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view findings in their program" 
ON public.test_findings 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create findings" 
ON public.test_findings 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update findings" 
ON public.test_findings 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Index for faster queries
CREATE INDEX idx_test_findings_program ON public.test_findings(program_id);
CREATE INDEX idx_test_findings_status ON public.test_findings(status);
CREATE INDEX idx_test_findings_type ON public.test_findings(type);