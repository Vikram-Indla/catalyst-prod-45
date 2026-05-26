-- P0-35: Add subscriber_ids to ph_saved_filters for filter change notifications.
ALTER TABLE public.ph_saved_filters
  ADD COLUMN IF NOT EXISTS subscriber_ids text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS ph_saved_filters_subscriber_ids_gin_idx
  ON public.ph_saved_filters USING gin(subscriber_ids);
