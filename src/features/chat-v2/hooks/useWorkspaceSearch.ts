/**
 * useWorkspaceSearch — text search across all chat_messages the current
 * user can see.
 *
 * Trims the query, runs an ilike against body_text, and joins each match
 * back to its conversation + author so the results panel can render rows
 * the same way as the activity feed.
 *
 * Defensive: any single failure resolves to an empty set; the panel still
 * renders. Caps at 60 results to keep latency bounded.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as unknown as { from: (t: string) => any };

export interface WorkspaceSearchHit {
  id: string;
  conversationId: string;
  conversationTitle: string;
  authorId: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
  /** Set when the hit is a thread reply — id of the parent message. */
  parentId: string | null;
}

const MAX_RESULTS = 60;

export function useWorkspaceSearch(query: string): {
  hits: WorkspaceSearchHit[];
  isLoading: boolean;
} {
  const trimmed = query.trim();
  const { data, isLoading } = useQuery({
    queryKey: ['chat-v2', 'workspace-search', trimmed],
    enabled: trimmed.length > 0,
    queryFn: async (): Promise<WorkspaceSearchHit[]> => {
      const pattern = `%${trimmed.replace(/[%_]/g, m => `\\${m}`)}%`;
      // Pull matching messages first. RLS filters to conversations the user
      // can read.
      const { data: msgs, error } = await db
        .from('chat_messages')
        .select('id, conversation_id, parent_id, author_id, body_text, created_at')
        .is('deleted_at', null)
        .ilike('body_text', pattern)
        .order('created_at', { ascending: false })
        .limit(MAX_RESULTS);
      if (error || !msgs) return [];
      const rows = msgs as Array<{
        id: string;
        conversation_id: string;
        parent_id: string | null;
        author_id: string | null;
        body_text: string;
        created_at: string;
      }>;
      if (rows.length === 0) return [];

      const convIds = Array.from(new Set(rows.map(r => r.conversation_id)));
      const authorIds = Array.from(
        new Set(rows.map(r => r.author_id).filter((x): x is string => !!x)),
      );

      const [convsRes, profilesRes] = await Promise.all([
        db.from('chat_conversations').select('id, title, kind').in('id', convIds),
        authorIds.length === 0
          ? Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; avatar_url: string | null }> })
          : db.from('profiles').select('id, full_name, avatar_url').in('id', authorIds),
      ]);

      const convs = new Map<string, { title: string; kind: string }>();
      for (const c of (convsRes.data ?? []) as Array<{ id: string; title: string | null; kind: string }>) {
        convs.set(c.id, { title: c.title ?? 'Conversation', kind: c.kind });
      }
      const profiles = new Map<string, { name: string; avatar: string | null }>();
      for (const p of (profilesRes.data ?? []) as Array<{ id: string; full_name: string | null; avatar_url: string | null }>) {
        profiles.set(p.id, { name: p.full_name ?? 'Someone', avatar: p.avatar_url });
      }

      return rows.map<WorkspaceSearchHit>(r => {
        const conv = convs.get(r.conversation_id);
        const prof = r.author_id ? profiles.get(r.author_id) : undefined;
        return {
          id: r.id,
          conversationId: r.conversation_id,
          conversationTitle: conv?.title ?? 'Conversation',
          authorId: r.author_id,
          authorName: prof?.name ?? 'Someone',
          authorAvatarUrl: prof?.avatar ?? null,
          body: r.body_text,
          createdAt: r.created_at,
          parentId: r.parent_id ?? null,
        };
      });
    },
    staleTime: 30_000,
  });

  return { hits: data ?? [], isLoading };
}
