-- Add tracking columns for real-time sync on resource_allocations
ALTER TABLE resource_allocations 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Create or replace trigger to auto-update updated_at and updated_by
CREATE OR REPLACE FUNCTION update_allocation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS allocation_timestamp_trigger ON resource_allocations;
CREATE TRIGGER allocation_timestamp_trigger
  BEFORE UPDATE ON resource_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_allocation_timestamp();