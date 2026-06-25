-- Chat huddle (audio-only, 2-person) — durable state for the green active-line,
-- join affordance, and cross-route persistence. Signaling itself is ephemeral
-- (Supabase broadcast) and is NOT stored here.

-- Dependency guarantee: chat_is_member is required by the RLS policies below.
-- It exists on prod but was ABSENT on staging as of 2026-06-25. CREATE OR
-- REPLACE is idempotent and identical to the canonical param-shadowing-fixed
-- definition (qualified params avoid the column-shadowing always-true bug), so
-- re-applying on an env that already has it is a no-op.
CREATE OR REPLACE FUNCTION public.chat_is_member(convo_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_conversation_members m
    WHERE m.conversation_id = chat_is_member.convo_id
      AND m.user_id = chat_is_member.user_id
  );
$function$;

CREATE TABLE IF NOT EXISTS public.chat_huddles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  started_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

-- At most one live huddle per conversation.
CREATE UNIQUE INDEX IF NOT EXISTS chat_huddles_one_active_per_conv
  ON public.chat_huddles (conversation_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS chat_huddles_conversation_idx
  ON public.chat_huddles (conversation_id);

CREATE TABLE IF NOT EXISTS public.chat_huddle_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  huddle_id uuid NOT NULL REFERENCES public.chat_huddles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  is_connected boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS chat_huddle_participants_huddle_idx
  ON public.chat_huddle_participants (huddle_id);

ALTER TABLE public.chat_huddles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_huddle_participants ENABLE ROW LEVEL SECURITY;

-- chat_huddles: members of the conversation can read; members can start/end.
CREATE POLICY chat_huddles_select ON public.chat_huddles
  FOR SELECT TO authenticated
  USING (public.chat_is_member(conversation_id, auth.uid()));

CREATE POLICY chat_huddles_insert ON public.chat_huddles
  FOR INSERT TO authenticated
  WITH CHECK (public.chat_is_member(conversation_id, auth.uid()) AND started_by = auth.uid());

CREATE POLICY chat_huddles_update ON public.chat_huddles
  FOR UPDATE TO authenticated
  USING (public.chat_is_member(conversation_id, auth.uid()))
  WITH CHECK (public.chat_is_member(conversation_id, auth.uid()));

-- participants: visible to members of the parent conversation; a user writes
-- only their own participant row (PostgREST v12 INSERT+RETURNING short-circuit).
CREATE POLICY chat_huddle_participants_select ON public.chat_huddle_participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_huddles h
      WHERE h.id = chat_huddle_participants.huddle_id
        AND public.chat_is_member(h.conversation_id, auth.uid())
    )
  );

CREATE POLICY chat_huddle_participants_insert ON public.chat_huddle_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_huddles h
      WHERE h.id = chat_huddle_participants.huddle_id
        AND public.chat_is_member(h.conversation_id, auth.uid())
    )
  );

CREATE POLICY chat_huddle_participants_update ON public.chat_huddle_participants
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Realtime: clients subscribe to chat_huddles changes for the green line.
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_huddles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_huddle_participants;
