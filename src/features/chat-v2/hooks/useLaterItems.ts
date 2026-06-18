/**
 * useLaterItems — "Later" tab data layer (Slack-style Saved/Reminders).
 *
 * Source table: chat_bookmarks (extended by 20260618000000 migration).
 * - state: in_progress | archived | completed
 * - kind:  saved_message (bound to a chat_messages row)
 *          reminder      (standalone "+ Remind me to..." with reminder_text + remind_at)
 *
 * For saved_message rows, body + author come from chat_messages + profiles.
 * For reminder rows, body = reminder_text, author = self.
 */
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const db = supabase as unknown as { from: (table: string) => any; rpc: (n: string, args?: any) => any };

export type LaterState = 'in_progress' | 'archived' | 'completed';
export type LaterKind = 'saved_message' | 'reminder';

export interface LaterItem {
  id: string;
  kind: LaterKind;
  state: LaterState;
  messageId: string | null;
  conversationId: string | null;
  conversationTitle: string;
  conversationKind: 'dm' | 'group_dm' | 'channel' | 'custom';
  conversationIsPrivate: boolean;
  authorId: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  reminderText: string | null;
  remindAt: string | null;
  remindFired: boolean;   // true when kind=reminder AND remind_at <= now
  createdAt: string;
  completedAt: string | null;
  archivedAt: string | null;
}

interface RawBookmark {
  id: string;
  kind: LaterKind;
  state: LaterState;
  message_id: string | null;
  conversation_id: string | null;
  note: string | null;
  reminder_text: string | null;
  remind_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
}

interface RawMessage {
  id: string;
  conversation_id: string;
  body_text: string | null;
  author_id: string | null;
}

interface RawConversation {
  id: string;
  title: string | null;
  kind: 'dm' | 'group_dm' | 'channel' | 'custom';
  is_private: boolean | null;
}

interface RawProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export function useLaterItems() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['chat-v2', 'later', user?.id],
    enabled: !!user,
    refetchInterval: 30_000, // tick so fired reminders surface without manual refresh
    queryFn: async (): Promise<LaterItem[]> => {
      const { data: bookmarks } = await db
        .from('chat_bookmarks')
        .select('id, kind, state, message_id, conversation_id, note, reminder_text, remind_at, completed_at, archived_at, created_at')
        .order('created_at', { ascending: false });

      const list = (bookmarks ?? []) as RawBookmark[];
      if (list.length === 0) return [];

      const messageIds = Array.from(new Set(
        list.filter(b => b.message_id).map(b => b.message_id as string),
      ));
      const conversationIds = Array.from(new Set(
        list.filter(b => b.conversation_id).map(b => b.conversation_id as string),
      ));

      const [{ data: messagesRaw }, { data: conversationsRaw }] = await Promise.all([
        messageIds.length > 0
          ? db.from('chat_messages').select('id, conversation_id, body_text, author_id').in('id', messageIds)
          : Promise.resolve({ data: [] as RawMessage[] }),
        conversationIds.length > 0
          ? db.from('chat_conversations').select('id, title, kind, is_private').in('id', conversationIds)
          : Promise.resolve({ data: [] as RawConversation[] }),
      ]);

      const messages = (messagesRaw ?? []) as RawMessage[];
      const conversations = (conversationsRaw ?? []) as RawConversation[];

      const authorIds = Array.from(new Set([
        ...messages.filter(m => m.author_id).map(m => m.author_id as string),
        user?.id ?? '',
      ].filter(Boolean)));

      const { data: profilesRaw } = authorIds.length > 0
        ? await db.from('profiles').select('id, full_name, avatar_url, email').in('id', authorIds)
        : { data: [] as RawProfile[] };
      const profiles = (profilesRaw ?? []) as RawProfile[];
      const profileById = new Map(profiles.map(p => [p.id, p]));
      const msgById = new Map(messages.map(m => [m.id, m]));
      const convById = new Map(conversations.map(c => [c.id, c]));

      const now = Date.now();

      const items: LaterItem[] = list.map(b => {
        if (b.kind === 'saved_message') {
          const msg = b.message_id ? msgById.get(b.message_id) : undefined;
          const conv = b.conversation_id ? convById.get(b.conversation_id) : undefined;
          const author = msg?.author_id ? profileById.get(msg.author_id) : undefined;
          return {
            id: b.id,
            kind: 'saved_message',
            state: b.state,
            messageId: b.message_id,
            conversationId: b.conversation_id,
            conversationTitle: conv?.title ?? 'Direct Message',
            conversationKind: conv?.kind ?? 'dm',
            conversationIsPrivate: !!conv?.is_private,
            authorId: msg?.author_id ?? null,
            authorName: author?.full_name ?? author?.email ?? 'Member',
            authorAvatarUrl: author?.avatar_url ?? null,
            body: msg?.body_text ?? '',
            reminderText: null,
            remindAt: b.remind_at,
            remindFired: b.remind_at ? new Date(b.remind_at).getTime() <= now : false,
            createdAt: b.created_at,
            completedAt: b.completed_at,
            archivedAt: b.archived_at,
          };
        }
        // standalone reminder
        const me = user?.id ? profileById.get(user.id) : undefined;
        return {
          id: b.id,
          kind: 'reminder',
          state: b.state,
          messageId: null,
          conversationId: null,
          conversationTitle: 'Reminder',
          conversationKind: 'dm',
          conversationIsPrivate: false,
          authorId: user?.id ?? null,
          authorName: me?.full_name ?? me?.email ?? 'You',
          authorAvatarUrl: me?.avatar_url ?? null,
          body: b.reminder_text ?? '',
          reminderText: b.reminder_text,
          remindAt: b.remind_at,
          remindFired: b.remind_at ? new Date(b.remind_at).getTime() <= now : false,
          createdAt: b.created_at,
          completedAt: b.completed_at,
          archivedAt: b.archived_at,
        };
      });

      return items;
    },
  });

  const counts = useMemo(() => {
    const items = query.data ?? [];
    return {
      in_progress: items.filter(i => i.state === 'in_progress').length,
      archived: items.filter(i => i.state === 'archived').length,
      completed: items.filter(i => i.state === 'completed').length,
    };
  }, [query.data]);

  return {
    items: query.data ?? [],
    counts,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

// ---------- Mutations ----------

export function useSetLaterState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, state }: { id: string; state: LaterState }) => {
      const patch: Record<string, any> = { state };
      if (state === 'completed') patch.completed_at = new Date().toISOString();
      if (state === 'archived') patch.archived_at = new Date().toISOString();
      if (state === 'in_progress') {
        patch.completed_at = null;
        patch.archived_at = null;
      }
      const { error } = await db.from('chat_bookmarks').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-v2', 'later'] }),
  });
}

export function useRemoveLater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('chat_bookmarks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-v2', 'later'] });
      qc.invalidateQueries({ queryKey: ['chat', 'bookmarks'] });
    },
  });
}

export function useSnoozeLater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, remindAt }: { id: string; remindAt: string | null }) => {
      const { error } = await db.from('chat_bookmarks').update({ remind_at: remindAt }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-v2', 'later'] }),
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reminderText, remindAt }: { reminderText: string; remindAt: string }) => {
      const { error } = await db.from('chat_bookmarks').insert({
        kind: 'reminder',
        state: 'in_progress',
        reminder_text: reminderText,
        remind_at: remindAt,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-v2', 'later'] }),
  });
}

export function useClearCompletedLater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc('chat_clear_completed_bookmarks');
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-v2', 'later'] }),
  });
}
