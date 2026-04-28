-- ════════════════════════════════════════════════════════════════════════════
-- Business Request × Notion Features unification
-- ════════════════════════════════════════════════════════════════════════════
-- Plan: docs/plans/business-request-feature-unification.md
-- Decisions locked by Vikram on 2026-04-27 via design-critique elicitation.
-- ADS rule: every editor wired to these new columns is @atlaskit/* — no shadcn.
--
-- This migration is purely additive + a one-shot data-hygiene normalize:
--   1. Adds 7 columns to business_requests
--   2. Adds a unique index on import_ref for idempotent Notion upserts
--   3. Inserts 4 new initiative_types rows (feature, gap, integration, data_request)
--   4. Normalizes business_requests.process_step from the legacy 10-slug
--      set (PROCESS_STEP_CONFIG) to the canonical 13-slug set seeded in
--      catalyst_workflow_statuses for 'Business Request'.
--   5. Adds documentation comments on the new columns.
--
-- Idempotency: every section uses IF NOT EXISTS / ON CONFLICT DO NOTHING /
-- conditional UPDATEs, so re-running this is a no-op after the first apply.
-- Re-runnable safely on dev and prod.
--
-- Reversibility: columns are nullable, no FK enforcement on po_user_id beyond
-- auth.users (uses SET NULL on delete via FK definition below). The status
-- normalize is one-way; if you need to roll back, restore process_step values
-- from the audit log table business_request_audit_logs (field_changed='Process Step').
-- ════════════════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────────────
-- 1. New columns on business_requests
-- ──────────────────────────────────────────────────────────────────────────
-- arabic_title       — bilingual UX, paired with `title` (English) at top of modal
-- theme              — Notion's 18 strategic themes (Arabic-primary, free TEXT)
-- stakeholders       — JSONB array of ministry agency codes (30+ values, freeform)
-- targeted_feature   — boolean strategic flag (distinct from is_force_ranked
--                      which means manual rank-override)
-- po_user_id         — Product Owner; project_manager_user_id remains as DM
-- import_source      — 'notion' for Notion-imported rows; null for native
-- import_ref         — Notion page URL — conflict key for upsert idempotency

ALTER TABLE public.business_requests
  ADD COLUMN IF NOT EXISTS arabic_title     TEXT,
  ADD COLUMN IF NOT EXISTS theme            TEXT,
  ADD COLUMN IF NOT EXISTS stakeholders     JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS targeted_feature BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS po_user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS import_source    TEXT,
  ADD COLUMN IF NOT EXISTS import_ref       TEXT;


-- ──────────────────────────────────────────────────────────────────────────
-- 2. Unique partial index on import_ref (Notion upsert idempotency)
-- ──────────────────────────────────────────────────────────────────────────
-- Partial so non-imported rows (import_ref IS NULL) don't collide.
-- ON CONFLICT (import_ref) WHERE import_ref IS NOT NULL — this is the
-- conflict key the Notion upsert pipeline will use.

CREATE UNIQUE INDEX IF NOT EXISTS business_requests_import_ref_uniq
  ON public.business_requests (import_ref)
  WHERE import_ref IS NOT NULL;


-- ──────────────────────────────────────────────────────────────────────────
-- 3. Extend initiative_types with the 4 Notion type values
-- ──────────────────────────────────────────────────────────────────────────
-- Notion's `type` (Feature / Gap / Integration / Data Request) becomes
-- additional rows on the existing initiative_types FK. Sort order continues
-- from the existing 'business_request' (sort_order=6) seeded in
-- 20260308125127_*.sql. Conflict on `key` (text) — already unique.

INSERT INTO public.initiative_types (id, key, label, description, icon, color_token, color_hex, sort_order, is_active)
VALUES
  (gen_random_uuid(), 'feature',      'Feature',      'Product feature request — new capability or user-facing enhancement.',                '⭐', 'blue',   '#1D4ED8',  7, true),
  (gen_random_uuid(), 'gap',          'Gap',          'Identified gap in existing capability — must-have remediation.',                       '⚠️', 'orange', '#F97316',  8, true),
  (gen_random_uuid(), 'integration',  'Integration',  'Integration with another system or platform.',                                          '🔗', 'blue',   '#2563EB',  9, true),
  (gen_random_uuid(), 'data_request', 'Data Request', 'Data extract, report, or analytics request requiring engineering effort.',             '📊', 'teal',   '#0D9488', 10, true)
ON CONFLICT (key) DO NOTHING;


-- ──────────────────────────────────────────────────────────────────────────
-- 4. Status consolidation — process_step legacy 10-slug → canonical 13-slug
-- ──────────────────────────────────────────────────────────────────────────
-- Source of truth: catalyst_workflow_statuses for issue_type='Business Request'
-- (seeded by 20260426140000_business_request_workflow_seed.sql).
--
-- Mapping (Vikram: please verify in_review row count BEFORE running — if
-- in_review represents late-stage review rather than early-stage, change
-- the mapping line to s_implementation_review):
--
--   new_request          → new
--   new_demand           → new
--   in_review            → portfolio_review     (early-stage; flag if late-stage)
--   analyse              → analysis
--   approved             → demand_approved
--   ready_to_implement   → ready_for_development
--   implement            → under_implementation
--   closed               → done
--   rejected             → canceled
--   on_hold              → on_hold              (no change — slug already canonical)
--
-- WHERE clause is explicit so any unexpected legacy value (not in the 10
-- known slugs) is left untouched and surfaces in the verification query.

UPDATE public.business_requests SET process_step = 'new'                   WHERE process_step IN ('new_request', 'new_demand');
UPDATE public.business_requests SET process_step = 'portfolio_review'      WHERE process_step = 'in_review';
UPDATE public.business_requests SET process_step = 'analysis'              WHERE process_step = 'analyse';
UPDATE public.business_requests SET process_step = 'demand_approved'       WHERE process_step = 'approved';
UPDATE public.business_requests SET process_step = 'ready_for_development' WHERE process_step = 'ready_to_implement';
UPDATE public.business_requests SET process_step = 'under_implementation'  WHERE process_step = 'implement';
UPDATE public.business_requests SET process_step = 'done'                  WHERE process_step = 'closed';
UPDATE public.business_requests SET process_step = 'canceled'              WHERE process_step = 'rejected';


-- ──────────────────────────────────────────────────────────────────────────
-- 5. Documentation comments on new columns
-- ──────────────────────────────────────────────────────────────────────────
-- Surfaces in Supabase Studio column inspector and pg_dump output.

COMMENT ON COLUMN public.business_requests.arabic_title     IS 'RTL Arabic feature name. Paired with `title` (English) for bilingual MoIM UX.';
COMMENT ON COLUMN public.business_requests.theme            IS 'Strategic theme. Free TEXT until/unless promoted to FK on a business_request_themes table. Sourced from Notion 18 themes (digitization, market platform, ministry services, etc.).';
COMMENT ON COLUMN public.business_requests.stakeholders     IS 'JSONB array of ministry agency codes. 30+ canonical values managed via admin UI; freeform append allowed.';
COMMENT ON COLUMN public.business_requests.targeted_feature IS 'Strategic targeting flag from Notion. Distinct from is_force_ranked (which means manual rank override).';
COMMENT ON COLUMN public.business_requests.po_user_id       IS 'Product Owner. Catalyst project_manager_user_id continues to represent Delivery Manager (DM).';
COMMENT ON COLUMN public.business_requests.import_source    IS 'Provenance: ''notion'' for Notion-imported rows; NULL for native Catalyst.';
COMMENT ON COLUMN public.business_requests.import_ref       IS 'Source-system reference for idempotent upsert. For Notion: full page URL. Conflict key for the unique partial index.';


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICATION — run these AFTER the migration completes (do not run inline)
-- ════════════════════════════════════════════════════════════════════════════
--
--   -- 1. New columns present
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='business_requests'
--     AND column_name IN ('arabic_title','theme','stakeholders','targeted_feature','po_user_id','import_source','import_ref')
--   ORDER BY column_name;
--
--   -- 2. Unique index present
--   SELECT indexname, indexdef
--   FROM pg_indexes
--   WHERE schemaname='public' AND tablename='business_requests'
--     AND indexname='business_requests_import_ref_uniq';
--
--   -- 3. New initiative_types rows present
--   SELECT key, label, sort_order, is_active
--   FROM initiative_types
--   WHERE key IN ('feature','gap','integration','data_request')
--   ORDER BY sort_order;
--
--   -- 4. Status consolidation — verify only canonical 13 slugs remain
--   SELECT process_step, COUNT(*) AS row_count
--   FROM business_requests
--   WHERE deleted_at IS NULL
--   GROUP BY process_step
--   ORDER BY row_count DESC;
--   -- expect only: new, portfolio_review, technical_validation, estimate,
--   -- demand_approved, analysis, ready_for_development, under_implementation,
--   -- implementation_review, on_hold, in_support, done, canceled.
--   -- Anything else = orphan that needs manual mapping.
--
-- ════════════════════════════════════════════════════════════════════════════
