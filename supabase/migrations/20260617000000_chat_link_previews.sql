-- =====================================================================
-- Catalyst Chat — link preview cache
-- =====================================================================
-- Cache of OG metadata fetched by the chat-unfurl edge function.
-- One row per URL. Treated as non-PII; readable by any authenticated
-- session. Writes only by service-role (edge function).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.chat_link_previews (
  url          text PRIMARY KEY,
  domain       text NOT NULL,
  title        text,
  description  text,
  image_url    text,
  fetched_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.chat_link_previews IS
  'OG metadata cache for URLs unfurled inside chat messages. Populated by the chat-unfurl edge function.';

CREATE INDEX IF NOT EXISTS chat_link_previews_domain_idx
  ON public.chat_link_previews (domain);

ALTER TABLE public.chat_link_previews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_link_previews_select ON public.chat_link_previews;
CREATE POLICY chat_link_previews_select ON public.chat_link_previews
  FOR SELECT TO authenticated
  USING (true);

-- No insert/update/delete policies for authenticated users.
-- Writes go through the edge function via service-role.
