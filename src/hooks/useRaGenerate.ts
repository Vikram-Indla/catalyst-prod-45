import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import type { RaDocumentType } from '@/types/requirement-assist';

export function useRaGenerate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      documentId: string;
      type: RaDocumentType;
      input?: { text?: string; methodology?: string; language?: string; source_doc_id?: string };
    }) => {
      // Update document status to 'generating'
      await typedQuery('ra_documents')
        .update({ status: 'generating' })
        .eq('id', params.documentId);

      // Map type to edge function name
      const fnMap: Record<RaDocumentType, string> = {
        brd: 'ra-generate-brd',
        translation: 'ra-translate-brd',
        epic: 'ra-generate-epics',
        uat: 'ra-generate-uat',
      };

      const { data, error } = await supabase.functions.invoke(fnMap[params.type], {
        body: { document_id: params.documentId, ...params.input },
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ra-document', vars.documentId] });
      queryClient.invalidateQueries({ queryKey: ['ra-documents'] });
    },
  });
}
