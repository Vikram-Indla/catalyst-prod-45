-- Standup Phase 2 — capture the full standup audio transcript at the
-- session level (not per-speaker).
--
-- Browser speech recognition has no speaker diarization — tagging
-- chunks with "whoever was selected in the panel" lies whenever
-- someone interjects. Instead we record the raw continuous transcript
-- with timestamps and let Phase 3 (AI summary) cross-reference these
-- chunks against the existing per-speaker turn windows in
-- standup_events to attribute utterances.
--
-- Shape of each element in the array:
--   { "ts": "2026-06-14T13:34:15.000Z", "text": "I worked on the dashboard fix" }
--
-- Default '[]' so existing rows + new rows that never recorded a
-- transcript (mic denied / unsupported browser) read as an empty
-- array, not null — no null-handling needed downstream.

BEGIN;

ALTER TABLE public.standups
  ADD COLUMN IF NOT EXISTS transcript_chunks jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.standups.transcript_chunks IS
  'Continuous standup transcript as a JSONB array of {ts, text} chunks emitted by browser speech recognition. No speaker attribution — Phase 3 cross-references against standup_events turn windows to attribute utterances. Empty array when no transcript was captured.';

COMMIT;
