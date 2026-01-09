-- Add AI-related columns to tm_test_cases
ALTER TABLE tm_test_cases ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE tm_test_cases ADD COLUMN IF NOT EXISTS ai_generation_prompt TEXT;
ALTER TABLE tm_test_cases ADD COLUMN IF NOT EXISTS ai_model VARCHAR(50);
ALTER TABLE tm_test_cases ADD COLUMN IF NOT EXISTS ai_generated_at TIMESTAMPTZ;

-- Index for AI-generated cases
CREATE INDEX IF NOT EXISTS idx_tm_test_cases_ai ON tm_test_cases(is_ai_generated) WHERE is_ai_generated = TRUE;