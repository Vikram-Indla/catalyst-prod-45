/**
 * Ideation · Idea Detail — CAT-IDEATION-REBUILD-20260709-001 Phase 2 S3.
 *
 * Reads idn_ideas + idn_comments directly (greenfield idn_* schema). Zero
 * legacy carryover: never import/query ph_ideas or ph_idea_comments here.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { IdeaCommentRow, IdeaDetailRow } from '@/modules/ideation/types';

export const ideaDetailKey = (slug: string) => ['ideation', 'idea', slug] as const;
export const ideaCommentsKey = (ideaId: string) => ['ideation', 'idea-comments', ideaId] as const;

export function useIdeationIdea(slug: string | undefined) {
  return useQuery({
    queryKey: ideaDetailKey(slug ?? ''),
    queryFn: async (): Promise<IdeaDetailRow | null> => {
      const { data, error } = await typedQuery('idn_ideas')
        .select(
          'id, idea_key, slug, title, problem_statement, proposed_value, idea_class, workflow_status_key, submitter_id, product_id, products(name)'
        )
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: submitterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.submitter_id)
        .maybeSingle();

      return {
        id: data.id,
        idea_key: data.idea_key,
        slug: data.slug,
        title: data.title,
        problem_statement: data.problem_statement,
        proposed_value: data.proposed_value,
        idea_class: data.idea_class,
        workflow_status_key: data.workflow_status_key,
        submitter_id: data.submitter_id,
        submitter_name: submitterProfile?.full_name ?? null,
        product_id: data.product_id,
        product_name: (data as { products?: { name: string } | null }).products?.name ?? null,
        created_at: data.created_at,
      } as IdeaDetailRow;
    },
    enabled: !!slug,
    staleTime: 15_000,
  });
}

export function useIdeationComments(ideaId: string | undefined) {
  return useQuery({
    queryKey: ideaCommentsKey(ideaId ?? ''),
    queryFn: async (): Promise<IdeaCommentRow[]> => {
      const { data, error } = await typedQuery('idn_comments')
        .select('id, idea_id, user_id, content, parent_comment_id, created_at')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as Array<Omit<IdeaCommentRow, 'author_name'>>;
      if (rows.length === 0) return [];

      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name as string | null]));

      return rows.map((r) => ({ ...r, author_name: nameById.get(r.user_id) ?? null }));
    },
    enabled: !!ideaId,
    staleTime: 10_000,
  });
}

export function useAddIdeationComment(ideaId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (adfContent: string) => {
      if (!ideaId) throw new Error('No idea to comment on');
      const { error } = await typedQuery('idn_comments').insert({
        idea_id: ideaId,
        user_id: user?.id,
        content: JSON.parse(adfContent),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (ideaId) queryClient.invalidateQueries({ queryKey: ideaCommentsKey(ideaId) });
    },
  });
}
