-- CAT-STRATA-IMPL-20260712-001 · A3b-1 · stable logical KPI lineage (F-9)
-- Plan Lock: features/CAT-STRATA-IMPL-20260712-001/03_PLAN_LOCK_BACKEND_PROGRAM.md; F-9 ruling.
-- F-9 (Vikram, 2026-07-16): a KPI revision must separate (1) stable logical KPI IDENTITY from
-- (2) the version-specific governed DEFINITION. Introduce a stable identifier shared by all
-- versions of the same KPI. Backfill one lineage per existing chain, add uniqueness on
-- (lineage_id, version), prevent two simultaneously effective approved versions per lineage with
-- overlapping effective periods, and PRESERVE EVERY EXISTING KPI ROW ID.
--
-- WHY THIS EXISTS: A3a (models) was safe because a scorecard model's children are all definition.
-- A KPI is different — it has definition children (formula versions), relationship children
-- (element_kpis, initiative_kpis, model_measures) and measurement facts (actuals, targets, key
-- results, scorecard lines). A revision creates a NEW ROW with a NEW id, so without a stable
-- identity every relationship and fact would still point at v1; once v1 is superseded (E-7:
-- superseded => historical only), v2 would have no links and no actuals and every objective would
-- SILENTLY LOSE ITS MEASURE. lineage_id is the stable identity that makes revision survivable.
--
-- PROBE (2026-07-16, staging) — this is what makes the backfill trivial and safe:
--   17 KPIs · supersedes_id used ZERO times · every version = 1 · 10 approved (1 with
--   effective_from NULL) · 6 draft · 1 pending_approval.
--   So there are NO existing chains: the backfill assigns one fresh lineage per KPI. The recursive
--   chain walk below is written anyway because the ruling requires chain-awareness and because it
--   degenerates EXACTLY to one-per-KPI when no chain exists — correct today, correct later.
--
-- ROW IDS ARE UNTOUCHED. This migration only ADDS a column. No id is rewritten, no row is
-- recreated, no FK is repointed. Every existing reference keeps resolving to the row it always did.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── 1. the stable identity ───────────────────────────────────────────────────
ALTER TABLE public.strata_kpis ADD COLUMN IF NOT EXISTS lineage_id uuid;

-- ── 2. backfill: one lineage per CHAIN, not per row ──────────────────────────
-- Roots = rows that supersede nothing. Every row reachable from a root by following supersedes_id
-- inherits the root's lineage, so an existing v1<-v2<-v3 chain lands on ONE lineage.
WITH RECURSIVE chain AS (
  SELECT id, id AS root
    FROM public.strata_kpis
   WHERE supersedes_id IS NULL
  UNION ALL
  SELECT k.id, c.root
    FROM public.strata_kpis k
    JOIN chain c ON k.supersedes_id = c.id
),
lineages AS (
  SELECT root, gen_random_uuid() AS lineage_id
    FROM (SELECT DISTINCT root FROM chain) d
)
UPDATE public.strata_kpis k
   SET lineage_id = l.lineage_id
  FROM chain c
  JOIN lineages l ON l.root = c.root
 WHERE k.id = c.id
   AND k.lineage_id IS NULL;

-- Safety net for any row unreachable from a root (would mean a supersedes_id cycle or a dangling
-- reference — neither exists today, but a silently NULL lineage would be far worse than a spare
-- lineage). Never leave the identity column unpopulated.
UPDATE public.strata_kpis SET lineage_id = gen_random_uuid() WHERE lineage_id IS NULL;

ALTER TABLE public.strata_kpis ALTER COLUMN lineage_id SET NOT NULL;
-- New KPIs (not revisions) start their own lineage. A revision instead COPIES the source's
-- lineage_id explicitly — see strata_create_kpi_draft_version (A3b).
ALTER TABLE public.strata_kpis ALTER COLUMN lineage_id SET DEFAULT gen_random_uuid();

-- ── 3. one version number per lineage ────────────────────────────────────────
ALTER TABLE public.strata_kpis DROP CONSTRAINT IF EXISTS strata_kpis_lineage_version_unique;
ALTER TABLE public.strata_kpis
  ADD CONSTRAINT strata_kpis_lineage_version_unique UNIQUE (lineage_id, version);

CREATE INDEX IF NOT EXISTS strata_kpis_lineage_idx ON public.strata_kpis (lineage_id);
-- The resolver's hot path: "the approved version of lineage L effective on date D".
CREATE INDEX IF NOT EXISTS strata_kpis_lineage_effective_idx
  ON public.strata_kpis (lineage_id, effective_from, effective_to)
  WHERE status = 'approved';

-- ── 4. never two simultaneously effective approved versions of one lineage ───
-- Declarative rather than a trigger: a BEFORE-trigger check has a race window where two concurrent
-- approvals both see no conflict and both commit. An EXCLUDE constraint cannot be raced.
-- Only 'approved' rows participate — drafts, pending, superseded and retired rows may overlap
-- freely, which is the whole point of drafting a successor while the predecessor is still live.
-- NULL effective_from/effective_to become unbounded ends, which is the honest reading: an approved
-- KPI with no effective_from IS effective for all time before its effective_to (staging has exactly
-- one such row today).
ALTER TABLE public.strata_kpis DROP CONSTRAINT IF EXISTS strata_kpis_no_overlapping_effective;
ALTER TABLE public.strata_kpis
  ADD CONSTRAINT strata_kpis_no_overlapping_effective
  EXCLUDE USING gist (
    lineage_id WITH =,
    tstzrange(effective_from, effective_to, '[)') WITH &&
  ) WHERE (status = 'approved');

COMMENT ON COLUMN public.strata_kpis.lineage_id IS
  'Stable logical KPI identity (F-9). Shared by EVERY version of the same KPI; never changes across a revision. `id` identifies a VERSION (a governed definition); `lineage_id` identifies the KPI as a continuing business concept. Relationships express continuing intent and resolve through the lineage to the version effective for the relevant date; historical FACTS (actuals, targets, key results, scorecard lines, calculations, snapshots) keep the exact version id they used and are NEVER repointed.';
