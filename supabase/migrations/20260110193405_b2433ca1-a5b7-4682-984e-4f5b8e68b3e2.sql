-- Add PRD content columns to ra_generations table
ALTER TABLE ra_generations 
ADD COLUMN IF NOT EXISTS prd_content TEXT;

ALTER TABLE ra_generations 
ADD COLUMN IF NOT EXISTS prd_title TEXT;

-- Add comment for documentation
COMMENT ON COLUMN ra_generations.prd_content IS 'Full PRD document content in markdown format';
COMMENT ON COLUMN ra_generations.prd_title IS 'Title of the generated PRD document';