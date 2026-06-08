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
    onSuccess: () => invalidateChat(qc),
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
