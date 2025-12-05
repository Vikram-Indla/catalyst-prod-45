-- Starred/Favorite Documents table
-- Source: https://support.atlassian.com/confluence-cloud/docs/save-and-remove-pages-from-your-favorites/
CREATE TABLE public.kb_document_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_id, user_id)
);

-- Enable RLS
ALTER TABLE public.kb_document_favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their favorites" ON public.kb_document_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON public.kb_document_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON public.kb_document_favorites FOR DELETE USING (auth.uid() = user_id);