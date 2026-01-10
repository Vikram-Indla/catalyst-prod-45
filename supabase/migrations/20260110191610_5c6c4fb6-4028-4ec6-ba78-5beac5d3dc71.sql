-- Add author_name column to ra_generations
ALTER TABLE ra_generations ADD COLUMN IF NOT EXISTS author_name TEXT;

-- Update existing records with a default
UPDATE ra_generations SET author_name = 'Unknown' WHERE author_name IS NULL;