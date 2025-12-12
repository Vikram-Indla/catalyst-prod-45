-- Fix the FK constraint: epics.primary_program_id should reference programs, not projects
ALTER TABLE epics DROP CONSTRAINT IF EXISTS epics_primary_program_id_fkey;
ALTER TABLE epics ADD CONSTRAINT epics_primary_program_id_fkey 
  FOREIGN KEY (primary_program_id) REFERENCES programs(id) ON DELETE SET NULL;

-- Now update existing epics to link to DT Program
UPDATE epics SET primary_program_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901' WHERE deleted_at IS NULL AND primary_program_id IS NULL;