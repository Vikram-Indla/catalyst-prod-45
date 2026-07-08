-- CAT-VOICE-UX-PREMIUM-20260708-001 S6a — latency instrumentation + calm
-- no-speech outcome.
-- first_partial_ms: ms from listening-start to the first live partial word
-- (the premium latency budget is measured, not guessed).
-- status 'no_speech': silence/muted-mic sessions are an outcome, not an
-- error — keeps the ~25% "silent failure" telemetry honest.

ALTER TABLE public.voice_dictation_sessions
  ADD COLUMN IF NOT EXISTS first_partial_ms int;

ALTER TABLE public.voice_dictation_sessions
  DROP CONSTRAINT IF EXISTS voice_dictation_sessions_status_check;

ALTER TABLE public.voice_dictation_sessions
  ADD CONSTRAINT voice_dictation_sessions_status_check
  CHECK (status IN ('started', 'completed', 'cancelled', 'error', 'no_speech'));
