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
import { useChatRealtimeAll } from '@/hooks/chat/useChatRealtimeAll';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { ChatConversation, ChatConversationKind } from '@/types/chat';

// chat_* tables are created in parallel and are not in the generated Database
// types yet — cast to bypass typed-table inference.
const db = supabase as unknown as {
  from: (table: string) => any;
};

interface MemberRow {
  conversation_id: string;
  last_read_at: string | null;
  is_pinned: boolean | null;
  is_starred: boolean | null;
  is_muted: boolean | null;
  chat_conversations: ConversationRow | ConversationRow[] | null;
}

interface ConversationRow {
  id: string;
  kind: ChatConversationKind | null;
  ticket_key: string | null;
  project_key: string | null;
  title: string | null;
  description: string | null;
  is_archived: boolean | null;
  is_private?: boolean | null;
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
  profiles:
    | { full_name: string | null; avatar_url: string | null }
    | { full_name: string | null; avatar_url: string | null }[]
    | null;
}

function pickProfile(
  p: DmMemberRow['profiles'],
): { name: string | null; avatar: string | null } | null {
  if (!p) return null;
  const row = Array.isArray(p) ? p[0] ?? null : p;
  if (!row) return null;
  return { name: row.full_name ?? null, avatar: row.avatar_url ?? null };
}

/**
 * For DM conversations, derive a display title from the OTHER member's profile
 * name (DMs are stored with title=null). Batched: one query across all dm ids,
 * excluding the current user, mapping the first other member's full_name.
 *
 * For group_dm conversations, collect ALL other members' first names into a
 * comma-separated string ("Vikram, Waseem, Yazeed"). Group DMs are stored
 * with title=null and rely on this derivation in the same way 1:1 DMs do.
 */
async function fetchDmTitles(
  convIds: string[],
  userId: string,
): Promise<{
  dmTitles: Map<string, string>;
  groupTitles: Map<string, string>;
  groupCounts: Map<string, number>;
  avatars: Map<string, string[]>;
  fullNames: Map<string, string[]>;
  memberIds: Map<string, string[]>;
}> {
  const dmTitles = new Map<string, string>();
  const groupNames = new Map<string, string[]>();
  const groupCounts = new Map<string, number>();
  const groupTitles = new Map<string, string>();
  const avatars = new Map<string, string[]>();
  const fullNames = new Map<string, string[]>();
  const memberIds = new Map<string, string[]>();
  if (convIds.length === 0) return { dmTitles, groupTitles, groupCounts, avatars, fullNames, memberIds };
  try {
    const { data, error } = await db
      .from('chat_conversation_members')
      .select('conversation_id, user_id, profiles:user_id ( full_name, avatar_url )')
      .in('conversation_id', convIds)
      .neq('user_id', userId);
    if (error || !data) return { dmTitles, groupTitles, groupCounts, avatars, fullNames, memberIds };
    for (const m of data as DmMemberRow[]) {
      // capture the member id regardless of whether a display name resolved
      const idList = memberIds.get(m.conversation_id) ?? [];
      idList.push(m.user_id);
      memberIds.set(m.conversation_id, idList);
      const p = pickProfile(m.profiles);
      const name = p?.name ?? null;
      const avatar = p?.avatar ?? null;
      if (!name) continue;
      // 1:1 DM bucket — first other member wins.
      if (!dmTitles.has(m.conversation_id)) {
        dmTitles.set(m.conversation_id, name);
      }
      // Group DM bucket — collect first names (drop everything after the
      // first space) to keep the sidebar title compact.
      const firstName = name.split(' ')[0] ?? name;
      const list = groupNames.get(m.conversation_id) ?? [];
      list.push(firstName);
      groupNames.set(m.conversation_id, list);
      // Full-name + avatar lists for the DM tab list view.
      const fnList = fullNames.get(m.conversation_id) ?? [];
      fnList.push(name);
      fullNames.set(m.conversation_id, fnList);
      const aList = avatars.get(m.conversation_id) ?? [];
      const resolvedAvatar = resolveAvatarUrl(name) ?? avatar;
      if (resolvedAvatar) aList.push(resolvedAvatar);
      avatars.set(m.conversation_id, aList);
    }
    for (const [id, names] of groupNames.entries()) {
      groupCounts.set(id, names.length);
      groupTitles.set(id, names.join(', '));
    }
  } catch {
    // leave empty — DMs fall back to their stored title
  }
  return { dmTitles, groupTitles, groupCounts, avatars, fullNames, memberIds };
}

