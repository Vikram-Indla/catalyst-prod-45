-- =====================================================================
-- Catalyst Chat — finishing migration (idempotent)
--   1) Allow 'dm' as a conversation kind
--   2) Mention -> notification trigger on chat_messages (reads body_adf)
--   3) Un-archive chat conversation when its ticket is reopened
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) ALLOW DM CONVERSATIONS
--    Re-add the kind CHECK constraint to include 'dm'.
-- ---------------------------------------------------------------------
ALTER TABLE public.chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_kind_check;

ALTER TABLE public.chat_conversations
  ADD CONSTRAINT chat_conversations_kind_check
  CHECK (kind IN ('ticket', 'channel', 'dm'));

-- ---------------------------------------------------------------------
-- 2) MENTION -> NOTIFICATION
-- ---------------------------------------------------------------------

-- Helper: recursively walk an ADF doc and collect every mention node's
-- attrs.id as a uuid[]. Tolerant: returns empty array on null / non-doc.
CREATE OR REPLACE FUNCTION public.chat_extract_mention_ids(adf jsonb)
RETURNS uuid[]
LANGUAGE sql
IMMUTABLE
AS $fn$
  WITH RECURSIVE nodes AS (
    -- seed with the doc itself
    SELECT adf AS node
    WHERE adf IS NOT NULL AND jsonb_typeof(adf) = 'object'
    UNION ALL
    -- descend into every element of any "content" array
    SELECT child.value AS node
      FROM nodes n
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(n.node -> 'content') = 'array'
             THEN n.node -> 'content'
             ELSE '[]'::jsonb
        END
      ) AS child(value)
  )
  SELECT COALESCE(
    array_agg(DISTINCT (node -> 'attrs' ->> 'id')::uuid),
    ARRAY[]::uuid[]
  )
  FROM nodes
  WHERE node ->> 'type' = 'mention'
    AND (node -> 'attrs' ->> 'id') IS NOT NULL;
$fn$;

COMMENT ON FUNCTION public.chat_extract_mention_ids(jsonb)
  IS 'Recursively extracts mention attrs.id (uuid[]) from an ADF document. Empty array on null/non-doc.';

-- Trigger: on new chat message, notify each mentioned user (except author).
-- Wrapped in EXCEPTION so a parse issue can never block the message insert.
CREATE OR REPLACE FUNCTION public.chat_notify_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  mention_id uuid;
BEGIN
  IF NEW.body_adf IS NOT NULL THEN
    BEGIN
      FOR mention_id IN
        SELECT DISTINCT m
          FROM unnest(public.chat_extract_mention_ids(NEW.body_adf)) AS m
         WHERE m IS DISTINCT FROM NEW.author_id
      LOOP
        INSERT INTO notifications (
          recipient_user_id, actor_user_id, notification_type,
          entity_id, entity_type,
          status, tab, metadata, created_at
        ) VALUES (
          mention_id, NEW.author_id, 'mentioned_in_chat',
          NEW.conversation_id::text, 'chat_conversation',
          'unread', 'direct',
          jsonb_build_object(
            'message_preview', left(coalesce(NEW.body_text, ''), 200),
            'conversation_id', NEW.conversation_id,
            'message_id', NEW.id
          ),
          now()
        );
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      -- never block message insert on a mention-parse / notify failure
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.chat_notify_mentions()
  IS 'AFTER INSERT on chat_messages: creates a mentioned_in_chat notification per mentioned user (excluding author).';

DROP TRIGGER IF EXISTS chat_messages_notify_mentions ON public.chat_messages;
CREATE TRIGGER chat_messages_notify_mentions
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_notify_mentions();

-- ---------------------------------------------------------------------
-- 3) UN-ARCHIVE ON TICKET REOPEN
--    Inverse of chat_archive_done_ticket: when a ticket leaves the
--    'done' category, rehydrate its messages from cold storage and
--    un-archive the conversation.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_unarchive_reopened_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF OLD.status_category = 'done'
     AND NEW.status_category IS DISTINCT FROM 'done' THEN

    -- (a) rehydrate messages back into live storage
    INSERT INTO public.chat_messages (
      id, conversation_id, parent_id, author_id, body_text, body_adf,
      edited_at, deleted_at, created_at
    )
    SELECT a.id, a.conversation_id, a.parent_id, a.author_id, a.body_text, a.body_adf,
           a.edited_at, a.deleted_at, a.created_at
      FROM public.chat_messages_archive a
      JOIN public.chat_conversations c ON c.id = a.conversation_id
     WHERE c.kind = 'ticket'
       AND c.ticket_key = NEW.issue_key
    ON CONFLICT (id) DO NOTHING;

    DELETE FROM public.chat_messages_archive a
     USING public.chat_conversations c
     WHERE a.conversation_id = c.id
       AND c.kind = 'ticket'
       AND c.ticket_key = NEW.issue_key;

    -- (b) un-archive the conversation
    UPDATE public.chat_conversations
       SET is_archived = false,
           archived_at = NULL,
           updated_at  = now()
     WHERE kind = 'ticket'
       AND ticket_key = NEW.issue_key;
  END IF;
  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.chat_unarchive_reopened_ticket()
  IS 'AFTER UPDATE OF status_category on ph_issues: rehydrates archived chat messages and un-archives the ticket conversation when a ticket is reopened (leaves done).';

DROP TRIGGER IF EXISTS ph_issues_chat_unarchive_on_reopen ON public.ph_issues;
CREATE TRIGGER ph_issues_chat_unarchive_on_reopen
  AFTER UPDATE OF status_category ON public.ph_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_unarchive_reopened_ticket();
