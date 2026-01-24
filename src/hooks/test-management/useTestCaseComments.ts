/**
 * Hook for managing test case comments
 * Queries tm_comments table with entity_type='test_case'
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

export interface TestCaseComment {
  id: string;
  content: string;
  author_id: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch comments for a test case from tm_comments
 */
export function useTestCaseComments(testCaseId: string | undefined) {
  return useQuery({
    queryKey: ['tm-case-comments', testCaseId],
    queryFn: async (): Promise<TestCaseComment[]> => {
      if (!testCaseId) return [];

      const { data, error } = await (supabase as any)
        .from('tm_comments')
        .select(`
          id,
          content,
          author_id,
          created_at,
          updated_at,
          author:profiles!tm_comments_author_id_fkey(id, full_name, avatar_url)
        `)
        .eq('entity_type', 'test_case')
        .eq('entity_id', testCaseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((c: any) => ({
        id: c.id,
        content: c.content,
        author_id: c.author_id,
        author: c.author,
        created_at: c.created_at,
        updated_at: c.updated_at,
      }));
    },
    enabled: !!testCaseId,
  });
}

/**
 * Get comments count for a test case
 */
export function useTestCaseCommentsCount(testCaseId: string | undefined) {
  return useQuery({
    queryKey: ['tm-case-comments-count', testCaseId],
    queryFn: async (): Promise<number> => {
      if (!testCaseId) return 0;

      const { count, error } = await (supabase as any)
        .from('tm_comments')
        .select('*', { count: 'exact', head: true })
        .eq('entity_type', 'test_case')
        .eq('entity_id', testCaseId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!testCaseId,
  });
}

interface AddCommentInput {
  testCaseId: string;
  content: string;
}

/**
 * Add a new comment to a test case
 */
export function useAddTestCaseComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddCommentInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase as any)
        .from('tm_comments')
        .insert({
          entity_type: 'test_case',
          entity_id: input.testCaseId,
          content: input.content,
          author_id: user.id,
        })
        .select(`
          id,
          content,
          author_id,
          created_at,
          updated_at,
          author:profiles!tm_comments_author_id_fkey(id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-case-comments', variables.testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-comments-count', variables.testCaseId] });
      catalystToast.success('Comment posted');
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to post comment', error.message);
    },
  });
}

/**
 * Delete a comment
 */
export function useDeleteTestCaseComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { commentId: string; testCaseId: string }) => {
      const { error } = await (supabase as any)
        .from('tm_comments')
        .delete()
        .eq('id', input.commentId);

      if (error) throw error;
      return input;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-case-comments', data.testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-comments-count', data.testCaseId] });
      catalystToast.success('Comment deleted');
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to delete comment', error.message);
    },
  });
}
