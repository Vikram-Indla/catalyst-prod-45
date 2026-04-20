-- ────────────────────────────────────────────────────────────────────────
-- Add `summary_display` column to `ph_issues`
--
-- Purpose: Catalyst-local, UI-facing projection of Jira's raw `summary`
-- field, used when Jira tickets arrive in SHOUTING ALL-CAPS or all-lower.
-- Populated by the `jira-title-case-pass` Edge Function. The column is
-- NULL by default — consumers read `COALESCE(summary_display, summary)`
-- so any issue without a normalized version renders the raw Jira title
-- exactly as before.
--
-- Why a separate column (not a rewrite of `summary`):
--   * `summary` is the verbatim Jira value. Every `wh-jira-sync` run
--     overwrites it. If we normalized in place, the next sync would
--     undo the work.
--   * A separate column lets `summary_display` survive subsequent syncs
--     and keeps the upstream-of-truth (raw Jira title) queryable.
--   * Reversible: NULLing the column restores the raw experience. No
--     data loss scenario.
--
-- Forward-compatibility:
--   * Downstream trigger `sync_jira_bug_to_defect` currently copies
--     `summary` → `tm_defects.title`. It is NOT changed here. If the
--     Defect display should use the normalized title, update that
--     trigger in a follow-up migration.
--   * UI migration (reading `COALESCE(summary_display, summary)`) is
--     out of scope for this migration — tracked separately.
-- ────────────────────────────────────────────────────────────────────────

ALTER TABLE public.ph_issues
  ADD COLUMN IF NOT EXISTS summary_display TEXT;

COMMENT ON COLUMN public.ph_issues.summary_display IS
  'Catalyst-normalized, UI-facing version of `summary`. NULL means "no normalization applied — use `summary` as-is". Populated by jira-title-case-pass Edge Function. Never written by wh-jira-sync.';
