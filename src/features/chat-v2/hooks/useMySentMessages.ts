/**
 * useMySentMessages — every message the current user has authored
 * that has been delivered (sent immediately OR scheduled-then-flipped
 * by the pg_cron job).
 *
 * Cursor-paginated, 50 per page. Each page fetches one extra row so
 * the caller knows whether more pages exist. The flat list is grouped
 * by day in the render layer.
 */
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const db = supabase as unknown as { from: (t: string) => any };
const PAGE_SIZE = 50;

export interface SentMessage {
  id: string;
  conversationId: string;
  conversationTitle: string;
  conversationKind: string;
  conversationIsPrivate: boolean;
  projectKey: string | null;
  parentId: string | null;
  bodyMd: string;
  bodyPreview: string;
  deliveredAt: string;
}

interface RawRow {
  id: string;
  conversation_id: string;
  body_text: string | null;
  delivered_at: string;
  parent_id: string | null;
  chat_conversations: {
    id: string;
    kind: string;
    title: string;
    is_private: boolean | null;
    project_key: string | null;
  } | null;
}

interface PageResult {
  rows: SentMessage[];
  nextCursor: string | null;
}

export function useMySentMessages() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useInfiniteQuery<PageResult>({
    queryKey: ['chat-v2', 'my-sent', userId],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      if (!userId) return { rows: [], nextCursor: null };
      const cursor = (pageParam ?? null) as string | null;
      let q = db
        .from('chat_messages')
        .select(
          'id, conversation_id, body_text, delivered_at, parent_id, chat_conversations:chat_conversations(id, kind, title, is_private, project_key)',
        )
        .eq('author_id', userId)
        .not('delivered_at', 'is', null)
        .order('delivered_at', { ascending: false })
        .limit(PAGE_SIZE + 1);
      if (cursor) q = q.lt('delivered_at', cursor);
      const { data, error } = await q;
      if (error) {
        console.warn('[chat-v2] my-sent fetch failed', error);
        return { rows: [], nextCursor: null };
      }
      const raw = (data ?? []) as RawRow[];
      const hasMore = raw.length > PAGE_SIZE;
      const slice = hasMore ? raw.slice(0, PAGE_SIZE) : raw;
      const rows = slice
        .filter(r => r.chat_conversations !== null)
        .map<SentMessage>(r => ({
          id: r.id,
          conversationId: r.conversation_id,
          conversationTitle: r.chat_conversations!.title,
          conversationKind: r.chat_conversations!.kind,
          conversationIsPrivate: r.chat_conversations!.is_private ?? false,
          projectKey: r.chat_conversations!.project_key,
          parentId: r.parent_id,
          bodyMd: r.body_text ?? '',
          bodyPreview: makePreview(r.body_text ?? ''),
          deliveredAt: r.delivered_at,
        }));
      const nextCursor = hasMore ? slice[slice.length - 1].deliveredAt : null;
      return { rows, nextCursor };
    },
    getNextPageParam: last => last.nextCursor,
    enabled: !!userId,
    staleTime: 30_000,
  });
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
