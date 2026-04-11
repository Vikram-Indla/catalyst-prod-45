-- Step A: Migrate valid defect link rows to tm_defect_links
INSERT INTO tm_defect_links (defect_id, link_type, linked_id, entity_label, link_source, created_by)
SELECT
  linked_item_id::uuid AS defect_id,
  'test_case' AS link_type,
  test_case_id AS linked_id,
  NULL AS entity_label,
  'manual' AS link_source,
  linked_by AS created_by
FROM tm_test_case_links
WHERE linked_item_type = 'defect'
  AND linked_item_id IS NOT NULL
  AND linked_item_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ON CONFLICT DO NOTHING;

-- Step B: Remove defect rows from tm_test_case_links (now in tm_defect_links)
DELETE FROM tm_test_case_links
WHERE linked_item_type = 'defect';