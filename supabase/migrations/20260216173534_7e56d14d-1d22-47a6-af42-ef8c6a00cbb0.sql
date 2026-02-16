
-- 1. Add soft delete column to releases
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 2. Index for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_releases_deleted_at ON releases(deleted_at) WHERE deleted_at IS NULL;

-- 3. Index for created_at ordering
CREATE INDEX IF NOT EXISTS idx_releases_created_at ON releases(created_at DESC);

-- 4. Create release_snapshots table for burndown charts
CREATE TABLE IF NOT EXISTS public.release_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id uuid REFERENCES public.releases(id) ON DELETE CASCADE NOT NULL,
  snapshot_date date NOT NULL,
  progress integer DEFAULT 0,
  test_passed integer DEFAULT 0,
  test_total integer DEFAULT 0,
  defect_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_release_snapshots_release ON release_snapshots(release_id, snapshot_date);

-- 5. Enable RLS on release_snapshots
ALTER TABLE public.release_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view release snapshots"
  ON public.release_snapshots FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert release snapshots"
  ON public.release_snapshots FOR INSERT
  WITH CHECK (true);

-- 6. Ensure updated_at trigger exists for releases
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.releases;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.releases
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
