-- Business Request: remap "Demand Validation" → product_validation.
-- Evidence: ph_wf_migration_preview('business_request') shows 10 items with "Demand Validation" unmapped.
-- "Demand Validation" = validating demand/fit = product_validation (canonical: "Product Validation").
-- CAT-VERSIONED-CANONICAL-WORKFLOW-20260628-001

DO $$
DECLARE
  v_version_id uuid;
BEGIN
  SELECT id INTO v_version_id
  FROM ph_wf_versions
  WHERE entity_key = 'business_request' AND lifecycle = 'published'
  LIMIT 1;

  IF v_version_id IS NULL THEN
    RAISE EXCEPTION 'business_request published version not found — abort';
  END IF;

  -- "Demand Validation" → product_validation
  -- These BRs are in early validation of demand fit; maps to Product Validation canonical status.
  INSERT INTO ph_wf_status_remaps (entity_key, old_status_key, new_status_key, to_version_id)
  VALUES ('business_request', 'Demand Validation', 'product_validation', v_version_id)
  ON CONFLICT (entity_key, old_status_key, to_version_id) DO UPDATE SET new_status_key = EXCLUDED.new_status_key;

  RAISE NOTICE 'BR: Demand Validation → product_validation remap applied for version %', v_version_id;
END $$;
