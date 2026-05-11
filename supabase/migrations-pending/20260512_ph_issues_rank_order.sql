-- ============================================================================
-- 2026-05-12 — Add rank_order to ph_issues (drag-to-rank Jira parity, task #10)
-- ============================================================================
-- PURPOSE: Backend support for Jira-parity row drag-to-rank on BacklogPage.
-- Adds a sortable rank column to ph_issues so the existing drag handle (visible
-- on row hover) can persist user-driven row reordering.
--
-- STATUS: PENDING VIKRAM APPROVAL.
-- INSTRUCTIONS: Paste the entire block below into the Lovable SQL editor
-- (Catalyst → Supabase project → SQL editor). Do NOT execute via Claude.
-- ============================================================================

-- Step 1 — Add rank_order column. NULL allowed initially so existing rows
-- don't fail the constraint; backfill in Step 2.
ALTER TABLE public.ph_issues
  ADD COLUMN IF NOT EXISTS rank_order INTEGER;

-- Step 2 — Backfill: assign incremental rank within each project_key,
-- ordered by created_at ASC (preserves the historical order users see today).
WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_key
      ORDER BY jira_created_at ASC, id ASC
    ) * 10 AS new_rank
  FROM public.ph_issues
)
UPDATE public.ph_issues p
SET rank_order = n.new_rank
FROM numbered n
WHERE p.id = n.id
  AND p.rank_order IS NULL;

-- Step 3 — Index for efficient sort by project_key + rank_order.
-- Compound index supports: WHERE project_key = ? ORDER BY rank_order.
CREATE INDEX IF NOT EXISTS ph_issues_project_rank_idx
  ON public.ph_issues (project_key, rank_order);

-- Step 4 — Verification queries (run manually after the migration lands).
-- Should return 0 rows (no NULL ranks left):
--   SELECT COUNT(*) FROM ph_issues WHERE rank_order IS NULL;
-- Should return monotonic rank values per project:
--   SELECT project_key, rank_order, issue_key
--     FROM ph_issues WHERE project_key = 'BAU' ORDER BY rank_order ASC LIMIT 20;

-- ============================================================================
-- POST-MIGRATION FRONTEND WIRING (already scaffolded — does not require
-- another SQL step):
-- 1. Rank to top  → UPDATE ph_issues SET rank_order = (MIN(rank_order) - 10) WHERE id = ?
-- 2. Rank to bottom → UPDATE ph_issues SET rank_order = (MAX(rank_order) + 10) WHERE id = ?
-- 3. Drag-drop reorder → UPDATE ph_issues SET rank_order = ((prev_rank + next_rank) / 2) WHERE id = ?
--    Re-rank entire project when gaps shrink below threshold (e.g. < 1).
-- ============================================================================
