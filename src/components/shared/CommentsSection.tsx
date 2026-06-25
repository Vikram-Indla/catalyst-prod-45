/**
 * Generic Comments Section — catalyst-ds replacement.
 * Reads from `comments` table (entity_id + entity_type).
 */
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApprovedProfiles } from '@/hooks/useApprovedProfiles';
import { catalystToast } from '@/lib/catalystToast';
import { ActivityPanel } from '@/components/catalyst-ds';
import type { CdsComment, CdsUser } from '@/components/catalyst-ds';

interface CommentsSectionProps {
  entityId: string;
  entityType: string;
}

export function CommentsSection({ entityId, entityType }: CommentsSectionProps) {
  const queryClient = useQueryClient();
  const { data: approvedProfiles = [] } = useApprovedProfiles();
  const profileMap = useMemo(
    () => new Map(approvedProfiles.map(p => [p.id, p])),
    [approvedProfiles]
  );

  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  useQuery({
    queryKey: ['current-user-shared-comments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      return user;
    },
  });

  const currentUser: CdsUser | undefined = useMemo(() => {
    if (!currentUserId) return undefined;
    const p = profileMap.get(currentUserId);
    if (!p) return undefined;
    return { id: p.id, name: p.name, avatarUrl: p.avatarUrl ?? null, email: p.email };
  }, [currentUserId, profileMap]);

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
      return data ?? [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      await supabase.from('comments').insert({ entity_id: entityId, entity_type: entityType, user_id: user.id, content });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['comments', entityId, entityType] }); catalystToast.success('Comment added'); },
    onError: () => catalystToast.error('Failed to add comment'),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      await supabase.from('comments').update({ content }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', entityId, entityType] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from('comments').delete().eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['comments', entityId, entityType] }); catalystToast.success('Comment deleted'); },
  });

  const comments: CdsComment[] = rawComments.map((r: any) => {
    const p = profileMap.get(r.user_id);
    return {
      id: r.id,
      author: { id: r.user_id || 'unknown', name: p?.name || 'Unknown', avatarUrl: p?.avatarUrl ?? null, email: p?.email },
      content: r.content || '', createdAt: r.created_at,
    };
  });

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
