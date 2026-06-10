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

    // Batch-enrich: project names from ph_jira_projects, issue types from ph_issues.
    const projectKeys = [...new Set(rows.map(r => r.conv.project_key).filter(Boolean))] as string[];
    const ticketKeys = [...new Set(rows.filter(r => r.conv.kind === 'ticket').map(r => r.conv.ticket_key).filter(Boolean))] as string[];

    const projectNameMap: Record<string, string> = {};
    const ticketTypeMap: Record<string, string> = {};

    await Promise.all([
      projectKeys.length > 0
        ? supabase
            .from('ph_jira_projects')
            .select('project_key, name')
            .in('project_key', projectKeys)
            .then(({ data }) => {
              (data ?? []).forEach((p: { project_key: string; name: string }) => {
                if (p.project_key) projectNameMap[p.project_key] = p.name;
              });
            })
        : Promise.resolve(),
      ticketKeys.length > 0
        ? supabase
            .from('ph_issues')
            .select('issue_key, issue_type')
            .in('issue_key', ticketKeys)
            .then(({ data }) => {
              (data ?? []).forEach((i: { issue_key: string; issue_type: string }) => {
                if (i.issue_key) ticketTypeMap[i.issue_key] = i.issue_type;
              });
            })
        : Promise.resolve(),
    ]);

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
          ticketType: conv.ticket_key ? (ticketTypeMap[conv.ticket_key] ?? null) : null,
          projectKey: conv.project_key ?? null,
          projectName: conv.project_key ? (projectNameMap[conv.project_key] ?? null) : null,
          title: conv.kind === 'channel' && conv.project_key
            ? (projectNameMap[conv.project_key] ?? conv.title ?? '')
            : (conv.title ?? ''),
          isArchived: !!conv.is_archived,
          lastMessageAt: conv.last_message_at ?? null,
          lastMessagePreview: conv.last_message_preview ?? null,
          unreadCount,
        };
        return mapped;
      }),
    );

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
