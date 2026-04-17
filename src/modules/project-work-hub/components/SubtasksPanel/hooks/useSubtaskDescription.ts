import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ADFEntity } from '@atlaskit/adf-utils/types';
import type { Json } from '@/integrations/supabase/types';
import { adfToPlainText, isADFEmpty } from '@/utils/adf';

const SUBTASK_DESCRIPTION_KEY = (id: string) => ['subtask-description', id] as const;

interface SubtaskDescriptionRow {
  id: string;
  description_adf: ADFEntity | null;
  description_text: string | null;
}

export function useSubtaskDescription(subtaskId: string | null, parentKey: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: SUBTASK_DESCRIPTION_KEY(subtaskId ?? ''),
    enabled: !!subtaskId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!subtaskId) return null;
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id,description_adf,description_text')
        .eq('id', subtaskId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as SubtaskDescriptionRow) ?? null;
    },
  });

  const save = useMutation({
    mutationFn: async (adf: ADFEntity) => {
      if (!subtaskId) throw new Error('No subtask selected');
      const plain = isADFEmpty(adf) ? '' : adfToPlainText(adf);
      const { error } = await supabase
        .from('ph_issues')
        .update({
          description_adf: isADFEmpty(adf) ? null : (adf as unknown as Json),
          description_text: plain || null,
        })
        .eq('id', subtaskId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (subtaskId) {
        qc.invalidateQueries({ queryKey: SUBTASK_DESCRIPTION_KEY(subtaskId) });
      }
      qc.invalidateQueries({ queryKey: ['childIssues', parentKey] });
      toast.success('Description saved');
    },
    onError: (err) => {
      toast.error('Failed to save description', { description: (err as Error).message });
    },
  });

  return { query, save };
}

export { SUBTASK_DESCRIPTION_KEY };
