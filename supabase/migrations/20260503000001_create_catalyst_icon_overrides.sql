-- ═══════════════════════════════════════════════════════════════════════
-- catalyst_icon_overrides — RESET ICONS runtime override surface
-- 2026-05-03
--
-- Stores user-uploaded replacement assets for the canonical Catalyst icon
-- library at src/assets/icons/. Components in @/components/icons read this
-- table via useIconOverrides() and prefer the override URL over the
-- bundled compile-time asset.
--
-- Permission gating uses the codebase-standard `has_role()` helper which
-- looks up public.user_roles by user_id + app_role enum. The app_role
-- enum is defined as ('admin', 'program_manager', 'team_lead', 'user')
-- in 20251211141446_remix_migration_from_pg_dump.sql — only 'admin' has
-- write permission to icon overrides.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.catalyst_icon_overrides (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text NOT NULL CHECK (category IN ('work-type', 'priority', 'project-avatar')),
  key         text NOT NULL,
  variant     text NOT NULL DEFAULT 'light' CHECK (variant IN ('light', 'dark')),
  override_url text NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, key, variant)
);

CREATE INDEX IF NOT EXISTS idx_catalyst_icon_overrides_category
  ON public.catalyst_icon_overrides (category);

CREATE OR REPLACE FUNCTION public.touch_catalyst_icon_overrides()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_catalyst_icon_overrides_touch ON public.catalyst_icon_overrides;
CREATE TRIGGER trg_catalyst_icon_overrides_touch
  BEFORE UPDATE ON public.catalyst_icon_overrides
  FOR EACH ROW EXECUTE FUNCTION public.touch_catalyst_icon_overrides();

ALTER TABLE public.catalyst_icon_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "icon overrides — read for authed" ON public.catalyst_icon_overrides;
CREATE POLICY "icon overrides — read for authed"
  ON public.catalyst_icon_overrides
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "icon overrides — admin write" ON public.catalyst_icon_overrides;
CREATE POLICY "icon overrides — admin write"
  ON public.catalyst_icon_overrides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO storage.buckets (id, name, public)
VALUES ('icon-overrides', 'icon-overrides', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "icon-overrides bucket — read public" ON storage.objects;
CREATE POLICY "icon-overrides bucket — read public"
  ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'icon-overrides');

DROP POLICY IF EXISTS "icon-overrides bucket — admin write" ON storage.objects;
CREATE POLICY "icon-overrides bucket — admin write"
  ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'icon-overrides'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'icon-overrides'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
