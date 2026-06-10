/**
 * useTicketRefSearch — "conversations mentioning KEY" lookup for the chat
 * message search panel. Queries chat_message_issue_refs (server-extracted
 * by the chat_extract_issue_refs trigger) joined to messages+conversations,
 * grouped client-side by conversation. RLS on chat_messages keeps results
 * scoped to conversations the caller can see.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isFullTicketKey } from '@/lib/chat/ticket-refs';

export { isFullTicketKey };

export interface TicketRefConversation {
  conversationId: string;
  title: string;
  kind: string;
  matchCount: number;
  lastMessageAt: string;
  lastSnippet: string;
}

export function useTicketRefSearch(query: string) {
  const key = query.trim().toUpperCase();
  const enabled = isFullTicketKey(query);
  return useQuery<TicketRefConversation[]>({
    queryKey: ['chat', 'ticket-ref-search', key],
    enabled,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('chat_message_issue_refs')
        .select(
          'message_id, issue_key, chat_messages!inner(id, conversation_id, body_text, created_at, deleted_at, chat_conversations!inner(id, title, kind))',
        )
        .eq('issue_key', key)
        .limit(200);
      if (error) throw error;

      const byConv = new Map<string, TicketRefConversation>();
      (data ?? []).forEach((row: any) => {
        const msg = row.chat_messages;
        if (!msg || msg.deleted_at) return;
        const conv = msg.chat_conversations;
        if (!conv) return;
        const existing = byConv.get(conv.id);
        if (existing) {
          existing.matchCount += 1;
          if (msg.created_at > existing.lastMessageAt) {
            existing.lastMessageAt = msg.created_at;
            existing.lastSnippet = msg.body_text ?? '';
          }
        } else {
          byConv.set(conv.id, {
            conversationId: conv.id,
            title: conv.title || 'Untitled conversation',
            kind: conv.kind,
            matchCount: 1,
            lastMessageAt: msg.created_at,
            lastSnippet: msg.body_text ?? '',
          });
        }
      });
      return Array.from(byConv.values()).sort((a, b) =>
        b.lastMessageAt.localeCompare(a.lastMessageAt),
      );
    },
  });
}
