/**
 * Generic Comments Section — catalyst-ds replacement.
 * Reads from `comments` table (entity_id + entity_type).
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ActivityPanel } from '@/components/catalyst-ds';
import type { CdsComment, CdsUser } from '@/components/catalyst-ds';

interface CommentsSectionProps {
  entityId: string;
  entityType: string;
}

export function CommentsSection({ entityId, entityType }: CommentsSectionProps) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<CdsUser | undefined>();

  useQuery({
    queryKey: ['current-user-shared-comments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase.from('profiles').select('id, full_name, email, avatar_url').eq('id', user.id).single();
      if (profile) setCurrentUser({ id: profile.id, name: profile.full_name || profile.email || 'You', avatarUrl: profile.avatar_url, email: profile.email });
      return user;
    },
  });

  const { data: rawComments = [], isLoading } = useQuery({
    queryKey: ['comments', entityId, entityType],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('entity_id', entityId)
        .eq('entity_type', entityType)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data?.length) return [];
      const userIds = [...new Set(data.map((c: any) => c.user_id).filter(Boolean))];
      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', userIds);
        if (profiles) profiles.forEach((p: any) => profileMap.set(p.id, p));
      }
      return data.map((c: any) => ({ ...c, profile: profileMap.get(c.user_id) }));
    },
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      await supabase.from('comments').insert({ entity_id: entityId, entity_type: entityType, user_id: user.id, content });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['comments', entityId, entityType] }); toast.success('Comment added'); },
    onError: () => toast.error('Failed to add comment'),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      await supabase.from('comments').update({ content }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', entityId, entityType] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from('comments').delete().eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['comments', entityId, entityType] }); toast.success('Comment deleted'); },
  });

  const comments: CdsComment[] = rawComments.map((r: any) => ({
    id: r.id,
    author: { id: r.user_id || 'unknown', name: r.profile?.full_name || r.profile?.email || 'Unknown', avatarUrl: r.profile?.avatar_url || null, email: r.profile?.email },
    content: r.content || '', createdAt: r.created_at,
  }));

  return (
    <ActivityPanel
      comments={comments} historyItems={[]} currentUser={currentUser} mentionableUsers={[]}
      onAddComment={useCallback((c: string) => addMutation.mutateAsync(c), [addMutation])}
      onEditComment={useCallback((id: string, c: string) => editMutation.mutateAsync({ id, content: c }), [editMutation])}
      onDeleteComment={useCallback((id: string) => deleteMutation.mutateAsync(id), [deleteMutation])}
      isSubmitting={addMutation.isPending} isLoadingComments={isLoading} isLoadingHistory={false}
      defaultTab="comments" defaultSortOrder="newest"
    />
  );
}
