-- ═══════════════════════════════════════════════════════════════════════════
-- projects.avatar_url — optional URL for a project's branded avatar
-- Author: Catalyst team (TurnQy) · April 2026
--
-- Powers the project cards in the "Recommended projects" strip on the For You
-- page (and any future surface that wants a branded project tile). When set,
-- @atlaskit/avatar renders the image; when null, Atlaskit falls back to a
-- hashed-initials tile — the same fallback Jira uses for projects without a
-- custom avatar.
--
-- No backfill in this migration. Seeding happens separately (either via
-- Supabase Storage uploads or a one-off `update projects set avatar_url = ...`
-- statement per project).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.projects.avatar_url IS
  'Optional URL for a branded project avatar. When null, clients render a '
  'hashed-initials fallback (e.g. @atlaskit/avatar default). Accepts any '
  'absolute URL — Supabase Storage public URL, CDN, Jira universal_avatar, '
  'etc.';
