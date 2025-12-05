import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type WorkItemType = 'epic' | 'feature' | 'story' | 'defect' | 'business_request';

export interface KBDocument {
  id: string;
  title: string;
  content: Json;
  content_text: string | null;
  space_id: string | null;
  parent_id: string | null;
  linked_work_item_id: string | null;
  linked_work_item_type: string | null;
  created_by: string;
  updated_by: string;
  updated_at: string;
  created_at: string;
  published_at: string | null;
}

export const useKnowledgeHubDocuments = (workItemId: string, workItemType?: WorkItemType) => {
  return useQuery({
    queryKey: ['kb-documents', workItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_documents')
        .select('*')
        .eq('linked_work_item_id', workItemId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!workItemId,
  });
};

export const useCreateKBDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newDoc: {
      title: string;
      content?: Json;
      linked_work_item_id: string;
      linked_work_item_type: WorkItemType;
      space_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('kb_documents')
        .insert([{
          title: newDoc.title,
          content: newDoc.content || {},
          linked_work_item_id: newDoc.linked_work_item_id,
          linked_work_item_type: newDoc.linked_work_item_type,
          space_id: newDoc.space_id,
          created_by: 'system',
          updated_by: 'system',
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kb-documents', variables.linked_work_item_id] });
    },
  });
};

export const useUpdateKBDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { title?: string; content?: Json; content_text?: string } }) => {
      const { data, error } = await supabase
        .from('kb_documents')
        .update({ ...updates, updated_by: 'system' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-documents'] });
    },
  });
};

export const useDeleteKBDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kb_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-documents'] });
    },
  });
};
