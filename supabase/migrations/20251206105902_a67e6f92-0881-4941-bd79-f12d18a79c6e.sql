-- Add columns for implementation links and author tracking
ALTER TABLE public.business_request_links 
ADD COLUMN IF NOT EXISTS linked_item_id uuid,
ADD COLUMN IF NOT EXISTS linked_item_type text,
ADD COLUMN IF NOT EXISTS linked_item_source text,
ADD COLUMN IF NOT EXISTS added_by_name text;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_business_request_links_kind ON public.business_request_links(kind);
CREATE INDEX IF NOT EXISTS idx_business_request_links_linked_item ON public.business_request_links(linked_item_id) WHERE linked_item_id IS NOT NULL;