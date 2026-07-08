-- CAT-DICTATION-INTELLIGENCE-20260708-001 S3 — quality flywheel.
-- edit_ratio: normalized edit distance between what dictation inserted and
-- what the user actually kept (0 = untouched, 1 = fully rewritten). The
-- correction learner already snapshots both texts; this makes per-user,
-- per-language accuracy measurable instead of anecdotal.

ALTER TABLE public.voice_dictation_sessions
  ADD COLUMN IF NOT EXISTS edit_ratio numeric;
