-- ════════════════════════════════════════════════════════════════════════════
-- Business Request — Feature Unification (Notion Features migration)
-- 2026-04-28 | Owner: Vikram (Delivery Manager)
--
-- Adds the 9 Notion Features columns to business_requests that were designed
-- in types/business-request.ts but never applied to the live schema.
--
-- Fields:
--   arabic_title      → Feature name in Arabic (RTL input)
--   theme             → Strategic theme (18 options from THEME_OPTIONS)
--   category          → Classification bucket (4 options)
--   request_type      → Feature / Gap / Integration / Data Request
--   stakeholders      → JSONB array of ministry/agency value strings
--   targeted_feature  → Boolean flag for targeted features
--   scope_url         → Link to scope doc / Figma / Jira backlog
--   po_user_id        → Product Owner UUID (FK → auth.users)
--   import_source     → 'notion' for imports, 'manual' for native
--   import_ref        → Notion page URL (conflict key for upsert idempotency)
--
-- Idempotent: all ADD COLUMN IF NOT EXISTS — safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE business_requests
  ADD COLUMN IF NOT EXISTS arabic_title     TEXT,
  ADD COLUMN IF NOT EXISTS theme            TEXT,
  ADD COLUMN IF NOT EXISTS category         TEXT,
  ADD COLUMN IF NOT EXISTS request_type     TEXT,
  ADD COLUMN IF NOT EXISTS stakeholders     JSONB    NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS targeted_feature BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scope_url        TEXT,
  ADD COLUMN IF NOT EXISTS po_user_id       UUID     REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS import_source    TEXT     DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS import_ref       TEXT;

-- Index on import_ref for upsert idempotency during Notion imports
CREATE INDEX IF NOT EXISTS idx_br_import_ref
  ON business_requests (import_ref)
  WHERE import_ref IS NOT NULL;

-- Index on theme for filtering/grouping
CREATE INDEX IF NOT EXISTS idx_br_theme
  ON business_requests (theme)
  WHERE theme IS NOT NULL;

-- Index on po_user_id for person-based queries
CREATE INDEX IF NOT EXISTS idx_br_po_user_id
  ON business_requests (po_user_id)
  WHERE po_user_id IS NOT NULL;

COMMENT ON COLUMN business_requests.arabic_title     IS 'Feature name in Arabic — RTL, official name as it appears in the ministry system';
COMMENT ON COLUMN business_requests.theme             IS 'Strategic theme — one of 18 values from THEME_OPTIONS in types/business-request.ts';
COMMENT ON COLUMN business_requests.category          IS 'Classification: Industrial / Ministry Website / Internal Services / Innovation Platform';
COMMENT ON COLUMN business_requests.request_type      IS 'Request type: feature / gap / integration / data_request';
COMMENT ON COLUMN business_requests.stakeholders      IS 'JSONB array of ministry agency value strings (from STAKEHOLDER_OPTIONS)';
COMMENT ON COLUMN business_requests.targeted_feature  IS 'Flag: this is a targeted / priority feature for the current cycle';
COMMENT ON COLUMN business_requests.scope_url         IS 'URL to scope doc, Figma, or Jira backlog view';
COMMENT ON COLUMN business_requests.po_user_id        IS 'Product Owner — FK to auth.users. DM remains on project_manager_user_id.';
COMMENT ON COLUMN business_requests.import_source     IS '"notion" for records imported from Notion Features DB, "manual" for native creation';
COMMENT ON COLUMN business_requests.import_ref        IS 'Notion page URL — used as conflict key in upsert operations to ensure idempotency';
