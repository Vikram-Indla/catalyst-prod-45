/**
 * useConversations — lists the caller's chat conversations with computed unread
 * counts. Joins chat_conversations ← chat_conversation_members (the caller's
 * membership) and counts chat_messages newer than the member's last_read_at.
 *
 * Defensive: the chat_* tables may not exist yet at runtime. Any
 * missing-table / error response yields an empty list so the UI shows an empty
 * state rather than crashing.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ChatConversation, ChatConversationKind } from '@/types/chat';

// chat_* tables are created in parallel and are not in the generated Database
// types yet — cast to bypass typed-table inference.
const db = supabase as unknown as {
  from: (table: string) => any;
};

interface MemberRow {
  conversation_id: string;
  last_read_at: string | null;
  chat_conversations: ConversationRow | ConversationRow[] | null;
}

interface ConversationRow {
  id: string;
  kind: ChatConversationKind | null;
  ticket_key: string | null;
  project_key: string | null;
  title: string | null;
  is_archived: boolean | null;
  last_message_at: string | null;
  last_message_preview: string | null;
}

function pickConversation(
  row: ConversationRow | ConversationRow[] | null,
): ConversationRow | null {
  if (!row) return null;
  return Array.isArray(row) ? row[0] ?? null : row;
}

interface DmMemberRow {
  conversation_id: string;
  user_id: string;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
}

function pickProfileName(
  p: DmMemberRow['profiles'],
): string | null {
  if (!p) return null;
  const row = Array.isArray(p) ? p[0] ?? null : p;
  return row?.full_name ?? null;
}

/**
 * For DM conversations, derive a display title from the OTHER member's profile
 * name (DMs are stored with title=null). Batched: one query across all dm ids,
 * excluding the current user, mapping the first other member's full_name.
 */
async function fetchDmTitles(
  dmIds: string[],
  userId: string,
): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  if (dmIds.length === 0) return titles;
  try {
    const { data, error } = await db
      .from('chat_conversation_members')
      .select('conversation_id, user_id, profiles:user_id ( full_name )')
      .in('conversation_id', dmIds)
      .neq('user_id', userId);
    if (error || !data) return titles;
    for (const m of data as DmMemberRow[]) {
      if (titles.has(m.conversation_id)) continue; // first other member wins
      const name = pickProfileName(m.profiles);
      if (name) titles.set(m.conversation_id, name);
    }
  } catch {
    // leave empty — DMs fall back to their stored title
  }
  return titles;
}

async function fetchConversations(userId: string): Promise<ChatConversation[]> {
  try {
    const { data: members, error } = await db
      .from('chat_conversation_members')
      .select(
        `conversation_id, last_read_at,
         chat_conversations:conversation_id (
           id, kind, ticket_key, project_key, title, is_archived,
           last_message_at, last_message_preview
         )`,
      )
      .eq('user_id', userId);

    if (error || !members) return [];

    const rows = (members as MemberRow[])
      .map((m) => ({ member: m, conv: pickConversation(m.chat_conversations) }))
      .filter((x): x is { member: MemberRow; conv: ConversationRow } => !!x.conv);

    const conversations = await Promise.all(
      rows.map(async ({ member, conv }) => {
        let unreadCount = 0;
        try {
          let q = db
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .is('deleted_at', null)
            .neq('author_id', userId);
          if (member.last_read_at) q = q.gt('created_at', member.last_read_at);
          const { count, error: cErr } = await q;
          if (!cErr && typeof count === 'number') unreadCount = count;
        } catch {
          unreadCount = 0;
        }

        const mapped: ChatConversation = {
          id: conv.id,
          kind: (conv.kind ?? 'channel') as ChatConversationKind,
          ticketKey: conv.ticket_key ?? null,
          projectKey: conv.project_key ?? null,
          title: conv.title ?? '',
          isArchived: !!conv.is_archived,
          lastMessageAt: conv.last_message_at ?? null,
          lastMessagePreview: conv.last_message_preview ?? null,
          unreadCount,
        };
        return mapped;
      }),
    );

    // Resolve DM display titles from the other member's profile name (DMs are
    // stored with title=null and otherwise render blank).
    const dmIds = conversations.filter((c) => c.kind === 'dm').map((c) => c.id);
    if (dmIds.length > 0) {
      const dmTitles = await fetchDmTitles(dmIds, userId);
      for (const c of conversations) {
        if (c.kind === 'dm' && !c.title) {
          c.title = dmTitles.get(c.id) ?? c.title;
        }
      }
    }

    conversations.sort((a, b) => {
      const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
      const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
      return tb - ta;
    });

    return conversations;
  } catch {
    return [];
  }
}

export function useConversations(): {
  conversations: ChatConversation[];
  isLoading: boolean;
} {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ['chat', 'conversations', userId],
    queryFn: () => fetchConversations(userId as string),
    enabled: !!userId,
  });

  return { conversations: data ?? [], isLoading: !!userId && isLoading };
}
