-- Create table for test case linked items (traceability)
CREATE TABLE IF NOT EXISTS public.tm_test_case_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES public.tm_test_cases(id) ON DELETE CASCADE,
  linked_item_id UUID NOT NULL,
  linked_item_type TEXT NOT NULL CHECK (linked_item_type IN ('story', 'feature', 'epic', 'defect', 'incident')),
  linked_item_key TEXT NOT NULL,
  linked_item_title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  
  UNIQUE(test_case_id, linked_item_id, linked_item_type)
);

-- Enable RLS
ALTER TABLE public.tm_test_case_links ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view linked items" 
ON public.tm_test_case_links 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can create linked items" 
ON public.tm_test_case_links 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update linked items" 
ON public.tm_test_case_links 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Users can delete linked items" 
ON public.tm_test_case_links 
FOR DELETE 
TO authenticated
USING (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_tm_test_case_links_test_case ON public.tm_test_case_links(test_case_id);
CREATE INDEX IF NOT EXISTS idx_tm_test_case_links_linked ON public.tm_test_case_links(linked_item_id, linked_item_type);