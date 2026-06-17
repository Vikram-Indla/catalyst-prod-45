-- ============================================================================
-- Catalyst chat engine — 4 fixes to make single + multi-window chat work.
-- All DB-only; the chat_* app code already expects these. Each fix repairs
-- currently-broken/missing behavior — no working feature depends on the old state.
--
--   FIX 1  realtime publication missing -> live delivery dead (multi-window).
--   FIX 2  ph_presence / ph_user_status + RPCs absent -> presence/typing/status dead.
--   FIX 3  chat_mark_read references non-existent column is_deleted (real: deleted_at).
--   FIX 4  chat_compute_pair_hash calls pgcrypto digest() which is absent -> DM broken.
-- ============================================================================

-- ── FIX 3: chat_mark_read — is_deleted -> deleted_at IS NULL ──────────────────
CREATE OR REPLACE FUNCTION public.chat_mark_read(p_conv uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_latest_msg_id uuid;
BEGIN
  SELECT id INTO v_latest_msg_id
  FROM public.chat_messages
  WHERE conversation_id = p_conv
    AND parent_id IS NULL
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  UPDATE public.chat_conversation_members
  SET last_read_at = now(), last_read_message_id = v_latest_msg_id
  WHERE conversation_id = p_conv AND user_id = auth.uid();
END;
$function$;

-- ── FIX 4: chat_compute_pair_hash — digest()(absent) -> built-in md5() ────────
CREATE OR REPLACE FUNCTION public.chat_compute_pair_hash(p_user_ids uuid[])
 RETURNS text LANGUAGE sql IMMUTABLE
AS $function$
  SELECT md5(array_to_string(ARRAY(SELECT unnest(p_user_ids)::text ORDER BY 1), '|'));
$function$;

-- ── FIX 2: presence + user status (tables + 6 RPCs the hooks already call) ────
CREATE TABLE IF NOT EXISTS public.ph_presence (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'online' CHECK (status IN ('online','offline')),
  typing_until    timestamptz,
  last_message_at timestamptz,
  last_heartbeat  timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ph_presence_conv_user_key UNIQUE (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS ph_presence_conversation_idx ON public.ph_presence(conversation_id);

CREATE TABLE IF NOT EXISTS public.ph_user_status (
  user_id    uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji      text NOT NULL DEFAULT '🟢',
  message    text NOT NULL DEFAULT '',
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ph_presence    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_user_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY ph_presence_sel ON public.ph_presence FOR SELECT TO authenticated
  USING (public.chat_is_member(conversation_id, auth.uid()));
CREATE POLICY ph_presence_ins ON public.ph_presence FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY ph_presence_upd ON public.ph_presence FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY ph_presence_del ON public.ph_presence FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY ph_user_status_sel ON public.ph_user_status FOR SELECT TO authenticated USING (true);
CREATE POLICY ph_user_status_w ON public.ph_user_status FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

GRANT ALL ON TABLE public.ph_presence, public.ph_user_status TO anon, authenticated, service_role;

-- ensure_presence(conv_uuid, heartbeat_interval_seconds) -> SETOF ph_presence
CREATE OR REPLACE FUNCTION public.ensure_presence(conv_uuid uuid, heartbeat_interval_seconds numeric DEFAULT 30)
 RETURNS SETOF public.ph_presence LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.ph_presence (conversation_id, user_id, status, last_heartbeat, updated_at)
  VALUES (conv_uuid, auth.uid(), 'online', now(), now())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET status='online', last_heartbeat=now(), updated_at=now()
  RETURNING *;
END; $$;

-- set_typing(conv_uuid, is_typing) -> SETOF ph_presence
CREATE OR REPLACE FUNCTION public.set_typing(conv_uuid uuid, is_typing boolean)
 RETURNS SETOF public.ph_presence LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.ph_presence (conversation_id, user_id, status, typing_until, last_heartbeat, updated_at)
  VALUES (conv_uuid, auth.uid(), 'online', CASE WHEN is_typing THEN now() + interval '6 seconds' END, now(), now())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET typing_until = CASE WHEN is_typing THEN now() + interval '6 seconds' END,
                last_heartbeat=now(), updated_at=now()
  RETURNING *;
END; $$;

-- record_last_message(conv_uuid) -> SETOF ph_presence
CREATE OR REPLACE FUNCTION public.record_last_message(conv_uuid uuid)
 RETURNS SETOF public.ph_presence LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.ph_presence (conversation_id, user_id, status, last_message_at, typing_until, last_heartbeat, updated_at)
  VALUES (conv_uuid, auth.uid(), 'online', now(), NULL, now(), now())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET last_message_at=now(), typing_until=NULL, last_heartbeat=now(), updated_at=now()
  RETURNING *;
END; $$;

-- get_conversation_presence(conv_uuid) -> TABLE(...) matching usePresence's row map
CREATE OR REPLACE FUNCTION public.get_conversation_presence(conv_uuid uuid)
 RETURNS TABLE (id uuid, user_id uuid, user_name text, user_avatar text, status text,
                is_typing boolean, last_message_at timestamptz, last_seen_text text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.chat_is_member(conv_uuid, auth.uid()) THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.id, p.user_id, pr.full_name, pr.avatar_url,
         CASE WHEN p.last_heartbeat > now() - interval '60 seconds' THEN 'online' ELSE 'offline' END,
         (p.typing_until IS NOT NULL AND p.typing_until > now()),
         p.last_message_at,
         CASE WHEN p.last_heartbeat > now() - interval '60 seconds' THEN NULL
              ELSE 'last seen ' || to_char(p.last_heartbeat, 'Mon DD, HH24:MI') END
  FROM public.ph_presence p JOIN public.profiles pr ON pr.id = p.user_id
  WHERE p.conversation_id = conv_uuid;
END; $$;

-- user_status_upsert(p_emoji, p_message, p_expires_at) -> SETOF ph_user_status
CREATE OR REPLACE FUNCTION public.user_status_upsert(p_emoji text, p_message text, p_expires_at timestamptz DEFAULT NULL)
 RETURNS SETOF public.ph_user_status LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.ph_user_status (user_id, emoji, message, expires_at, updated_at)
  VALUES (auth.uid(), p_emoji, p_message, p_expires_at, now())
  ON CONFLICT (user_id) DO UPDATE
    SET emoji=excluded.emoji, message=excluded.message, expires_at=excluded.expires_at, updated_at=now()
  RETURNING *;
$$;

-- user_status_clear() -> SETOF ph_user_status
CREATE OR REPLACE FUNCTION public.user_status_clear()
 RETURNS SETOF public.ph_user_status LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.ph_user_status (user_id, emoji, message, expires_at, updated_at)
  VALUES (auth.uid(), '🟢', '', NULL, now())
  ON CONFLICT (user_id) DO UPDATE SET emoji='🟢', message='', expires_at=NULL, updated_at=now()
  RETURNING *;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_presence(uuid,numeric), public.set_typing(uuid,boolean),
  public.record_last_message(uuid), public.get_conversation_presence(uuid),
  public.user_status_upsert(text,text,timestamptz), public.user_status_clear() TO anon, authenticated, service_role;

-- ── FIX 1: realtime publication (messages, reactions, presence, status) ───────
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.chat_messages, public.chat_message_reactions, public.ph_presence, public.ph_user_status;
ALTER TABLE public.chat_messages          REPLICA IDENTITY FULL;
ALTER TABLE public.chat_message_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.ph_presence            REPLICA IDENTITY FULL;
ALTER TABLE public.ph_user_status         REPLICA IDENTITY FULL;
