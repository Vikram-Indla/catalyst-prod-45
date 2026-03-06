-- Admin cleanup for Req Assist seed records
-- (needed because table RLS prevents non-owner deletes via standard data tool)
DELETE FROM public.ra_documents;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.sequences
    WHERE sequence_schema = 'public' AND sequence_name = 'ra_documents_id_seq'
  ) THEN
    EXECUTE 'ALTER SEQUENCE public.ra_documents_id_seq RESTART WITH 1';
  END IF;
END $$;