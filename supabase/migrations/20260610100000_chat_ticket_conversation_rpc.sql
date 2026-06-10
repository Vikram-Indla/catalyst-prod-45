-- =====================================================================
-- Catalyst Chat Phase 2 — ticket-centric chat
-- =====================================================================
-- NOTE: the find-or-create ticket conversation RPC already exists as
-- public.chat_get_or_create_ticket_thread (20260608000100_chat_phase1_rpcs.sql)
-- and is reused by the Discuss CTA — no new RPC here.
--
-- This migration adds chat_message_issue_refs: server-side extraction of
-- ticket keys mentioned in chat messages, powering "search by ticket key".
-- =====================================================================

-- 1) Refs table — one row per (message, mentioned issue key).
CREATE TABLE IF NOT EXISTS public.chat_message_issue_refs (
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  issue_key  text NOT NULL,
  PRIMARY KEY (message_id, issue_key)
);

CREATE INDEX IF NOT EXISTS chat_message_issue_refs_issue_key_idx
  ON public.chat_message_issue_refs (issue_key);

-- 2) RLS — non-PII anchor data (matches ph_comments precedent, 2026-05-29).
--    Message visibility itself stays gated by chat_messages RLS when joined.
ALTER TABLE public.chat_message_issue_refs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_message_issue_refs_select ON public.chat_message_issue_refs;
CREATE POLICY chat_message_issue_refs_select
  ON public.chat_message_issue_refs
  FOR SELECT TO authenticated
  USING (true);

-- Writes happen only via the SECURITY DEFINER trigger function — no
-- INSERT/UPDATE/DELETE policies for client roles.

-- 3) Trigger — extract keys on insert / body edit. Only keys that exist in
--    ph_issues are stored (unknown keys are noise, not refs).
CREATE OR REPLACE FUNCTION public.chat_extract_issue_refs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  DELETE FROM public.chat_message_issue_refs WHERE message_id = NEW.id;

  INSERT INTO public.chat_message_issue_refs (message_id, issue_key)
  SELECT DISTINCT NEW.id, k.key
    FROM (
      SELECT (regexp_matches(COALESCE(NEW.body_text, ''),
                             '\m[A-Z][A-Z0-9]{1,9}-\d+\M', 'g'))[1] AS key
    ) k
    JOIN public.ph_issues i ON i.issue_key = k.key
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS chat_messages_extract_issue_refs ON public.chat_messages;
CREATE TRIGGER chat_messages_extract_issue_refs
  AFTER INSERT OR UPDATE OF body_text ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.chat_extract_issue_refs();

-- 4) Backfill existing messages.
INSERT INTO public.chat_message_issue_refs (message_id, issue_key)
SELECT DISTINCT m.id, k.key
  FROM public.chat_messages m
  CROSS JOIN LATERAL (
    SELECT (regexp_matches(COALESCE(m.body_text, ''),
                           '\m[A-Z][A-Z0-9]{1,9}-\d+\M', 'g'))[1] AS key
  ) k
  JOIN public.ph_issues i ON i.issue_key = k.key
ON CONFLICT DO NOTHING;
