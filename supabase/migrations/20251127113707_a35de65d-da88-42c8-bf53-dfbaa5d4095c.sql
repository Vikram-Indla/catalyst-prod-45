-- Add process step time tracking to epics table (these fields already exist, so using IF NOT EXISTS)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epics' AND column_name = 'process_step_entered_at') THEN
    ALTER TABLE epics ADD COLUMN process_step_entered_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epics' AND column_name = 'process_flow_entered_at') THEN
    ALTER TABLE epics ADD COLUMN process_flow_entered_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create process step history table
CREATE TABLE IF NOT EXISTS epic_process_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
  process_step_id UUID REFERENCES process_steps(id) ON DELETE SET NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE epic_process_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view process history"
  ON epic_process_history FOR SELECT
  USING (true);

CREATE POLICY "Users can insert process history"
  ON epic_process_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update process history"
  ON epic_process_history FOR UPDATE
  USING (true);

-- Create function to track process step changes
CREATE OR REPLACE FUNCTION track_epic_process_step_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.process_step_id IS DISTINCT FROM NEW.process_step_id) THEN
    IF OLD.process_step_id IS NOT NULL THEN
      UPDATE epic_process_history
      SET exited_at = NOW()
      WHERE epic_id = NEW.id
        AND process_step_id = OLD.process_step_id
        AND exited_at IS NULL;
    END IF;
    
    IF NEW.process_step_id IS NOT NULL THEN
      INSERT INTO epic_process_history (epic_id, process_step_id, entered_at)
      VALUES (NEW.id, NEW.process_step_id, NOW());
      
      NEW.process_step_entered_at := NOW();
    END IF;
  END IF;
  
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.process_step_id IS NULL AND NEW.process_step_id IS NOT NULL)) THEN
    IF NEW.process_flow_entered_at IS NULL THEN
      NEW.process_flow_entered_at := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS epic_process_step_tracking ON epics;
CREATE TRIGGER epic_process_step_tracking
  BEFORE INSERT OR UPDATE OF process_step_id ON epics
  FOR EACH ROW
  EXECUTE FUNCTION track_epic_process_step_change();