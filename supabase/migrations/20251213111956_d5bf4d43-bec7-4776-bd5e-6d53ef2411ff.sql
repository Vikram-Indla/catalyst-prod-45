-- Create risk_links table for storing links and documents associated with risks
CREATE TABLE public.risk_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  link_type TEXT DEFAULT 'external',
  kind TEXT DEFAULT 'external',
  file_name TEXT,
  file_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  added_by_name TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.risk_links ENABLE ROW LEVEL SECURITY;

-- Create policies for risk links access
CREATE POLICY "Users can view risk links if approved" 
ON public.risk_links 
FOR SELECT 
USING (public.current_user_is_approved());

CREATE POLICY "Users can create risk links if approved" 
ON public.risk_links 
FOR INSERT 
WITH CHECK (public.current_user_is_approved());

CREATE POLICY "Users can update risk links if approved" 
ON public.risk_links 
FOR UPDATE 
USING (public.current_user_is_approved());

CREATE POLICY "Users can delete risk links if approved" 
ON public.risk_links 
FOR DELETE 
USING (public.current_user_is_approved());

-- Create index for faster lookups
CREATE INDEX idx_risk_links_risk_id ON public.risk_links(risk_id);

-- Add trigger for updated_at
CREATE TRIGGER update_risk_links_updated_at
  BEFORE UPDATE ON public.risk_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();