-- ════════════════════════════════════════════════════════════════════════════
-- Replace demand_process_steps with the canonical 10-status BR workflow
-- (2026-06-01, product module rebuild)
--
-- demand_process_steps is used by ProductBacklogPage via the backlogDataSource
-- adapter (process_step field on business_requests). This migration aligns
-- the backlog status display with the admin/workflows Business Request workflow.
--
-- Existing business_requests.process_step values are mapped to the nearest
-- new slug via an UPDATE after the upsert so no data is lost.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Remove old steps and insert the 10 canonical ones
DELETE FROM public.demand_process_steps;

INSERT INTO public.demand_process_steps (value, label, sort_order, is_active, color)
VALUES
  ('new',                   'New',                   1,  true, '#579DFF'),
  ('demand_approved',       'Demand Approved',       2,  true, '#579DFF'),
  ('analysis',              'Analysis',              3,  true, '#579DFF'),
  ('ready_for_development', 'Ready for Development', 4,  true, '#F38B00'),
  ('under_implementation',  'Under Implementation',  5,  true, '#F38B00'),
  ('implementation_review', 'Implementation Review', 6,  true, '#9F8FEF'),
  ('pending_testing',       'Pending Testing',       7,  true, '#9F8FEF'),
  ('done',                  'Done',                  8,  true, '#22A06B'),
  ('on_hold',               'On Hold',               9,  true, '#8590A2'),
  ('canceled',              'Canceled',              10, true, '#E34935');

-- 2. Migrate existing business_requests.process_step values to nearest new slug
-- Old slug → new slug mapping (nearest match)
UPDATE public.business_requests SET process_step = 'new'                   WHERE process_step IN ('funnel', 'new_request', 'new request', 'portfolio_review', 'technical_validation', 'estimate');
UPDATE public.business_requests SET process_step = 'demand_approved'       WHERE process_step IN ('demand_intake', 'intake');
UPDATE public.business_requests SET process_step = 'analysis'              WHERE process_step IN ('analysis_design', 'analysis & design', 'analysis design', 'product_validation', 'product validation');
UPDATE public.business_requests SET process_step = 'ready_for_development' WHERE process_step IN ('pending_approval', 'pending approval', 'ready_implementation', 'ready for implementation', 'ready_for_implementation');
UPDATE public.business_requests SET process_step = 'under_implementation'  WHERE process_step IN ('implementation', 'in_progress', 'in progress', 'ready_for_development', 'ready for development');
UPDATE public.business_requests SET process_step = 'implementation_review' WHERE process_step IN ('review_qa', 'review & qa', 'review_and_qa', 'implementation_review');
UPDATE public.business_requests SET process_step = 'pending_testing'       WHERE process_step IN ('uat', 'user acceptance testing', 'ready_production', 'ready for production', 'ready_for_production');
UPDATE public.business_requests SET process_step = 'done'                  WHERE process_step IN ('done', 'complete', 'completed', 'in_support', 'in support', 'in production', 'in_production', 'deployed');
UPDATE public.business_requests SET process_step = 'on_hold'               WHERE process_step IN ('on_hold', 'hold', 'paused', 'deferred');
UPDATE public.business_requests SET process_step = 'canceled'              WHERE process_step IN ('canceled', 'cancelled', 'rejected', 'closed');

-- 3. Any remaining unmapped values → 'new' (safe fallback)
UPDATE public.business_requests
SET process_step = 'new'
WHERE process_step IS NOT NULL
  AND process_step NOT IN (
    'new', 'demand_approved', 'analysis', 'ready_for_development',
    'under_implementation', 'implementation_review', 'pending_testing',
    'done', 'on_hold', 'canceled'
  );

COMMIT;
