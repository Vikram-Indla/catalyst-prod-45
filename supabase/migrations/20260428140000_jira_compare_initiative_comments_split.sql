-- jira-compare audit (2026-04-28) — initiative comments split-table fix.
--
-- Background (CLAUDE.md cycles 12 + 13 + 14):
--   ph_comments.work_item_id is a UUID FK'd to ph_issues(id). Three
--   surfaces in the codebase pass an initiative UUID (ph_initiatives.id)
--   into that filter: src/components/initiatives/DetailPanel.tsx,
--   src/components/producthub/timeline/DetailTabActivity.tsx, and
--   src/components/producthub/timeline/DetailTabDetails.tsx. They also
--   include `work_item_type: 'initiative'` on insert — a column that
--   does not exist on ph_comments. Net result: initiative comments
--   have never persisted in production.
--
-- Strategy — split-table (smaller blast radius than discriminator):
--   * Create ph_initiative_comments mirroring ph_comments shape, with
--     a real FK to ph_initiatives(id).
--   * Mirror the RLS policies pattern from ph_initiative_attachments
--     (auth.uid() IS NOT NULL gate on SELECT/INSERT/UPDATE/DELETE).
--   * No data migration: ph_comments has no initiative rows to recover
--     (every prior insert failed; verified empty for initiative scope).
--   * ph_comments is left untouched — its ph_issues FK contract stays
--     valid for every other consumer.
--
-- Rollback: DROP TABLE ph_initiative_comments CASCADE.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS ph_initiative_comments (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  initiative_id UUID        NOT NULL REFERENCES ph_initiatives(id) ON DELETE CASCADE,
  author_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  body          TEXT        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ph_initiative_comments_initiative
  ON ph_initiative_comments(initiative_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_ph_initiative_comments_author
  ON ph_initiative_comments(author_id);

ALTER TABLE ph_initiative_comments ENABLE ROW LEVEL SECURITY;

-- Mirror the ph_initiative_attachments policy pattern: any authenticated
-- user can read; any authenticated user can write. Tighten later if RLS
-- requirements diverge.
CREATE POLICY "Authenticated read initiative_comments"
  ON ph_initiative_comments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated insert initiative_comments"
  ON ph_initiative_comments
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update initiative_comments"
  ON ph_initiative_comments
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated delete initiative_comments"
  ON ph_initiative_comments
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Auto-update updated_at on row UPDATE. Reuses the standard
-- update_updated_at_column trigger function declared elsewhere in the
-- schema (used by ph_initiatives, ph_issues, etc.).
DROP TRIGGER IF EXISTS update_ph_initiative_comments_updated_at
  ON ph_initiative_comments;
CREATE TRIGGER update_ph_initiative_comments_updated_at
  BEFORE UPDATE ON ph_initiative_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
