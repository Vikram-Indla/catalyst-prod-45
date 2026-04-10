import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import type { RaDocument, RaDocumentType, RaMethodology } from '@/types/requirement-assist';

export function useRaDocuments(filters?: {
  type?: RaDocumentType;
  status?: string;
  categoryId?: string;
}) {
  return useQuery({
    queryKey: ['ra-documents', filters],
    queryFn: async () => {
      let query = typedQuery('ra_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.type) query = query.eq('type', filters.type);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as RaDocument[];
    },
  });
}

export function useRaDocument(id: string | undefined) {
  return useQuery({
    queryKey: ['ra-document', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await typedQuery('ra_documents')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data as RaDocument;
    },
    enabled: !!id,
  });
}

export function useRaSourceBrds() {
  return useQuery({
    queryKey: ['ra-source-brds'],
    queryFn: async () => {
      const { data, error } = await typedQuery('ra_documents')
        .select('id, brd_number, title, quality_score')
        .eq('type', 'brd')
        .eq('status', 'complete')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data as { id: string; brd_number: string; title: string; quality_score: number | null }[];
    },
  });
}

export function useCreateRaDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (doc: {
      type: RaDocumentType;
      title: string;
      methodology?: RaMethodology | null;
      language?: string;
      source_doc_id?: string | null;
      content?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await typedQuery('ra_documents')
        .insert({
          ...doc,
          status: 'pending',
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as RaDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ra-documents'] });
    },
  });
}
