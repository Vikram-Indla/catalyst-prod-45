-- ════════════════════════════════════════════════════════════════════════════
-- Business Request workflow seed
-- ════════════════════════════════════════════════════════════════════════════
-- Phase 1 of: docs/plans/business-request-workflow-and-kanban-parity.md
--
-- Seeds the canonical workflow scheme used by ProductHub /producthub/kanban
-- (table: ph_initiatives). The same workflow applies to every initiative_type
-- on that board: business_request, enhancement, project, entity_integration,
-- improvement.
--
-- This migration is purely additive:
--   - inserts 1 scheme row into catalyst_workflow_schemes
--   - inserts 13 status rows into catalyst_workflow_statuses
--   - inserts 21 transition rows into catalyst_workflow_transitions
--
-- It does NOT touch ph_initiatives, business_requests, demand_process_steps,
-- or any consumer code. Phase 3 will normalize ph_initiatives.status values
-- against these canonical slugs in a separate migration.
--
-- Idempotency: this migration is NOT idempotent. Running it twice will create
-- a second scheme. Production should run it once. Local re-runs require a
-- DELETE FROM catalyst_workflow_schemes WHERE issue_type = 'Business Request'
-- before re-applying (cascades to statuses and transitions).
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_scheme_id UUID;

  -- Status id captures (one per status, in display order)
  s_new                    UUID;
  s_portfolio_review       UUID;
  s_technical_validation   UUID;
  s_estimate               UUID;
  s_demand_approved        UUID;
  s_analysis               UUID;
  s_ready_for_development  UUID;
  s_under_implementation   UUID;
  s_implementation_review  UUID;
  s_on_hold                UUID;
  s_in_support             UUID;
  s_done                   UUID;
  s_canceled               UUID;
