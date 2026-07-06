/**
 * useChatActions — mutation bundle for conversation lifecycle RPCs:
 * archive/unarchive, mute toggle, leave, mark-read, add/remove member.
 * Each mutation invalidates the conversations list so the dock + main view
 * re-render against fresh state.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function invalidateChat(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
}

export function useChatArchive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (convId: string) => {
      const { error } = await (supabase as any).rpc('chat_archive_now', { p_conv: convId });
      if (error) throw error;
    },
    onSuccess: () => invalidateChat(qc),
  });
}

export function useChatUnarchive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (convId: string) => {
      const { error } = await (supabase as any).rpc('chat_unarchive', { p_conv: convId });
      if (error) throw error;
    },
    onSuccess: () => invalidateChat(qc),
  });
}

export function useChatSetMute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ convId, muted }: { convId: string; muted: boolean }) => {
      const { error } = await (supabase as any).rpc('chat_set_mute', {
        p_conv: convId,
        p_muted: muted,
      });
      if (error) throw error;
    },
    // Flip conversation.isMuted in the cache immediately so the bell icon
    // updates on click (the header reads it from the conversations query).
    onMutate: async ({ convId, muted }: { convId: string; muted: boolean }) => {
      await qc.cancelQueries({ queryKey: ['chat', 'conversations'] });
      const prev = qc.getQueriesData({ queryKey: ['chat', 'conversations'] });
      qc.setQueriesData({ queryKey: ['chat', 'conversations'] }, (old: any) =>
        Array.isArray(old)
          ? old.map((c: any) => (c.id === convId ? { ...c, isMuted: muted } : c))
          : old,
      );
      return { prev };
    },
    onError: (_e: unknown, _v: unknown, ctx: any) => {
      ctx?.prev?.forEach(([key, data]: [unknown, unknown]) => qc.setQueryData(key as any, data));
    },
    onSettled: () => invalidateChat(qc),
  });
}

export function useChatLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (convId: string) => {
      const { error } = await (supabase as any).rpc('chat_leave_conversation', { p_conv: convId });
      if (error) throw error;
    },
    onSuccess: () => invalidateChat(qc),
  });
}

export function useChatMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (convId: string) => {
      const { error } = await (supabase as any).rpc('chat_mark_read', { p_conv: convId });
      if (error) throw error;
    },
    onSuccess: () => invalidateChat(qc),
  });
}

export function useChatAddMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ convId, userId }: { convId: string; userId: string }) => {
      const { error } = await (supabase as any).rpc('chat_add_member', {
        p_conv: convId,
        p_user: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateChat(qc),
  });
}

export function useChatSetNotificationPref() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ convId, pref }: { convId: string; pref: 'all' | 'mentions' | 'none' }) => {
      const { error } = await (supabase as any).rpc('chat_set_notification_pref', {
        p_conv: convId,
        p_pref: pref,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateChat(qc),
  });
}

export function useChatToggleStar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ convId, starred }: { convId: string; starred: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('chat_conversation_members')
        .update({ is_starred: starred })
        .eq('conversation_id', convId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      qc.invalidateQueries({ queryKey: ['chat', 'members'] });
    },
  });
}

export function useChatTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ convId, pinned }: { convId: string; pinned: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('chat_conversation_members')
        .update({ is_pinned: pinned })
        .eq('conversation_id', convId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      qc.invalidateQueries({ queryKey: ['chat', 'members'] });
    },
  });
}

export function useChatRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ convId, userId }: { convId: string; userId: string }) => {
      const { error } = await (supabase as any).rpc('chat_remove_member', {
        p_conv: convId,
        p_user: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateChat(qc),
  });
}
