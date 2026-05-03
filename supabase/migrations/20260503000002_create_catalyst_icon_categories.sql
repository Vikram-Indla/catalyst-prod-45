-- ═══════════════════════════════════════════════════════════════════════
-- catalyst_icon_categories — RESET ICONS dynamic category surface
-- 2026-05-03
--
-- Lets admins add new icon categories beyond the bundled trio
-- (work-type, priority, project-avatar) without code changes.
--
-- Replaces the original CHECK on overrides.category (restricted to the
-- bundled trio) with a regex that allows kebab/snake slugs of any name.
-- Permissions use the codebase-standard `has_role()` helper, gated to
-- the 'admin' app_role.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.catalyst_icon_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE
              CHECK (name ~ '^[a-z][a-z0-9_-]{1,40}$'
                AND name NOT IN ('work-type', 'priority', 'project-avatar')),
  label       text NOT NULL,
  description text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalyst_icon_categories_sort
  ON public.catalyst_icon_categories (sort_order, name);

CREATE OR REPLACE FUNCTION public.touch_catalyst_icon_categories()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_catalyst_icon_categories_touch ON public.catalyst_icon_categories;
CREATE TRIGGER trg_catalyst_icon_categories_touch
  BEFORE UPDATE ON public.catalyst_icon_categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_catalyst_icon_categories();

ALTER TABLE public.catalyst_icon_overrides
  DROP CONSTRAINT IF EXISTS catalyst_icon_overrides_category_check;

ALTER TABLE public.catalyst_icon_overrides
  ADD CONSTRAINT catalyst_icon_overrides_category_check
  CHECK (category ~ '^[a-z][a-z0-9_-]{1,40}$');

ALTER TABLE public.catalyst_icon_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "icon categories — read for authed" ON public.catalyst_icon_categories;
CREATE POLICY "icon categories — read for authed"
  ON public.catalyst_icon_categories
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "icon categories — admin write" ON public.catalyst_icon_categories;
CREATE POLICY "icon categories — admin write"
  ON public.catalyst_icon_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
