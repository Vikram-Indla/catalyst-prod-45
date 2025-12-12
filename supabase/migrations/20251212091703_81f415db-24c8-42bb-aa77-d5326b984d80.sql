-- Create theme_links table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.theme_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_id UUID NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  link_type TEXT DEFAULT 'external',
  kind TEXT DEFAULT 'external',
  linked_item_id UUID,
  linked_item_type TEXT,
  file_name TEXT,
  file_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  added_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add kind column to epic_links if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epic_links' AND column_name = 'kind') THEN
    ALTER TABLE public.epic_links ADD COLUMN kind TEXT DEFAULT 'external';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epic_links' AND column_name = 'linked_item_id') THEN
    ALTER TABLE public.epic_links ADD COLUMN linked_item_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epic_links' AND column_name = 'linked_item_type') THEN
    ALTER TABLE public.epic_links ADD COLUMN linked_item_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epic_links' AND column_name = 'file_name') THEN
    ALTER TABLE public.epic_links ADD COLUMN file_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epic_links' AND column_name = 'file_path') THEN
    ALTER TABLE public.epic_links ADD COLUMN file_path TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epic_links' AND column_name = 'file_size') THEN
    ALTER TABLE public.epic_links ADD COLUMN file_size INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epic_links' AND column_name = 'mime_type') THEN
    ALTER TABLE public.epic_links ADD COLUMN mime_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epic_links' AND column_name = 'added_by_name') THEN
    ALTER TABLE public.epic_links ADD COLUMN added_by_name TEXT;
  END IF;
END $$;

-- Add kind column to objective_linked_items if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objective_linked_items' AND column_name = 'kind') THEN
    ALTER TABLE public.objective_linked_items ADD COLUMN kind TEXT DEFAULT 'external';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objective_linked_items' AND column_name = 'linked_item_id') THEN
    ALTER TABLE public.objective_linked_items ADD COLUMN linked_item_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objective_linked_items' AND column_name = 'linked_item_type') THEN
    ALTER TABLE public.objective_linked_items ADD COLUMN linked_item_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objective_linked_items' AND column_name = 'file_name') THEN
    ALTER TABLE public.objective_linked_items ADD COLUMN file_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objective_linked_items' AND column_name = 'file_path') THEN
    ALTER TABLE public.objective_linked_items ADD COLUMN file_path TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objective_linked_items' AND column_name = 'file_size') THEN
    ALTER TABLE public.objective_linked_items ADD COLUMN file_size INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objective_linked_items' AND column_name = 'mime_type') THEN
    ALTER TABLE public.objective_linked_items ADD COLUMN mime_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objective_linked_items' AND column_name = 'added_by_name') THEN
    ALTER TABLE public.objective_linked_items ADD COLUMN added_by_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objective_linked_items' AND column_name = 'link_type') THEN
    ALTER TABLE public.objective_linked_items ADD COLUMN link_type TEXT DEFAULT 'external';
  END IF;
END $$;

-- Enable RLS on theme_links
ALTER TABLE public.theme_links ENABLE ROW LEVEL SECURITY;

-- Create policies for theme_links (public read/write for authenticated users)
CREATE POLICY "Authenticated users can view theme links" 
ON public.theme_links 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create theme links" 
ON public.theme_links 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update theme links" 
ON public.theme_links 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete theme links" 
ON public.theme_links 
FOR DELETE 
TO authenticated
USING (true);