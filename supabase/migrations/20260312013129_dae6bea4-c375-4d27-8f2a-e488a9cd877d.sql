
-- Impact scoring trigger
CREATE OR REPLACE FUNCTION compute_idea_impact_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.impact_total := ROUND(
    (COALESCE(NEW.impact_investor_fit, 0) * 0.25) +
    (COALESCE(NEW.impact_market_size, 0) * 0.20) +
    (COALESCE(NEW.impact_problem_severity, 0) * 0.20) +
    (COALESCE(NEW.impact_user_benefit, 0) * 0.15) +
    (COALESCE(NEW.impact_complexity_inv, 0) * 0.10) +
    (COALESCE(NEW.impact_time_to_value, 0) * 0.10),
  2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compute_idea_impact ON ph_ideas;
CREATE TRIGGER trg_compute_idea_impact
  BEFORE INSERT OR UPDATE ON ph_ideas
  FOR EACH ROW EXECUTE FUNCTION compute_idea_impact_score();
