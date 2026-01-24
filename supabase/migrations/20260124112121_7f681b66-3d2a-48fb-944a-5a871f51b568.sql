-- Add department_id column with auto-generated D01, D02 format
ALTER TABLE capacity_departments ADD COLUMN IF NOT EXISTS department_id TEXT;

-- Create sequence for capacity department IDs
CREATE SEQUENCE IF NOT EXISTS capacity_department_id_seq START 1;

-- Create function to generate department ID
CREATE OR REPLACE FUNCTION generate_capacity_department_id()
RETURNS TRIGGER AS $$
DECLARE
  next_val INTEGER;
BEGIN
  next_val := nextval('capacity_department_id_seq');
  NEW.department_id := 'D' || LPAD(next_val::TEXT, 2, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_capacity_department_id ON capacity_departments;
CREATE TRIGGER set_capacity_department_id
  BEFORE INSERT ON capacity_departments
  FOR EACH ROW
  WHEN (NEW.department_id IS NULL)
  EXECUTE FUNCTION generate_capacity_department_id();

-- Update existing rows with sequential IDs
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM capacity_departments
  WHERE department_id IS NULL
)
UPDATE capacity_departments cd
SET department_id = 'D' || LPAD(n.rn::TEXT, 2, '0')
FROM numbered n
WHERE cd.id = n.id;

-- Reset sequence to continue after existing records
SELECT setval('capacity_department_id_seq', COALESCE((SELECT MAX(SUBSTRING(department_id FROM 2)::INTEGER) FROM capacity_departments WHERE department_id IS NOT NULL), 0));

-- Make department_id NOT NULL and UNIQUE
ALTER TABLE capacity_departments ALTER COLUMN department_id SET NOT NULL;
ALTER TABLE capacity_departments ADD CONSTRAINT capacity_departments_department_id_unique UNIQUE (department_id);