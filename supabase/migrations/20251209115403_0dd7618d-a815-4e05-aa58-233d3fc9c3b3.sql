
-- Add missing columns to strategy_snapshots
ALTER TABLE public.strategy_snapshots 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS total_funding NUMERIC,
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS active_since TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS enterprise_id UUID;

-- Create snapshot_configurations table if not exists
CREATE TABLE IF NOT EXISTS public.snapshot_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES public.strategy_snapshots(id) ON DELETE CASCADE,
  quarters TEXT[] NOT NULL DEFAULT '{}',
  themes TEXT[] NOT NULL DEFAULT '{}',
  org_structures TEXT[] DEFAULT '{}',
  products TEXT[] DEFAULT '{}',
  members UUID[] DEFAULT '{}',
  notify_on_activation BOOLEAN DEFAULT true,
  notify_on_changes BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(snapshot_id)
);

-- Enable RLS on snapshot_configurations
ALTER TABLE public.snapshot_configurations ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view snapshot configurations" ON public.snapshot_configurations;
DROP POLICY IF EXISTS "Authenticated users can create snapshot configurations" ON public.snapshot_configurations;
DROP POLICY IF EXISTS "Authenticated users can update snapshot configurations" ON public.snapshot_configurations;
DROP POLICY IF EXISTS "Authenticated users can delete snapshot configurations" ON public.snapshot_configurations;

CREATE POLICY "Users can view snapshot configurations" 
ON public.snapshot_configurations FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create snapshot configurations" 
ON public.snapshot_configurations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update snapshot configurations" 
ON public.snapshot_configurations FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete snapshot configurations" 
ON public.snapshot_configurations FOR DELETE USING (auth.uid() IS NOT NULL);

-- Function to auto-archive previous active snapshot
CREATE OR REPLACE FUNCTION public.auto_archive_active_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND (OLD IS NULL OR OLD.status IS NULL OR OLD.status != 'ACTIVE') THEN
    UPDATE public.strategy_snapshots
    SET status = 'ARCHIVED', 
        archived_at = now(),
        updated_at = now()
    WHERE status = 'ACTIVE' 
      AND id != NEW.id;
    NEW.active_since := now();
  END IF;
  
  IF NEW.status = 'ARCHIVED' AND (OLD IS NULL OR OLD.status IS NULL OR OLD.status != 'ARCHIVED') THEN
    NEW.archived_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_auto_archive_snapshot ON public.strategy_snapshots;
CREATE TRIGGER trigger_auto_archive_snapshot
BEFORE INSERT OR UPDATE ON public.strategy_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.auto_archive_active_snapshot();
