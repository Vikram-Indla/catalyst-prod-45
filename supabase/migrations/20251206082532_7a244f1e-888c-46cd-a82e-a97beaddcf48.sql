-- Add business_request_id column to risks table for linking risks to demands
ALTER TABLE public.risks
ADD COLUMN business_request_id uuid REFERENCES public.business_requests(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX idx_risks_business_request_id ON public.risks(business_request_id);

-- Add RLS policy for risks linked to business requests
CREATE POLICY "Users can view risks linked to business requests"
ON public.risks
FOR SELECT
USING (business_request_id IS NOT NULL OR true);

CREATE POLICY "Users can insert risks linked to business requests"
ON public.risks
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update risks linked to business requests"
ON public.risks
FOR UPDATE
USING (true);

CREATE POLICY "Users can delete risks linked to business requests"
ON public.risks
FOR DELETE
USING (true);