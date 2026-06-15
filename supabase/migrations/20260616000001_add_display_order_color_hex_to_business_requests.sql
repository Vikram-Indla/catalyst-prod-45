-- =====================================================
-- Add display_order + color_hex to business_requests
-- =====================================================
-- display_order: integer, sparse (multiples of 1024) so we can insert between
-- two rows without renumbering. Used by the product hub timeline three-dots
-- "Move work item" submenu (Move to first / up / down / last) to reorder
-- top-level BR rows within a product.
--
-- color_hex: hex string (#RRGGBB) chosen by the user from the canonical
-- JIRA_EPIC_COLORS palette via the timeline three-dots "Change work item
-- color" submenu. Parent BRs only.
--
-- Existing RLS policies on business_requests already cover the new columns
-- (Postgres applies row-level policies regardless of which columns are read
-- or written). No new policies needed.

ALTER TABLE public.business_requests
  ADD COLUMN IF NOT EXISTS display_order integer,
  ADD COLUMN IF NOT EXISTS color_hex text;

-- Backfill existing rows with sparse ranks ordered by created_at ASC so the
-- initial order matches what users currently see (oldest first within product).
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY created_at ASC NULLS LAST) * 1024 AS r
  FROM public.business_requests
  WHERE display_order IS NULL
)
UPDATE public.business_requests br
   SET display_order = ranked.r
  FROM ranked
 WHERE br.id = ranked.id;

-- Lightweight index for the "ORDER BY display_order" path the timeline query
-- runs every page load.
CREATE INDEX IF NOT EXISTS business_requests_product_display_order_idx
  ON public.business_requests (product_id, display_order);

COMMENT ON COLUMN public.business_requests.display_order IS
  'Sparse rank (multiples of 1024) for user-controlled ordering on the product hub timeline. NULL means unranked (sort to end).';
COMMENT ON COLUMN public.business_requests.color_hex IS
  'User-selected color from the Jira-style epic colour palette for the timeline bar / diamond. NULL means default neutral.';
