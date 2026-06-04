/**
 * useChatMessageActions — reaction toggle, edit, and soft-delete mutations
 * for chat_messages, scoped to a single conversation.
 *
 * Reaction toggle mirrors useCommentReactions (one row per
 * (message_id, user_id, emoji) in chat_message_reactions): delete if the row
 * exists, insert otherwise.
 *
 * Edit accepts the ADF JSON string emitted by the catalyst-ds CommentEditor:
 * if it parses to a valid ADF doc we store body_adf + a plain-text mirror in
 * body_text; otherwise we treat the content as plain text.
 *
 * Delete is a SOFT delete (deleted_at = now()) — useMessages filters these out.
 *
 * All mutations invalidate the same query key useMessages uses so the
 * CommentThread re-renders with fresh data.
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { adfToPlainText } from '@/components/shared/rich-text/atlaskit/adfHelpers';

const db = supabase as unknown as { from: (table: string) => any };

function parseAdf(content: string): { type: string } | null {
  const v = content.trim();
  if (!v.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(v);
    return parsed && parsed.type === 'doc' ? parsed : null;
  } catch {
    return null;
  }
}

export function useChatMessageActions(conversationId: string | null): {
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
} {
  const { user } = useAuth();
  const myId = user?.id ?? null;
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
  }, [queryClient, conversationId]);

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!myId) return;
      const { data: existing } = await db
        .from('chat_message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', myId)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing?.id) {
        await db.from('chat_message_reactions').delete().eq('id', existing.id);
      } else {
        await db
          .from('chat_message_reactions')
          .insert({ message_id: messageId, user_id: myId, emoji });
      }
      invalidate();
    },
    [myId, invalidate],
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      const adf = parseAdf(content);
      const update = adf
        ? { body_adf: adf, body_text: adfToPlainText(adf), edited_at: new Date().toISOString() }
        : { body_text: content, body_adf: null, edited_at: new Date().toISOString() };

      await db.from('chat_messages').update(update).eq('id', messageId);
      invalidate();
    },
    [invalidate],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      await db
        .from('chat_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId);
      invalidate();
    },
    [invalidate],
  );

  return { toggleReaction, editMessage, deleteMessage };
}
