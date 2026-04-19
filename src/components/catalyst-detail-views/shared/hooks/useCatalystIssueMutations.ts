/**
 * Canonical hook — provides update/delete mutations for a ph_issue.
 * Used by all CatalystView* components.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  getStatusCategory,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';

export function useCatalystIssueMutations(itemId: string, onClose: () => void) {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', itemId] });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const cat = getStatusCategory(newStatus);
      await supabase
        .from('ph_issues')
        .update({ status: newStatus, status_category: cat })
        .eq('id', itemId);
    },
    onSuccess: invalidate,
  });

  const updateField = useMutation({
    mutationFn: async ({
      field,
      value,
    }: {
      field: string;
      value: string | null;
      oldValue?: string | null;
    }) => {
      await supabase.from('ph_issues').update({ [field]: value }).eq('id', itemId);
    },
    onSuccess: invalidate,
  });

  const deleteIssue = useMutation({
    mutationFn: async () => {
      await supabase
        .from('ph_issues')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', itemId);
    },
    onSuccess: () => {
      toast.success('Item deleted');
      onClose();
    },
  });

  return { updateStatus, updateField, deleteIssue };
}
