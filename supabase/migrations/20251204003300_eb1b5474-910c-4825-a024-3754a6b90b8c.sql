
-- Add business_score column to business_requests
ALTER TABLE public.business_requests ADD COLUMN IF NOT EXISTS business_score integer DEFAULT 0;

-- Update existing records with varied business scores
UPDATE public.business_requests 
SET business_score = 
  CASE 
    WHEN rank <= 5 THEN 90 + (FLOOR(RANDOM() * 10))::int
    WHEN rank <= 10 THEN 75 + (FLOOR(RANDOM() * 15))::int
    WHEN rank <= 20 THEN 60 + (FLOOR(RANDOM() * 15))::int
    WHEN rank <= 30 THEN 40 + (FLOOR(RANDOM() * 20))::int
    ELSE 10 + (FLOOR(RANDOM() * 30))::int
  END
WHERE business_score IS NULL OR business_score = 0;
