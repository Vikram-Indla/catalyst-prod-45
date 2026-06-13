-- Migration: process_step_slug_to_name
-- Migrates business_requests.process_step from catalyst_workflow slugs
-- to ph_workflow display names (single source of truth).
-- Also migrates demand_process_steps.value to match + adds is_landing column.

-- 1. Add is_landing column to demand_process_steps (required by useBrLandingStep hook)
ALTER TABLE demand_process_steps ADD COLUMN IF NOT EXISTS is_landing BOOLEAN NOT NULL DEFAULT false;

-- 2. Update demand_process_steps: migrate value/label to ph_workflow names
UPDATE demand_process_steps SET value = 'In Requirements',   label = 'In Requirements'   WHERE value = 'new';
UPDATE demand_process_steps SET value = 'Demand Validation', label = 'Demand Validation' WHERE value = 'demand_approved';
UPDATE demand_process_steps SET value = 'Prioritized Backlog', label = 'Prioritized Backlog' WHERE value = 'ready_for_development';
UPDATE demand_process_steps SET value = 'In Development',    label = 'In Development'    WHERE value = 'under_implementation';
UPDATE demand_process_steps SET value = 'Done',              label = 'Done',              is_landing = true WHERE value = 'done';
UPDATE demand_process_steps SET value = 'Rejected',          label = 'Rejected'          WHERE value = 'canceled';

-- 3. Delete rows that collapsed into an existing name after the mapping
DELETE FROM demand_process_steps WHERE value IN ('analysis', 'implementation_review', 'pending_testing', 'on_hold');

-- 4. Insert Won't Do row (matches ph_workflow BR status — no old slug equivalent)
INSERT INTO demand_process_steps (id, value, label, sort_order, is_active, is_landing)
VALUES (gen_random_uuid(), 'Won''t Do', 'Won''t Do', 7, true, false);

-- 5. Migrate business_requests.process_step slugs → display names
UPDATE business_requests SET process_step = 'In Requirements'    WHERE process_step = 'new';
UPDATE business_requests SET process_step = 'Demand Validation'  WHERE process_step IN ('demand_approved', 'analysis');
UPDATE business_requests SET process_step = 'Prioritized Backlog' WHERE process_step IN ('ready_for_development', 'on_hold');
UPDATE business_requests SET process_step = 'In Development'     WHERE process_step IN ('under_implementation', 'implementation_review', 'pending_testing');
UPDATE business_requests SET process_step = 'Done'               WHERE process_step = 'done';
UPDATE business_requests SET process_step = 'Rejected'           WHERE process_step = 'canceled';
