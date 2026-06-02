-- ════════════════════════════════════════════════════════════════════════════
-- Replace Business Request workflow with the canonical 10-status spec
-- (image-1 from the product module rebuild session 2026-06-01)
--
-- Demand  (blue/inprogress):  01 New, 02 Demand Approved, 03 Analysis
-- Approval (orange/moved):    04 Ready for Development, 05 Under Implementation
-- Delivery (purple/new):      06 Implementation Review, 07 Pending Testing
-- Closure (green/default/removed): 08 Done, 09 On Hold, 10 Canceled
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_scheme_id UUID;
  s_new                    UUID := gen_random_uuid();
  s_demand_approved        UUID := gen_random_uuid();
  s_analysis               UUID := gen_random_uuid();
  s_ready_for_development  UUID := gen_random_uuid();
  s_under_implementation   UUID := gen_random_uuid();
  s_implementation_review  UUID := gen_random_uuid();
  s_pending_testing        UUID := gen_random_uuid();
  s_done                   UUID := gen_random_uuid();
  s_on_hold                UUID := gen_random_uuid();
  s_canceled               UUID := gen_random_uuid();
BEGIN
  -- 1. Remove ALL existing Business Request workflow schemes (cascade deletes statuses + transitions)
  DELETE FROM public.catalyst_workflow_schemes
  WHERE issue_type IN ('Business Request', 'business-request', 'business_request');

  -- 2. Insert canonical 10-status scheme
  INSERT INTO public.catalyst_workflow_schemes (name, description, issue_type, is_active, is_default)
  VALUES (
    'Business Request Workflow',
    '10-status canonical workflow for Business Requests in the Product Hub (MDT project). Phase categories: Demand (blue), Approval (orange), Delivery (purple), Closure (green).',
    'Business Request',
    true,
    true
  )
  RETURNING id INTO v_scheme_id;

  -- 3. Statuses (10)
  INSERT INTO public.catalyst_workflow_statuses
    (id, scheme_id, name, slug, category, color, position, is_initial, is_final, is_active)
  VALUES
    -- Demand phase (blue)
    (s_new,                   v_scheme_id, 'New',                   'new',                   'todo',        '#DEEBFF', 1,  true,  false, true),
    (s_demand_approved,       v_scheme_id, 'Demand Approved',       'demand_approved',       'in_progress', '#DEEBFF', 2,  false, false, true),
    (s_analysis,              v_scheme_id, 'Analysis',              'analysis',              'in_progress', '#DEEBFF', 3,  false, false, true),
    -- Approval phase (orange)
    (s_ready_for_development, v_scheme_id, 'Ready for Development', 'ready_for_development', 'in_progress', '#FFE9C8', 4,  false, false, true),
    (s_under_implementation,  v_scheme_id, 'Under Implementation',  'under_implementation',  'in_progress', '#FFE9C8', 5,  false, false, true),
    -- Delivery phase (purple)
    (s_implementation_review, v_scheme_id, 'Implementation Review', 'implementation_review', 'in_progress', '#EAE0FF', 6,  false, false, true),
    (s_pending_testing,       v_scheme_id, 'Pending Testing',       'pending_testing',       'in_progress', '#EAE0FF', 7,  false, false, true),
    -- Closure (green/grey/red)
    (s_done,                  v_scheme_id, 'Done',                  'done',                  'done',        '#E3FCEF', 8,  false, true,  true),
    (s_on_hold,               v_scheme_id, 'On Hold',               'on_hold',               'todo',        '#F4F5F7', 9,  false, false, true),
    (s_canceled,              v_scheme_id, 'Canceled',              'canceled',              'done',        '#FFEBE6', 10, false, true,  true);

  -- 4. Transitions (forward + back-transitions + any-to-hold/done/canceled)
  INSERT INTO public.catalyst_workflow_transitions
    (scheme_id, name, from_status_id, to_status_id, is_global, sort_order)
  VALUES
    -- Forward path
    (v_scheme_id, 'Approve demand',           s_new,                   s_demand_approved,       false, 1),
    (v_scheme_id, 'Begin analysis',           s_demand_approved,       s_analysis,              false, 2),
    (v_scheme_id, 'Ready for dev',            s_analysis,              s_ready_for_development, false, 3),
    (v_scheme_id, 'Start implementation',     s_ready_for_development, s_under_implementation,  false, 4),
    (v_scheme_id, 'Submit for review',        s_under_implementation,  s_implementation_review, false, 5),
    (v_scheme_id, 'Send to testing',          s_implementation_review, s_pending_testing,       false, 6),
    (v_scheme_id, 'Mark done',                s_pending_testing,       s_done,                  false, 7),
    -- Back-transitions
    (v_scheme_id, 'Return to new',            s_demand_approved,       s_new,                   false, 10),
    (v_scheme_id, 'Return to demand approved',s_analysis,              s_demand_approved,        false, 11),
    (v_scheme_id, 'Return to analysis',       s_ready_for_development, s_analysis,              false, 12),
    (v_scheme_id, 'Return to ready',          s_under_implementation,  s_ready_for_development, false, 13),
    (v_scheme_id, 'Return to implementation', s_implementation_review, s_under_implementation,  false, 14),
    (v_scheme_id, 'Return to review',         s_pending_testing,       s_implementation_review, false, 15),
    -- Any status → On Hold
    (v_scheme_id, 'Put on hold',              s_new,                   s_on_hold,               false, 20),
    (v_scheme_id, 'Put on hold',              s_demand_approved,       s_on_hold,               false, 21),
    (v_scheme_id, 'Put on hold',              s_analysis,              s_on_hold,               false, 22),
    (v_scheme_id, 'Put on hold',              s_ready_for_development, s_on_hold,               false, 23),
    (v_scheme_id, 'Put on hold',              s_under_implementation,  s_on_hold,               false, 24),
    (v_scheme_id, 'Put on hold',              s_implementation_review, s_on_hold,               false, 25),
    (v_scheme_id, 'Put on hold',              s_pending_testing,       s_on_hold,               false, 26),
    -- Resume from On Hold → back to Analysis (nearest active state)
    (v_scheme_id, 'Resume from hold',         s_on_hold,               s_analysis,              false, 30),
    -- Any status → Canceled
    (v_scheme_id, 'Cancel',                   s_new,                   s_canceled,              false, 40),
    (v_scheme_id, 'Cancel',                   s_demand_approved,       s_canceled,              false, 41),
    (v_scheme_id, 'Cancel',                   s_analysis,              s_canceled,              false, 42),
    (v_scheme_id, 'Cancel',                   s_ready_for_development, s_canceled,              false, 43),
    (v_scheme_id, 'Cancel',                   s_under_implementation,  s_canceled,              false, 44),
    (v_scheme_id, 'Cancel',                   s_implementation_review, s_canceled,              false, 45),
    (v_scheme_id, 'Cancel',                   s_pending_testing,       s_canceled,              false, 46),
    (v_scheme_id, 'Cancel',                   s_on_hold,               s_canceled,              false, 47);

END $$;

-- Verification
-- SELECT name, slug, category, position FROM catalyst_workflow_statuses
--   WHERE scheme_id = (SELECT id FROM catalyst_workflow_schemes WHERE issue_type = 'Business Request')
--   ORDER BY position;  -- expect 10 rows
