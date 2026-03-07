ALTER TABLE public.ra_documents ADD COLUMN IF NOT EXISTS kb_synced boolean DEFAULT false;
ALTER TABLE public.ra_documents ADD COLUMN IF NOT EXISTS kb_synced_at timestamptz DEFAULT NULL;