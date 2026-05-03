-- ═══════════════════════════════════════════════════════════════════════
-- catalyst_resource_avatars — RESET ICONS face-avatar override surface
-- 2026-05-03
--
-- Stores admin-uploaded replacement face photos for resources (people).
-- Components that resolve user avatars (via lib/avatars.ts → resolveAvatarUrl)
-- consult this table first; fall back to bundled src/assets/avatars/<slug>.png
-- when no override exists.
--
-- One row per profile.id. Upsert pattern: replacing a photo deletes the
-- old storage object and writes a new row keyed by profile_id.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.catalyst_resource_avatars (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  avatar_url   text NOT NULL,
  storage_path text NOT NULL,
  uploaded_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalyst_resource_avatars_profile
  ON public.catalyst_resource_avatars (profile_id);

CREATE OR REPLACE FUNCTION public.touch_catalyst_resource_avatars()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_catalyst_resource_avatars_touch ON public.catalyst_resource_avatars;
CREATE TRIGGER trg_catalyst_resource_avatars_touch
  BEFORE UPDATE ON public.catalyst_resource_avatars
  FOR EACH ROW EXECUTE FUNCTION public.touch_catalyst_resource_avatars();

-- ─── RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.catalyst_resource_avatars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resource avatars — read for authed" ON public.catalyst_resource_avatars;
CREATE POLICY "resource avatars — read for authed"
  ON public.catalyst_resource_avatars
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "resource avatars — admin write" ON public.catalyst_resource_avatars;
CREATE POLICY "resource avatars — admin write"
  ON public.catalyst_resource_avatars
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ─── Storage bucket ─────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('resource-avatars', 'resource-avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "resource-avatars bucket — read public" ON storage.objects;
CREATE POLICY "resource-avatars bucket — read public"
  ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'resource-avatars');

DROP POLICY IF EXISTS "resource-avatars bucket — admin write" ON storage.objects;
CREATE POLICY "resource-avatars bucket — admin write"
  ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'resource-avatars'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'resource-avatars'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
