-- Migration: add_test_hub_scope_to_saved_filters
-- Extends ph_saved_filters.hub_scope CHECK constraint to include 'test'
-- Required for Test Hub filter integration (Project, Product, Test)

ALTER TABLE ph_saved_filters
  DROP CONSTRAINT ph_saved_filters_hub_scope_check;

ALTER TABLE ph_saved_filters
  ADD CONSTRAINT ph_saved_filters_hub_scope_check
  CHECK (hub_scope = ANY (ARRAY['project'::text, 'product'::text, 'both'::text, 'test'::text]));
