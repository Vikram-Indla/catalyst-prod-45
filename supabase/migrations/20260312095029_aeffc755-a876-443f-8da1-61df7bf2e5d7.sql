
-- 1. Add IMPACT dimension columns if they don't exist
ALTER TABLE ph_ideas ADD COLUMN IF NOT EXISTS impact_investor_fit numeric DEFAULT 0;
ALTER TABLE ph_ideas ADD COLUMN IF NOT EXISTS impact_market_size numeric DEFAULT 0;
ALTER TABLE ph_ideas ADD COLUMN IF NOT EXISTS impact_problem_severity numeric DEFAULT 0;
ALTER TABLE ph_ideas ADD COLUMN IF NOT EXISTS impact_user_benefit numeric DEFAULT 0;
ALTER TABLE ph_ideas ADD COLUMN IF NOT EXISTS impact_complexity_inv numeric DEFAULT 0;
ALTER TABLE ph_ideas ADD COLUMN IF NOT EXISTS impact_time_to_value numeric DEFAULT 0;

-- 2. Add converted tracking columns
ALTER TABLE ph_ideas ADD COLUMN IF NOT EXISTS converted_at timestamptz;
ALTER TABLE ph_ideas ADD COLUMN IF NOT EXISTS converted_initiative_id uuid;

-- 3. Create trigger for weighted IMPACT computation
CREATE OR REPLACE FUNCTION compute_idea_impact_total()
RETURNS trigger AS $$
BEGIN
  NEW.impact_total := ROUND(
    (COALESCE(NEW.impact_investor_fit, 0) * 0.25) +
    (COALESCE(NEW.impact_market_size, 0) * 0.20) +
    (COALESCE(NEW.impact_problem_severity, 0) * 0.20) +
    (COALESCE(NEW.impact_user_benefit, 0) * 0.15) +
    (COALESCE(NEW.impact_complexity_inv, 0) * 0.10) +
    (COALESCE(NEW.impact_time_to_value, 0) * 0.10),
    2
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compute_impact ON ph_ideas;
CREATE TRIGGER trg_compute_impact
  BEFORE INSERT OR UPDATE ON ph_ideas
  FOR EACH ROW EXECUTE FUNCTION compute_idea_impact_total();
