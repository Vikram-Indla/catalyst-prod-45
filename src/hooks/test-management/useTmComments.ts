// G14 COL-001/002: tm_comments is TestHub's real comment table (entity_type/
// entity_id generic key, matches the pattern already used for entity_type
// 'run'/'cycle_scope' in CycleDetailPage.tsx). This hook is the generic
// version used to mount comment threads on any tm entity (test_case, cycle).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TmCommentRow {
  id: string;
  content: string;
  created_at: string;
  updated_at: string | null;
  parent_id: string | null;
  author_id: string;
  author: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
}

export function useTmComments(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: ['tm-comments', entityType, entityId],
    enabled: !!entityId,
    queryFn: async (): Promise<TmCommentRow[]> => {
      const { data, error } = await supabase
        .from('tm_comments')
        .select('id, content, created_at, updated_at, parent_id, author_id, author:profiles!tm_comments_author_id_fkey(full_name, email, avatar_url)')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TmCommentRow[];
    },
  });
}

export function useAddTmComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { entityType: string; entityId: string; content: string; parentId?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('tm_comments').insert({
        entity_type: input.entityType,
        entity_id: input.entityId,
        content: input.content,
        author_id: user.id,
        parent_id: input.parentId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tm-comments', vars.entityType, vars.entityId] });
    },
  });
}
