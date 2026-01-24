-- Fix existing assignments without assignment_id
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order, created_at) as rn
  FROM resource_assignments
  WHERE assignment_id IS NULL
),
max_num AS (
  SELECT COALESCE(MAX(CAST(SUBSTRING(assignment_id FROM 2) AS integer)), 0) as max_val
  FROM resource_assignments 
  WHERE assignment_id IS NOT NULL AND assignment_id ~ '^A[0-9]+$'
)
UPDATE resource_assignments a
SET assignment_id = 'A' || LPAD((m.max_val + n.rn)::text, 2, '0')
FROM numbered n, max_num m
WHERE a.id = n.id;