/**
 * useMyScheduledMessages — pending scheduled-send list for the user.
 *
 * One query backs both the Scheduled tab list and the per-conversation
 * banner above the composer. Pending = scheduled_for IS NOT NULL AND
 * delivered_at IS NULL AND author_id = me.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const db = supabase as unknown as { from: (t: string) => any };

export interface ScheduledMessage {
  id: string;
  conversationId: string;
  conversationTitle: string;
  conversationKind: string;
  conversationIsPrivate: boolean;
  bodyMd: string;
  bodyPreview: string;
  scheduledFor: string;
  parentId: string | null;
}

interface RawRow {
  id: string;
  conversation_id: string;
  body_text: string | null;
  scheduled_for: string;
  parent_id: string | null;
  chat_conversations: {
    id: string;
    kind: string;
    title: string;
    is_private: boolean | null;
  } | null;
}

export function useMyScheduledMessages() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const query = useQuery<ScheduledMessage[]>({
    queryKey: ['chat-v2', 'my-scheduled', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await db
        .from('chat_messages')
        .select(
          'id, conversation_id, body_text, scheduled_for, parent_id, chat_conversations:chat_conversations(id, kind, title, is_private)',
        )
        .eq('author_id', userId)
        .not('scheduled_for', 'is', null)
        .is('delivered_at', null)
        .order('scheduled_for', { ascending: true });
      if (error) {
        console.warn('[chat-v2] my-scheduled fetch failed', error);
        return [];
      }
      const rows = (data ?? []) as RawRow[];
      return rows
        .filter(r => r.chat_conversations !== null)
        .map<ScheduledMessage>(r => ({
          id: r.id,
          conversationId: r.conversation_id,
          conversationTitle: r.chat_conversations!.title,
          conversationKind: r.chat_conversations!.kind,
          conversationIsPrivate: r.chat_conversations!.is_private ?? false,
          bodyMd: r.body_text ?? '',
          bodyPreview: makePreview(r.body_text ?? ''),
          scheduledFor: r.scheduled_for,
          parentId: r.parent_id,
        }));
    },
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  return query;
}

/**
 * Map conversation id -> { count, nextSendAt } for the composer banner.
 * Backed by the same query as the list.
 */
export function useMyScheduledCountByConversation() {
  const { data: scheduled = [] } = useMyScheduledMessages();
  return useMemo(() => {
    const map = new Map<string, { count: number; nextSendAt: string }>();
    for (const s of scheduled) {
      const existing = map.get(s.conversationId);
      if (!existing) {
        map.set(s.conversationId, { count: 1, nextSendAt: s.scheduledFor });
      } else {
        existing.count += 1;
        if (s.scheduledFor < existing.nextSendAt) existing.nextSendAt = s.scheduledFor;
      }
    }
    return map;
  }, [scheduled]);
}

function makePreview(md: string): string {
  const flat = md
    .replace(/[*_`~>#]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (flat.length <= 120) return flat;
  return flat.slice(0, 117) + '…';
}
