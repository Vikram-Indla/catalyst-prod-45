-- Make space_id nullable in kb_documents so documents can exist without a space
ALTER TABLE public.kb_documents ALTER COLUMN space_id DROP NOT NULL;