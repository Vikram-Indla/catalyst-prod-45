-- Add file storage columns to business_request_links table
ALTER TABLE public.business_request_links 
ADD COLUMN IF NOT EXISTS kind text DEFAULT 'external',
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS file_path text,
ADD COLUMN IF NOT EXISTS file_size bigint,
ADD COLUMN IF NOT EXISTS mime_type text,
ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_request_links_kind ON public.business_request_links(kind);