-- Add WSJF calculation trigger for epic_wsjf table (without problematic seed data)
CREATE OR REPLACE FUNCTION calculate_epic_wsjf()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate WSJF score: (BV + TC + RR/OE) / JS
  IF NEW.business_value IS NOT NULL 
     AND NEW.time_value IS NOT NULL 
     AND NEW.rroe_value IS NOT NULL 
     AND NEW.job_size IS NOT NULL 
     AND NEW.job_size > 0 THEN
    NEW.wsjf_score := ROUND(
      (NEW.business_value + NEW.time_value + NEW.rroe_value)::NUMERIC / NEW.job_size::NUMERIC, 
      2
    );
  ELSE
    NEW.wsjf_score := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for epic_wsjf automatic calculation
DROP TRIGGER IF EXISTS trigger_calculate_epic_wsjf ON epic_wsjf;
CREATE TRIGGER trigger_calculate_epic_wsjf
  BEFORE INSERT OR UPDATE ON epic_wsjf
  FOR EACH ROW
  EXECUTE FUNCTION calculate_epic_wsjf();

-- Add comprehensive seed data for epic_wsjf across multiple PIs
INSERT INTO epic_wsjf (epic_id, pi_id, business_value, time_value, rroe_value, job_size, global_rank)
SELECT 
  e.id,
  pi.id,
  (ARRAY[3, 5, 8, 13, 20])[1 + floor(random() * 5)::int],
  (ARRAY[2, 3, 5, 8, 13])[1 + floor(random() * 5)::int],
  (ARRAY[1, 2, 3, 5, 8])[1 + floor(random() * 5)::int],
  (ARRAY[5, 8, 13, 20, 40])[1 + floor(random() * 5)::int],
  ROW_NUMBER() OVER (PARTITION BY pi.id ORDER BY random())
FROM epics e
CROSS JOIN (SELECT id FROM program_increments ORDER BY start_date DESC LIMIT 3) pi
WHERE NOT EXISTS (
  SELECT 1 FROM epic_wsjf ew 
  WHERE ew.epic_id = e.id AND ew.pi_id = pi.id
)
LIMIT 50
ON CONFLICT (epic_id, pi_id) DO NOTHING;