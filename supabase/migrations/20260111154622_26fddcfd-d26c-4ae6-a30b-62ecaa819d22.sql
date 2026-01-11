-- Add realtime for tables not already in publication (skip already added ones)
DO $$ 
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.idea_votes;
  EXCEPTION WHEN duplicate_object THEN
    -- Already exists, ignore
  END;
  BEGIN  
    ALTER PUBLICATION supabase_realtime ADD TABLE public.idea_comments;
  EXCEPTION WHEN duplicate_object THEN
    -- Already exists, ignore
  END;
END $$;