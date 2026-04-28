-- jira-compare audit (2026-04-28) — Round 4 schema follow-up.
-- Adds two custom-field columns to ph_issues so Catalyst's Defect view stops
-- parsing them out of raw_json on every render.
--
-- Evidence pointers:
--   * Lane B getJiraIssueTypeMetaWithFields(BAU, 10012) returned `Severity`
--     (customfield_10125) and `Assessment Feature` (customfield_10288) as
--     project-level custom fields exposed on the QA Bug create-meta.
--   * src/components/catalyst-detail-views/defect/CatalystViewDefect.tsx
--     line 84-90 reads severity via:
--       (issue as any)?.severity
--         ?? (issue as any)?.raw_json?.fields?.customfield_10125?.value
--         ?? null
--     i.e. column read first, raw_json fallback if column is missing. Same
--     pattern is intended for assessment_feature.
--   * src/components/catalyst-detail-views/defect/CatalystDefectFields.tsx
--     header doc-comment: "ph_issues schema lacks severity / assessment_feature
--     columns; wh-jira-sync is parked. Reading raw_json is the lowest-friction
--     parity fix" — i.e. the schema columns are the proper home, raw_json was
--     a stopgap.
--   * Lane B Severity allowedValues: Blocker, High, Medium, Low.
--     Lane B Assessment Feature allowedValues: 30+ options
--     (RCJY, MODON, NCEC, SIDF, Industrial License Issuance, ...).
--
-- Strategy:
--   * ADD COLUMN IF NOT EXISTS — idempotent, safe to re-run.
--   * Both columns TEXT NULL — match existing free-text-leaning schema
--     (severity is an enum on Jira but Catalyst's existing columns like
--     priority and status are plain TEXT; we follow that convention rather
--     than introducing a new ENUM type).
--   * Backfill from raw_json where the column is null and the JSON path
--     resolves. Idempotent — only writes when target is null.
--   * COMMENT ON COLUMN with the customfield_* id for future audits.

BEGIN;

-- ============================================================================
-- 1. Add the columns
-- ============================================================================

ALTER TABLE public.ph_issues
  ADD COLUMN IF NOT EXISTS severity TEXT,
  ADD COLUMN IF NOT EXISTS assessment_feature TEXT;

COMMENT ON COLUMN public.ph_issues.severity IS
  'Jira QA Bug custom field "Severity" (customfield_10125). '
  'Allowed values: Blocker, High, Medium, Low. NULL = unset. '
  'Source: Lane B getJiraIssueTypeMetaWithFields(BAU, 10012), 2026-04-28.';

COMMENT ON COLUMN public.ph_issues.assessment_feature IS
  'Jira QA Bug / Incident / Task custom field "Assessment Feature" '
  '(customfield_10288). 30+ allowed values (RCJY, MODON, NCEC, SIDF, '
  'Industrial License Issuance, Upgrade to Establish, etc.). NULL = unset. '
  'Source: Lane B getJiraIssueTypeMetaWithFields(BAU, 10012), 2026-04-28.';

-- ============================================================================
-- 2. Backfill from raw_json (idempotent — only fills where the column is null)
-- ============================================================================

UPDATE public.ph_issues
SET severity = raw_json->'fields'->'customfield_10125'->>'value'
WHERE severity IS NULL
  AND raw_json IS NOT NULL
  AND raw_json->'fields'->'customfield_10125'->>'value' IS NOT NULL;

UPDATE public.ph_issues
SET assessment_feature = raw_json->'fields'->'customfield_10288'->>'value'
WHERE assessment_feature IS NULL
  AND raw_json IS NOT NULL
  AND raw_json->'fields'->'customfield_10288'->>'value' IS NOT NULL;

COMMIT;
