-- Create business_request_links table for external links
CREATE TABLE public.business_request_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_request_id UUID NOT NULL REFERENCES public.business_requests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  link_type TEXT NOT NULL DEFAULT 'documentation',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_request_links ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view business request links" 
ON public.business_request_links FOR SELECT USING (true);

CREATE POLICY "Users can create business request links" 
ON public.business_request_links FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update business request links" 
ON public.business_request_links FOR UPDATE USING (true);

CREATE POLICY "Users can delete business request links" 
ON public.business_request_links FOR DELETE USING (true);

-- Create index for efficient querying
CREATE INDEX idx_business_request_links_request_id ON public.business_request_links(business_request_id);

-- Create business_request_discussions table for comments
CREATE TABLE public.business_request_discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_request_id UUID NOT NULL REFERENCES public.business_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_request_discussions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view discussions" 
ON public.business_request_discussions FOR SELECT USING (true);

CREATE POLICY "Users can create discussions" 
ON public.business_request_discussions FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own discussions" 
ON public.business_request_discussions FOR DELETE USING (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_business_request_discussions_request_id ON public.business_request_discussions(business_request_id);

-- Create business_request_audit_logs table for audit history
CREATE TABLE public.business_request_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_request_id UUID NOT NULL REFERENCES public.business_requests(id) ON DELETE CASCADE,
  actor_id UUID,
  actor_name TEXT,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_request_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can view audit logs" 
ON public.business_request_audit_logs FOR SELECT USING (true);

CREATE POLICY "System can create audit logs" 
ON public.business_request_audit_logs FOR INSERT WITH CHECK (true);

-- Create index for efficient querying and lazy loading
CREATE INDEX idx_business_request_audit_logs_request_id ON public.business_request_audit_logs(business_request_id);
CREATE INDEX idx_business_request_audit_logs_created_at ON public.business_request_audit_logs(created_at DESC);