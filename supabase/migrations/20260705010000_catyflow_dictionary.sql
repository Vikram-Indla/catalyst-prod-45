-- CAT-VOICE-FLOW-20260704-001 — CatyFlow personal dictionary
-- Learns proper nouns/jargon from the user's type-over corrections
-- (Wispr parity). Terms feed BOTH the ASR vocabulary bias and the
-- cleanup prompt.

CREATE TABLE IF NOT EXISTS public.dictation_dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  term TEXT NOT NULL,
  misheard_as TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'learned')),
  -- learned terms activate after 2 independent corrections; manual = instant
  occurrences INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, term)
);

CREATE INDEX IF NOT EXISTS dictation_dictionary_user_active_idx
  ON public.dictation_dictionary (user_id, active, occurrences DESC);

ALTER TABLE public.dictation_dictionary ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY dictation_dictionary_owner ON public.dictation_dictionary
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.dictation_dictionary IS
  'CatyFlow per-user vocabulary. source=learned rows activate at occurrences >= 2; manual rows are active immediately.';
