
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'th_shared_steps' AND column_name = 'description') THEN
    ALTER TABLE th_shared_steps ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'th_shared_steps' AND column_name = 'created_by') THEN
    ALTER TABLE th_shared_steps ADD COLUMN created_by UUID REFERENCES profiles(id);
  END IF;
END $$;