BEGIN
  -- ──────────────────────────────────────────────────────────────────────────
  -- 1. Scheme
  -- ──────────────────────────────────────────────────────────────────────────
  INSERT INTO public.catalyst_workflow_schemes (name, description, issue_type, is_active, is_default)
  VALUES (
    'Business Request Workflow',
    'Canonical 13-status workflow governing every initiative on /producthub/kanban (ph_initiatives). Applies universally across initiative types: business_request, enhancement, project, entity_integration, improvement.',
    'Business Request',
    true,
    true
  )
  RETURNING id INTO v_scheme_id;

  -- ──────────────────────────────────────────────────────────────────────────
  -- 2. Statuses (13)
  --
  -- Color reference (StatusLozenge guardrail, CLAUDE.md §5):
  --   GREY  bg=#DFE1E6  → category 'todo'
  --   BLUE  bg=#DEEBFF  → category 'in_progress'
  --   GREEN bg=#E3FCEF  → category 'done'
  -- ──────────────────────────────────────────────────────────────────────────

  INSERT INTO public.catalyst_workflow_statuses
    (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme_id, 'New', 'new', 'todo', '#DFE1E6', 1, true, false)
  RETURNING id INTO s_new;

  INSERT INTO public.catalyst_workflow_statuses
    (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme_id, 'Portfolio Review', 'portfolio_review', 'todo', '#DFE1E6', 2, false, false)
  RETURNING id INTO s_portfolio_review;

  INSERT INTO public.catalyst_workflow_statuses
    (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme_id, 'Technical Validation', 'technical_validation', 'todo', '#DFE1E6', 3, false, false)
  RETURNING id INTO s_technical_validation;

  INSERT INTO public.catalyst_workflow_statuses
    (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme_id, 'Estimate', 'estimate', 'todo', '#DFE1E6', 4, false, false)
  RETURNING id INTO s_estimate;

  INSERT INTO public.catalyst_workflow_statuses
    (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme_id, 'Demand Approved', 'demand_approved', 'todo', '#DFE1E6', 5, false, false)
  RETURNING id INTO s_demand_approved;

  INSERT INTO public.catalyst_workflow_statuses
    (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme_id, 'Analysis', 'analysis', 'in_progress', '#DEEBFF', 6, false, false)
  RETURNING id INTO s_analysis;

  INSERT INTO public.catalyst_workflow_statuses
    (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme_id, 'Ready for Development', 'ready_for_development', 'todo', '#DFE1E6', 7, false, false)
  RETURNING id INTO s_ready_for_development;

  INSERT INTO public.catalyst_workflow_statuses
    (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme_id, 'Under Implementation', 'under_implementation', 'in_progress', '#DEEBFF', 8, false, false)
  RETURNING id INTO s_under_implementation;

  INSERT INTO public.catalyst_workflow_statuses
    (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme_id, 'Implementation Review', 'implementation_review', 'in_progress', '#DEEBFF', 9, false, false)
  RETURNING id INTO s_implementation_review;

  INSERT INTO public.catalyst_workflow_statuses
    (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme_id, 'On Hold', 'on_hold', 'todo', '#DFE1E6', 10, false, false)
  RETURNING id INTO s_on_hold;

  INSERT INTO public.catalyst_workflow_statuses
    (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme_id, 'In Support', 'in_support', 'done', '#E3FCEF', 11, false, false)
  RETURNING id INTO s_in_support;

  INSERT INTO public.catalyst_workflow_statuses
    (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme_id, 'Done', 'done', 'done', '#E3FCEF', 12, false, true)
  RETURNING id INTO s_done;

  INSERT INTO public.catalyst_workflow_statuses
    (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme_id, 'Canceled', 'canceled', 'done', '#E3FCEF', 13, false, true)
  RETURNING id INTO s_canceled;

  -- ──────────────────────────────────────────────────────────────────────────
  -- 3. Transitions (21)
  --
  -- Authoring convention: sort_order is grouped by source status so the
  -- transition matrix renders in a sensible order in the admin editor.
  -- is_global=false everywhere — every transition has an explicit from/to.
  -- ──────────────────────────────────────────────────────────────────────────

  INSERT INTO public.catalyst_workflow_transitions
    (scheme_id, name, from_status_id, to_status_id, is_global, sort_order)
  VALUES
    -- From NEW
    (v_scheme_id, 'Submit for portfolio review', s_new, s_portfolio_review, false, 10),
    (v_scheme_id, 'Cancel new request',          s_new, s_canceled,         false, 11),

    -- From PORTFOLIO REVIEW
    (v_scheme_id, 'Move to technical validation', s_portfolio_review, s_technical_validation, false, 20),
    (v_scheme_id, 'Cancel during portfolio review', s_portfolio_review, s_canceled,           false, 21),
    (v_scheme_id, 'Hold during portfolio review',   s_portfolio_review, s_on_hold,            false, 22),

    -- From TECHNICAL VALIDATION
    (v_scheme_id, 'Send for estimation',          s_technical_validation, s_estimate,         false, 30),
    (v_scheme_id, 'Hold during technical review', s_technical_validation, s_on_hold,          false, 31),
    (v_scheme_id, 'Cancel during technical review', s_technical_validation, s_canceled,       false, 32),
    (v_scheme_id, 'Return to portfolio review',   s_technical_validation, s_portfolio_review, false, 33),

    -- From ESTIMATE
    (v_scheme_id, 'Approve demand', s_estimate, s_demand_approved, false, 40),

    -- From DEMAND APPROVED
    (v_scheme_id, 'Begin analysis',          s_demand_approved, s_analysis,              false, 50),
    (v_scheme_id, 'Skip to ready for development', s_demand_approved, s_ready_for_development, false, 51),

    -- From ANALYSIS
    (v_scheme_id, 'Mark ready for development', s_analysis, s_ready_for_development, false, 60),

    -- From READY FOR DEVELOPMENT
    (v_scheme_id, 'Start implementation', s_ready_for_development, s_under_implementation, false, 70),

    -- From UNDER IMPLEMENTATION
    (v_scheme_id, 'Submit for implementation review', s_under_implementation, s_implementation_review, false, 80),
    (v_scheme_id, 'Hold implementation',              s_under_implementation, s_on_hold,               false, 81),

    -- From ON HOLD
    (v_scheme_id, 'Resume from hold', s_on_hold, s_technical_validation, false, 90),
    (v_scheme_id, 'Cancel from hold', s_on_hold, s_canceled,             false, 91),

    -- From IMPLEMENTATION REVIEW
    (v_scheme_id, 'Move to support', s_implementation_review, s_in_support, false, 100),
    (v_scheme_id, 'Cancel during implementation review', s_implementation_review, s_canceled, false, 101),

    -- From IN SUPPORT
    (v_scheme_id, 'Mark done', s_in_support, s_done, false, 110);

END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Verification queries (run manually after deploy)
-- ════════════════════════════════════════════════════════════════════════════
--
--   SELECT count(*) FROM catalyst_workflow_schemes
--    WHERE issue_type = 'Business Request';                    -- expect 1
--
--   SELECT count(*) FROM catalyst_workflow_statuses
--    WHERE scheme_id = (SELECT id FROM catalyst_workflow_schemes
--                        WHERE issue_type = 'Business Request');  -- expect 13
--
--   SELECT count(*) FROM catalyst_workflow_transitions
--    WHERE scheme_id = (SELECT id FROM catalyst_workflow_schemes
--                        WHERE issue_type = 'Business Request');  -- expect 21
--
--   -- Spot-check ordering:
--   SELECT position, name, category FROM catalyst_workflow_statuses
--    WHERE scheme_id = (SELECT id FROM catalyst_workflow_schemes
--                        WHERE issue_type = 'Business Request')
--    ORDER BY position;
-- ════════════════════════════════════════════════════════════════════════════
