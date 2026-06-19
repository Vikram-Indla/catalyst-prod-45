-- Voice Translate Dictation Engine — Phase 1 (2026-06-20)
-- Tables: voice_dictation_settings, voice_dictation_sessions
-- Feature flag: voice_dictation (default disabled)

-- ─── Settings (per-user preferences) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.voice_dictation_settings (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_languages     text[]      NOT NULL DEFAULT ARRAY['ar-SA', 'ur-PK', 'hi-IN'],
  enabled              boolean     NOT NULL DEFAULT true,
  auto_commit          boolean     NOT NULL DEFAULT true,
  cleanup_enabled      boolean     NOT NULL DEFAULT true,
  store_audio          boolean     NOT NULL DEFAULT false,
  store_transcript     boolean     NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT voice_dictation_settings_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS voice_dictation_settings_user_id_idx
  ON public.voice_dictation_settings (user_id);

ALTER TABLE public.voice_dictation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_dictation_settings_owner_all" ON public.voice_dictation_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Sessions (audit log — no audio, no transcript) ──────────────────
CREATE TABLE IF NOT EXISTS public.voice_dictation_sessions (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_started_at   timestamptz NOT NULL DEFAULT now(),
  duration_ms          int,
  detected_language    text,
  status               text        NOT NULL DEFAULT 'started'
                         CHECK (status IN ('started','completed','cancelled','error')),
  error_code           text,
  audio_bytes          int,          -- size only, not content
  gemini_latency_ms    int,
  target_field_kind    text,         -- 'input' | 'textarea' | 'contenteditable'
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_dictation_sessions_user_id_idx
  ON public.voice_dictation_sessions (user_id);
CREATE INDEX IF NOT EXISTS voice_dictation_sessions_created_at_idx
  ON public.voice_dictation_sessions (created_at DESC);

ALTER TABLE public.voice_dictation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_dictation_sessions_owner_select" ON public.voice_dictation_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "voice_dictation_sessions_owner_insert" ON public.voice_dictation_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "voice_dictation_sessions_owner_update" ON public.voice_dictation_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can read all sessions for usage analytics
CREATE POLICY "voice_dictation_sessions_admin_select" ON public.voice_dictation_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

-- ─── Feature flag row ────────────────────────────────────────────────
INSERT INTO public.feature_flags (
  module_key, module_name, label, description, group_name, is_enabled, enabled, sort_order, icon
)
VALUES (
  'voice_dictation',
  'Voice Translate Dictation',
  'Voice Translate Dictation',
  'Double-space hotkey activates mic — speak Arabic, Urdu, or Hindi, Gemini transcribes and translates to English, inserts into focused field.',
  'AI Features',
  false,
  false,
  95,
  'microphone'
)
ON CONFLICT (module_key) DO NOTHING;
