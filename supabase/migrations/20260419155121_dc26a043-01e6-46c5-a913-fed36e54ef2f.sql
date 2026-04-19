BEGIN;

-- Pre-flight guard: abort if anyone has written rows since discovery.
DO $$
DECLARE
  row_count bigint;
BEGIN
  SELECT COUNT(*) INTO row_count FROM public.ph_attachments;
  IF row_count > 0 THEN
    RAISE EXCEPTION
      'ABORT: ph_attachments now has % rows. G2.5 assumed 0. Re-run discovery before migrating.',
      row_count;
  END IF;
END $$;

-- Drop the old (wrong) FK.
ALTER TABLE public.ph_attachments
  DROP CONSTRAINT IF EXISTS ph_attachments_work_item_id_fkey;

-- Add the correct FK pointing at ph_issues.
ALTER TABLE public.ph_attachments
  ADD CONSTRAINT ph_attachments_work_item_id_fkey
  FOREIGN KEY (work_item_id)
  REFERENCES public.ph_issues(id)
  ON DELETE CASCADE;

-- Helpful index for the common lookup (one attachment list per issue).
CREATE INDEX IF NOT EXISTS ph_attachments_work_item_id_idx
  ON public.ph_attachments (work_item_id);

COMMIT;