async function fetchConversations(userId: string): Promise<ChatConversation[]> {
  try {
    const { data: members, error } = await db
      .from('chat_conversation_members')
      .select(
        `conversation_id, last_read_at, is_pinned, is_starred, is_muted,
         chat_conversations:conversation_id (
           id, kind, ticket_key, project_key, title, description, is_archived, is_private,
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
    const ticketAssigneeMap: Record<string, string> = {};

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
            .select('issue_key, issue_type, assignee_display_name')
            .in('issue_key', ticketKeys)
            .then(({ data }) => {
              (data ?? []).forEach((i: { issue_key: string; issue_type: string; assignee_display_name?: string | null }) => {
                if (i.issue_key) {
                  ticketTypeMap[i.issue_key] = i.issue_type;
                  if (i.assignee_display_name) ticketAssigneeMap[i.issue_key] = i.assignee_display_name;
                }
              });
            })
        : Promise.resolve(),
    ]);

    const conversations = rows.map(({ member, conv }) => {
      // Derive unread from already-fetched last_read_at vs last_message_at.
      // Avoids any extra network call. When last_read_at is null the conversation
      // is entirely unread (1+). When both exist compare timestamps.
      const lastMsg = conv.last_message_at ? new Date(conv.last_message_at).getTime() : 0;
      const lastRead = member.last_read_at ? new Date(member.last_read_at).getTime() : 0;
      const unreadCount = lastMsg > lastRead ? 1 : 0;
      const mapped: ChatConversation = {
        id: conv.id,
        kind: (conv.kind ?? 'channel') as ChatConversationKind,
        ticketKey: conv.ticket_key ?? null,
        ticketType: conv.ticket_key ? (ticketTypeMap[conv.ticket_key] ?? null) : null,
        assigneeName: conv.ticket_key ? (ticketAssigneeMap[conv.ticket_key] ?? null) : null,
        projectKey: conv.project_key ?? null,
        projectName: conv.project_key ? (projectNameMap[conv.project_key] ?? null) : null,
        title: conv.kind === 'channel' && conv.project_key
          ? (projectNameMap[conv.project_key] ?? conv.title ?? '')
          : (conv.title ?? ''),
        description: (conv as any).description ?? null,
        isArchived: !!conv.is_archived,
        isPrivate: !!conv.is_private,
        isPinned: !!member.is_pinned,
        isStarred: !!member.is_starred,
        isMuted: !!member.is_muted,
        lastMessageAt: conv.last_message_at ?? null,
        lastMessagePreview: conv.last_message_preview ?? null,
        unreadCount,
        lastReadAt: member.last_read_at ?? null,
      };
      return mapped;
    });

    // Resolve DM + group_dm display titles from member profile names (both
    // are stored with title=null and otherwise render blank).
    const titleIds = conversations
      .filter((c) => c.kind === 'dm' || c.kind === 'group_dm')
      .map((c) => c.id);
    if (titleIds.length > 0) {
      const { dmTitles, groupTitles, groupCounts, avatars, fullNames, memberIds } = await fetchDmTitles(titleIds, userId);
      for (const c of conversations) {
        if (c.kind === 'group_dm') {
          c.memberCount = groupCounts.get(c.id) ?? 0;
        }
        if (c.kind === 'dm' || c.kind === 'group_dm') {
          c.dmAvatarUrls = avatars.get(c.id) ?? [];
          c.dmMemberNames = fullNames.get(c.id) ?? [];
          c.dmMemberIds = memberIds.get(c.id) ?? [];
        }
        if (c.title) continue;
        if (c.kind === 'dm') {
          c.title = dmTitles.get(c.id) ?? c.title;
        } else if (c.kind === 'group_dm') {
          c.title = groupTitles.get(c.id) ?? c.title;
        }
      }
    }

    const timestampMap = new Map<string, number>();
    for (const c of conversations) {
      if (c.lastMessageAt) {
        timestampMap.set(c.id, Date.parse(c.lastMessageAt));
      }
    }
    conversations.sort((a, b) => {
      const ta = timestampMap.get(a.id) ?? 0;
      const tb = timestampMap.get(b.id) ?? 0;
      return tb - ta;
    });

    return conversations;
  } catch {
    return [];
  }
}

export function useConversations(fetchEnabled = true): {
  conversations: ChatConversation[];
  isLoading: boolean;
} {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ['chat', 'conversations', userId],
    queryFn: () => fetchConversations(userId as string),
    enabled: !!userId && fetchEnabled,
    staleTime: 30 * 1000,
  });

  // Account-wide realtime: subscribe to every (non-archived) conversation so a new
  // message lights up its unread red dot on ANY surface that lists conversations
  // (sidebar, dock, /chat) without that conversation being open. Lives here so the
  // coverage follows the list itself rather than a single mount point.
  const ids = (data ?? []).filter((c) => !c.isArchived).map((c) => c.id);
  useChatRealtimeAll(ids);

  return { conversations: data ?? [], isLoading: !!userId && fetchEnabled && isLoading };
}
