
-- Trigger to auto-compute progress_pct on es_key_results
CREATE OR REPLACE FUNCTION fn_kr_compute_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.target_value IS NOT NULL AND NEW.start_value IS NOT NULL AND NEW.target_value != NEW.start_value THEN
    NEW.progress_pct := LEAST(100, GREATEST(0, 
      ROUND(((COALESCE(NEW.current_value,0) - COALESCE(NEW.start_value,0)) / NULLIF(NEW.target_value - NEW.start_value, 0)) * 100, 1)
    ));
  ELSE
    NEW.progress_pct := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kr_compute_progress ON es_key_results;
CREATE TRIGGER trg_kr_compute_progress
  BEFORE INSERT OR UPDATE OF current_value, start_value, target_value
  ON es_key_results
  FOR EACH ROW
  EXECUTE FUNCTION fn_kr_compute_progress();
