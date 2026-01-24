-- Backfill missing RIDs in resource_inventory
DO $$
DECLARE
  max_rid INTEGER;
  r RECORD;
  counter INTEGER;
BEGIN
  -- Get the current max RID
  SELECT COALESCE(MAX(CAST(rid AS INTEGER)), 0) INTO max_rid FROM resource_inventory WHERE rid IS NOT NULL;
  
  counter := max_rid;
  
  -- Loop through records without RID and assign them
  FOR r IN 
    SELECT id FROM resource_inventory 
    WHERE rid IS NULL 
    ORDER BY created_at ASC
  LOOP
    counter := counter + 1;
    UPDATE resource_inventory 
    SET rid = LPAD(counter::TEXT, 3, '0')
    WHERE id = r.id;
  END LOOP;
END $$;