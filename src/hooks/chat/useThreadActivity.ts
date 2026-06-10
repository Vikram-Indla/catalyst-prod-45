/**
 * useThreadActivity — thread replies in conversations the user is a member of.
 * Returns messages where parent_id IS NOT NULL, authored by others, in the
 * user's conversations. Used by the Threads tab of ChatMentionsPanel.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const db = supabase as unknown as { from: (t: string) => any };

export interface ThreadActivityItem {
  id: string;
  conversationId: string;
  conversationTitle: string | null;
  parentId: string;
  bodyText: string;
  authorName: string;
  createdAt: string;
}

async function fetchThreadActivity(userId: string): Promise<ThreadActivityItem[]> {
  try {
    // Get conversations the user belongs to
    const { data: memberRows, error: mErr } = await db
      .from('chat_conversation_members')
      .select('conversation_id')
      .eq('user_id', userId);

    if (mErr || !memberRows?.length) return [];

    const convIds = (memberRows as { conversation_id: string }[]).map((r) => r.conversation_id);

    // Get recent thread replies in those conversations (not authored by the user)
    const { data: msgs, error: msgErr } = await db
      .from('chat_messages')
      .select(`
        id, conversation_id, parent_id, body_text, author_id, created_at,
        chat_conversations:conversation_id(title)
      `)
      .in('conversation_id', convIds)
      .not('parent_id', 'is', null)
      .is('deleted_at', null)
      .neq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (msgErr || !msgs) return [];

    // Batch-resolve author names from profiles
    const authorIds = [...new Set((msgs as any[]).map((m) => m.author_id))];
    const profileMap: Record<string, string> = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', authorIds);
      (profiles ?? []).forEach((p: any) => {
        if (p.id) profileMap[p.id] = p.full_name ?? 'Unknown';
      });
    }

    return (msgs as any[]).map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      conversationTitle:
        (Array.isArray(m.chat_conversations)
          ? m.chat_conversations[0]?.title
          : m.chat_conversations?.title) ?? null,
      parentId: m.parent_id,
      bodyText: m.body_text ?? '',
      authorName: profileMap[m.author_id] ?? 'Someone',
      createdAt: m.created_at,
    }));
  } catch {
    return [];
  }
}

export function useThreadActivity() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: ['chat', 'thread-activity', userId],
    queryFn: () => fetchThreadActivity(userId as string),
    enabled: !!userId,
  });
}
