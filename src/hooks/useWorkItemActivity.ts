/**
 * useWorkItemActivity — Merged feed of comments (with reactions) + history
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export interface Reaction {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
}

export interface ActivityEntry {
  id: string;
  kind: 'comment' | 'history';
  created_at: string;
  relative_time: string;
  actor_id: string | null;
  actor_name: string;
  // Comment fields
  body?: string;
  reactions?: Reaction[];
  // History fields
  action?: string;
  field_name?: string;
  old_value?: string | null;
  new_value?: string | null;
}

export function useWorkItemActivity(workItemId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ['ph-work-item-activity', workItemId];

  const { data: entries = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<ActivityEntry[]> => {
      if (!workItemId) return [];

      const { data: { user } } = await supabase.auth.getUser();
      const myId = user?.id;

      // Fetch comments + activity log + reactions in parallel
      const [commentsRes, logsRes, reactionsRes] = await Promise.all([
        supabase
          .from('ph_comments')
          .select('id, author_id, body, created_at')
          .eq('work_item_id', workItemId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('ph_activity_log')
          .select('id, user_id, action, field_name, old_value, new_value, created_at')
          .eq('work_item_id', workItemId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('ph_comment_reactions')
          .select('id, comment_id, user_id, emoji'),
      ]);

      // Build reaction map: commentId -> Reaction[]
      const reactionMap = new Map<string, Reaction[]>();
      for (const r of reactionsRes.data || []) {
        if (!reactionMap.has(r.comment_id)) reactionMap.set(r.comment_id, []);
      }
      // Group by comment_id + emoji
      const rawReactions = reactionsRes.data || [];
      const commentIds = [...new Set(rawReactions.map(r => r.comment_id))];
      for (const cid of commentIds) {
        const cReactions = rawReactions.filter(r => r.comment_id === cid);
        const emojiMap = new Map<string, { count: number; mine: boolean }>();
        for (const r of cReactions) {
          const e = emojiMap.get(r.emoji) || { count: 0, mine: false };
          e.count++;
          if (r.user_id === myId) e.mine = true;
          emojiMap.set(r.emoji, e);
        }
        reactionMap.set(cid, [...emojiMap.entries()].map(([emoji, v]) => ({
          emoji, count: v.count, reacted_by_me: v.mine,
        })));
      }

      // Gather all user IDs
      const userIds = new Set<string>();
      for (const c of commentsRes.data || []) if (c.author_id) userIds.add(c.author_id);
      for (const l of logsRes.data || []) if (l.user_id) userIds.add(l.user_id);

      const profileMap = new Map<string, string>();
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', [...userIds]);
        for (const p of profiles || []) {
          profileMap.set(p.id, p.full_name || p.email || 'Unknown');
        }
      }

      const comments: ActivityEntry[] = (commentsRes.data || []).map(c => ({
        id: c.id,
        kind: 'comment' as const,
        created_at: c.created_at,
        relative_time: formatDistanceToNow(new Date(c.created_at), { addSuffix: true }),
        actor_id: c.author_id,
        actor_name: profileMap.get(c.author_id) || 'Unknown',
        body: c.body,
        reactions: reactionMap.get(c.id) || [],
      }));

      const logs: ActivityEntry[] = (logsRes.data || []).map(l => ({
        id: l.id,
        kind: 'history' as const,
        created_at: l.created_at,
        relative_time: formatDistanceToNow(new Date(l.created_at), { addSuffix: true }),
        actor_id: l.user_id,
        actor_name: profileMap.get(l.user_id) || 'System',
        action: l.action,
        field_name: l.field_name,
        old_value: l.old_value,
        new_value: l.new_value,
      }));

      return [...comments, ...logs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!workItemId,
  });

  // Add comment
  const addComment = useMutation({
    mutationFn: async (body: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('ph_comments')
        .insert({ work_item_id: workItemId!, author_id: user.id, body });
      if (error) throw new Error(error.message);

      // Also log activity
      await supabase.from('ph_activity_log').insert({
        work_item_id: workItemId!,
        user_id: user.id,
        action: 'commented',
        field_name: null,
        old_value: null,
        new_value: body.slice(0, 200),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  // Delete comment
  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('ph_comments').delete().eq('id', commentId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Comment deleted');
    },
    onError: () => toast.error('Failed to delete comment'),
  });

  // Toggle reaction
  const toggleReaction = useMutation({
    mutationFn: async ({ commentId, emoji }: { commentId: string; emoji: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if already reacted
      const { data: existing } = await supabase
        .from('ph_comment_reactions')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        await supabase.from('ph_comment_reactions').delete().eq('id', existing.id);
      } else {
        const { error } = await supabase
          .from('ph_comment_reactions')
          .insert({ comment_id: commentId, user_id: user.id, emoji });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    entries,
    isLoading,
    addComment: addComment.mutate,
    isAddingComment: addComment.isPending,
    deleteComment: deleteComment.mutate,
    toggleReaction: toggleReaction.mutate,
  };
}
