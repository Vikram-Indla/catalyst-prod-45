/**
 * useWorkItemActivity — Merged feed of comments + history for a work item
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export interface ActivityEntry {
  id: string;
  kind: 'comment' | 'history';
  created_at: string;
  relative_time: string;
  actor_name: string;
  // Comment fields
  body?: string;
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

      // Fetch comments + activity log in parallel
      const [commentsRes, logsRes] = await Promise.all([
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
      ]);

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
        actor_name: profileMap.get(c.author_id) || 'Unknown',
        body: c.body,
      }));

      const logs: ActivityEntry[] = (logsRes.data || []).map(l => ({
        id: l.id,
        kind: 'history' as const,
        created_at: l.created_at,
        relative_time: formatDistanceToNow(new Date(l.created_at), { addSuffix: true }),
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

  // Add comment mutation
  const addComment = useMutation({
    mutationFn: async (body: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('ph_comments')
        .insert({ work_item_id: workItemId!, author_id: user.id, body });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  return { entries, isLoading, addComment: addComment.mutate, isAddingComment: addComment.isPending };
}
