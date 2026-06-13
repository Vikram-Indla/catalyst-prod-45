-- chat_conversations.kind CHECK was missing 'custom_channel'.
-- TypeScript ChatConversationKind includes it; inserting one would have hit a constraint violation.
ALTER TABLE public.chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_kind_check;

ALTER TABLE public.chat_conversations
  ADD CONSTRAINT chat_conversations_kind_check
  CHECK (kind IN ('ticket','channel','dm','group_dm','custom_channel'));
