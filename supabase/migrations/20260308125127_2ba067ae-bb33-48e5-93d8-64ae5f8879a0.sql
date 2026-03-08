
-- Add Business Request initiative type
INSERT INTO initiative_types (id, key, label, description, icon, color_token, color_hex, sort_order, is_active)
VALUES (
  gen_random_uuid(),
  'business_request',
  'Business Request',
  'Business-driven request or demand item synced from Jira MDT project.',
  '💡',
  'amber',
  '#B45309',
  6,
  true
);

-- Update all MDT enhancement items to business_request type
UPDATE ph_initiatives 
SET initiative_type_id = (SELECT id FROM initiative_types WHERE key = 'business_request'),
    updated_at = now()
WHERE initiative_key LIKE 'MDT-%' 
  AND initiative_type_id = '00242328-979a-4ecb-8f02-5d3b982966d1';
