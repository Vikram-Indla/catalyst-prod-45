-- Drop the existing relationship check constraint
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_relationship_check;

-- Add new constraint that includes 'Demand'
ALTER TABLE risks ADD CONSTRAINT risks_relationship_check 
CHECK (relationship = ANY (ARRAY['Theme'::text, 'Epic'::text, 'Capability'::text, 'Feature'::text, 'Program Increment'::text, 'Demand'::text]));

-- Update existing risks linked to Business Requests to have relationship = 'Demand'
UPDATE risks 
SET relationship = 'Demand' 
WHERE business_request_id IS NOT NULL;