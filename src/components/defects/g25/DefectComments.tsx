/**
 * Defect Comments (G25) — catalyst-ds replacement.
 * Reads from tm_comments with entity_type='defect'.
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ActivityPanel } from '@/components/catalyst-ds';
import type { CdsComment, CdsUser } from '@/components/catalyst-ds';

interface DefectCommentsProps {
  defectId: string;
}

export function DefectComments({ defectId }: DefectCommentsProps) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<CdsUser | undefined>();

  useQuery({
    queryKey: ['current-user-defect-comments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', user.id).single();
      if (profile) setCurrentUser({ id: profile.id, name: profile.full_name || 'You', avatarUrl: profile.avatar_url });
      return user;
    },
  });

  const { data: rawComments = [], isLoading } = useQuery({
    queryKey: ['g25-defect-comments', defectId],
    enabled: !!defectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_comments')
        .select('*, creator:profiles!tm_comments_author_id_fkey(full_name, avatar_url)')
        .eq('entity_type', 'defect')
        .eq('entity_id', defectId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      await supabase.from('tm_comments').insert({ entity_type: 'defect', entity_id: defectId, author_id: user.id, content });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['g25-defect-comments', defectId] }); toast.success('Comment added'); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from('tm_comments').delete().eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['g25-defect-comments', defectId] }); toast.success('Comment deleted'); },
  });

  const comments: CdsComment[] = rawComments.map((r: any) => ({
    id: r.id,
    author: { id: r.author_id || 'unknown', name: r.creator?.full_name || 'Unknown', avatarUrl: r.creator?.avatar_url || null },
    content: r.content || '', createdAt: r.created_at, isEdited: r.updated_at && r.updated_at !== r.created_at,
  }));

  return (
    <ActivityPanel
      comments={comments} historyItems={[]} currentUser={currentUser} mentionableUsers={[]}
      onAddComment={useCallback((c: string) => addMutation.mutateAsync(c), [addMutation])}
      onDeleteComment={useCallback((id: string) => deleteMutation.mutateAsync(id), [deleteMutation])}
      isSubmitting={addMutation.isPending} isLoadingComments={isLoading} isLoadingHistory={false}
      defaultTab="comments" defaultSortOrder="newest"
    />
  );
}

export default DefectComments;
