-- chat_pinned_messages had RLS enabled but ZERO policies → every op silently denied.
-- Member-gated via the existing SECURITY DEFINER helper chat_is_member (no self-reference recursion).
-- pinned_by defaults to auth.uid(); any member may pin/unpin (Slack semantics).
-- Applied to prod lmqwtldpfacrrlvdnmld 2026-06-14 via apply_migration; this file mirrors it for repo↔DB parity.
CREATE POLICY chat_pinned_messages_select ON chat_pinned_messages
  FOR SELECT TO authenticated
  USING (chat_is_member(conversation_id, auth.uid()));

CREATE POLICY chat_pinned_messages_insert ON chat_pinned_messages
  FOR INSERT TO authenticated
  WITH CHECK (chat_is_member(conversation_id, auth.uid()));

CREATE POLICY chat_pinned_messages_delete ON chat_pinned_messages
  FOR DELETE TO authenticated
  USING (chat_is_member(conversation_id, auth.uid()));
