-- Threaded reply support for ph_comments.
--
-- Adds a self-referencing parent_comment_id column so a comment can
-- point to its parent. Top-level comments stay NULL. The Activity
-- panel builds the comment tree client-side from the flat rows and
-- renders replies indented under their parent with the curved
-- connector line.
--
-- CASCADE on DELETE removes the entire reply tree when a parent is
-- deleted — matches the existing behavior on ph_comment_reactions.

ALTER TABLE public.ph_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID
  REFERENCES public.ph_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ph_comments_parent
  ON public.ph_comments(parent_comment_id)
  WHERE parent_comment_id IS NOT NULL;

COMMENT ON COLUMN public.ph_comments.parent_comment_id IS
  'Self-referencing FK for threaded replies. Top-level comments are NULL; replies point at their immediate parent.';
