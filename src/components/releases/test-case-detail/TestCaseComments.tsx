/**
 * Test Case Comments — catalyst-ds replacement.
 * Reads from tm_comments with entity_type='test_case'.
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ActivityPanel } from '@/components/catalyst-ds';
import type { CdsComment, CdsUser, CdsQuickReply } from '@/components/catalyst-ds';

interface TestCaseCommentsProps {
  testCaseId?: string;
}

const QUICK_REPLIES: CdsQuickReply[] = [
  { label: 'Passed...', template: 'Test passed. ' },
  { label: 'Failed...', template: 'Test failed — ' },
  { label: 'Blocked...', template: 'Blocked: ' },
];

export function TestCaseComments({ testCaseId }: TestCaseCommentsProps) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<CdsUser | undefined>();

  useQuery({
    queryKey: ['current-user-tc-comments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', user.id).single();
      if (profile) setCurrentUser({ id: profile.id, name: profile.full_name || 'You', avatarUrl: profile.avatar_url });
      return user;
    },
  });

  const { data: rawComments = [], isLoading } = useQuery({
    queryKey: ['tm-case-comments', testCaseId],
    enabled: !!testCaseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_comments')
        .select('id, content, author_id, created_at, updated_at, author:profiles!tm_comments_author_id_fkey(id, full_name, avatar_url)')
        .eq('entity_type', 'test_case')
        .eq('entity_id', testCaseId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      await supabase.from('tm_comments').insert({ entity_type: 'test_case', entity_id: testCaseId, author_id: user.id, content });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tm-case-comments', testCaseId] }); toast.success('Comment added'); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from('tm_comments').delete().eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tm-case-comments', testCaseId] }); toast.success('Comment deleted'); },
  });

  const comments: CdsComment[] = rawComments.map((r: any) => ({
    id: r.id,
    author: { id: r.author_id || 'unknown', name: r.author?.full_name || 'Unknown', avatarUrl: r.author?.avatar_url || null },
    content: r.content || '', createdAt: r.created_at, isEdited: r.updated_at && r.updated_at !== r.created_at,
  }));

  return (
    <ActivityPanel
      comments={comments} historyItems={[]} currentUser={currentUser} mentionableUsers={[]}
      onAddComment={useCallback((c: string) => addMutation.mutateAsync(c), [addMutation])}
      onDeleteComment={useCallback((id: string) => deleteMutation.mutateAsync(id), [deleteMutation])}
      isSubmitting={addMutation.isPending} isLoadingComments={isLoading} isLoadingHistory={false}
      quickReplies={QUICK_REPLIES} defaultTab="comments" defaultSortOrder="newest"
    />
  );
}
