-- ════════════════════════════════════════════════════════════════════════════
-- Business Requests — re-add start_date column for Timeline
-- 2026-06-17
--
-- `start_date` was dropped on 2026-06-01 as a legacy column (no consumers in
-- the v3 BR surfaces at the time). The Timeline view (`/product-hub/:key/timeline`)
-- needs both start and end dates so BRs can render as a bar from start → end
-- when the user sets both via the EditDatesModal. Without this column the
-- timeline can only render a diamond (end-only) marker.
--
-- Idempotent — `ADD COLUMN IF NOT EXISTS` so the migration is a no-op on
-- environments where the column was never dropped or has already been
-- re-added.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.business_requests
  ADD COLUMN IF NOT EXISTS start_date date;

-- Re-create the composite (start_date, end_date) index that existed before
-- the drop migration. Used by date-range queries on BRs.
CREATE INDEX IF NOT EXISTS idx_business_requests_dates
  ON public.business_requests(start_date, end_date);
