-- Document Watchers table (Source: https://support.atlassian.com/confluence-cloud/docs/watch-pages-spaces-and-blogs/)
CREATE TABLE public.kb_document_watchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_id, user_id)
);

-- Document Restrictions table (Source: https://support.atlassian.com/confluence-cloud/docs/restrict-a-page-or-space/)
CREATE TABLE public.kb_document_restrictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  restriction_type TEXT NOT NULL CHECK (restriction_type IN ('view', 'edit')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'group')),
  entity_id TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_id, restriction_type, entity_type, entity_id)
);

-- Enable RLS
ALTER TABLE public.kb_document_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_document_restrictions ENABLE ROW LEVEL SECURITY;

-- RLS policies for watchers
CREATE POLICY "Users can view watchers" ON public.kb_document_watchers FOR SELECT USING (true);
CREATE POLICY "Users can watch documents" ON public.kb_document_watchers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unwatch documents" ON public.kb_document_watchers FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for restrictions
CREATE POLICY "Users can view restrictions" ON public.kb_document_restrictions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage restrictions" ON public.kb_document_restrictions FOR ALL USING (auth.uid() IS NOT NULL);