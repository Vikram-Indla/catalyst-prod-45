-- ────────────────────────────────────────────────────────────────────────
-- Block E partial (2026-05-01) — seed a default Project Board with the
-- 13-column lifecycle shape, mirrored from Product Kanban.
--
-- WHY: ph_boards is empty (0 rows) so PHBoardView at /project-hub/{KEY}/board
-- renders no columns. Seed one default board with the 13 lifecycle columns,
-- each mapping to project_issue status values (PHIssue.status enum) so that
-- when issues exist they bucket into the right column.
--
-- This is the visual-parity step. Full Block E (extracting LifecycleBoard
-- as a shared component, replacing PHBoardView with KanbanBoardShell, and
-- wiring the projectHubBoardAdapter) is a separate refactor — but with
-- this seed, Project Board now has the 13-column lifecycle shape rendering
-- against the existing PHBoardView component.
--
-- COLUMNS (13, in lifecycle order):
--   Intake phase   — NEW · DEMAND INTAKE · DEMAND VALIDATION
--   Approval phase — PENDING APPROVAL · ANALYSIS & DESIGN · PRIORITIZED BACKLOG
--   Build phase    — IMPLEMENTATION · REVIEW & QA · PENDING UAT/BETA
--   Release phase  — READY FOR PRODUCTION · DONE
--   Out phase      — ON HOLD · CANCELED
--
-- STATUS MAPPING: Each column's `statuses` array lists the PHIssue.status
-- values that route into it. Mapping uses both Catalyst-canonical project
-- issue statuses (in_dev, in_qa, in_uat, in_beta, prod_ready, production)
-- AND demand-flow statuses (since we want one shell on both hubs, columns
-- accept both vocabularies).
--
-- PASTE INTO: Supabase SQL Editor → Run.
-- ────────────────────────────────────────────────────────────────────────

insert into public.ph_boards (name, columns, is_default)
values (
  'Lifecycle Board',
  '[
    {
      "name": "NEW",
      "color": "#94A3B8",
      "statuses": ["todo", "open", "planned", "created", "new", "new_demand"],
      "wip_limit": 0
    },
    {
      "name": "DEMAND INTAKE",
      "color": "#94A3B8",
      "statuses": ["intake", "gathering", "demand_intake"],
      "wip_limit": 0
    },
    {
      "name": "DEMAND VALIDATION",
      "color": "#94A3B8",
      "statuses": ["validation", "review", "under_review", "demand_validation"],
      "wip_limit": 0
    },
    {
      "name": "PENDING APPROVAL",
      "color": "#F59E0B",
      "statuses": ["pending_approval", "awaiting_approval"],
      "wip_limit": 0
    },
    {
      "name": "ANALYSIS & DESIGN",
      "color": "#F59E0B",
      "statuses": ["analysis", "design", "ready_for_development"],
      "wip_limit": 0
    },
    {
      "name": "PRIORITIZED BACKLOG",
      "color": "#F59E0B",
      "statuses": ["backlog", "ready", "estimate", "demand_approved", "approved"],
      "wip_limit": 0
    },
    {
      "name": "IMPLEMENTATION",
      "color": "#3B82F6",
      "statuses": ["in_dev", "in_progress", "implementation", "under_implementation"],
      "wip_limit": 0
    },
    {
      "name": "REVIEW & QA",
      "color": "#3B82F6",
      "statuses": ["in_qa", "code_review", "implementation_review"],
      "wip_limit": 0
    },
    {
      "name": "PENDING UAT/BETA",
      "color": "#3B82F6",
      "statuses": ["in_uat", "in_beta", "staging"],
      "wip_limit": 0
    },
    {
      "name": "READY FOR PRODUCTION",
      "color": "#10B981",
      "statuses": ["prod_ready", "ready_for_release"],
      "wip_limit": 0
    },
    {
      "name": "DONE",
      "color": "#10B981",
      "statuses": ["production", "done", "closed", "delivered", "completed", "in_support"],
      "wip_limit": 0
    },
    {
      "name": "ON HOLD",
      "color": "#EAB308",
      "statuses": ["on_hold", "paused", "blocked"],
      "wip_limit": 0
    },
    {
      "name": "CANCELED",
      "color": "#94A3B8",
      "statuses": ["canceled", "cancelled"],
      "wip_limit": 0
    }
  ]'::jsonb,
  true
)
on conflict do nothing;

-- Verification: confirm the board is in place with 13 columns.
select
  id,
  name,
  is_default,
  jsonb_array_length(columns) as column_count,
  (select array_agg(value->>'name' order by ordinality)
     from jsonb_array_elements(columns) with ordinality) as column_names
from public.ph_boards
where is_default = true;
