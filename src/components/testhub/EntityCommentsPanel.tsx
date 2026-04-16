/**
 * Entity Comments Panel — catalyst-ds replacement.
 * Reads from tm_comments. Supports @mentions.
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ActivityPanel } from '@/components/catalyst-ds';
import type { CdsComment, CdsUser, CdsQuickReply } from '@/components/catalyst-ds';

interface EntityCommentsPanelProps {
  entityType: string;
  entityId: string | undefined;
  title?: string;
}

const QUICK_REPLIES: CdsQuickReply[] = [
  { label: 'Looks good...', template: 'Looks good. ' },
  { label: 'Needs review...', template: 'Needs review: ' },
  { label: 'Blocked...', template: 'Blocked — ' },
];

export function EntityCommentsPanel({ entityType, entityId }: EntityCommentsPanelProps) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<CdsUser | undefined>();

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-active-testhub'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('status', 'Active')
        .order('full_name');
      return data || [];
    },
  });

  const mentionableUsers: CdsUser[] = profiles.map((p: any) => ({
    id: p.id, name: p.full_name || 'Unknown', avatarUrl: p.avatar_url,
  }));

  useQuery({
    queryKey: ['current-user-testhub-comments'],
    enabled: profiles.length > 0,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const match = profiles.find((p: any) => p.id === user.id);
      if (match) setCurrentUser({ id: match.id, name: match.full_name || 'You', avatarUrl: match.avatar_url });
      return user;
    },
  });

  const { data: rawComments = [], isLoading } = useQuery({
    queryKey: ['comments', entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_comments')
        .select('id, entity_type, entity_id, author_id, content, created_at, author:profiles!tm_comments_author_id_fkey(full_name, avatar_url)')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('tm_comments').insert({
        entity_type: entityType, entity_id: entityId, author_id: user.id, content,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] }); toast.success('Comment added'); },
    onError: () => toast.error('Failed to add comment'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tm_comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] }); toast.success('Comment deleted'); },
  });

  const comments: CdsComment[] = rawComments.map((r: any) => ({
    id: r.id,
    author: { id: r.author_id || 'unknown', name: r.author?.full_name || 'Unknown', avatarUrl: r.author?.avatar_url || null },
    content: r.content || '', createdAt: r.created_at,
  }));

  return (
    <ActivityPanel
      comments={comments}
      historyItems={[]}
      currentUser={currentUser}
      mentionableUsers={mentionableUsers}
      onAddComment={useCallback((c: string) => addMutation.mutateAsync(c), [addMutation])}
      onDeleteComment={useCallback((id: string) => deleteMutation.mutateAsync(id), [deleteMutation])}
      isSubmitting={addMutation.isPending}
      isLoadingComments={isLoading}
      isLoadingHistory={false}
      quickReplies={QUICK_REPLIES}
      defaultTab="comments"
      defaultSortOrder="newest"
    />
  );
}
