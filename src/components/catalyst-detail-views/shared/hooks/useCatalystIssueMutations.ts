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
        .eq('issue_key', itemId) /* F-iter9 PK fix */;
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
      await supabase.from('ph_issues').update({ [field]: value }).eq('issue_key', itemId) /* F-iter9 PK fix */;
      // Title is mirrored into user_recent_items.display_summary (a
      // snapshot taken at view time) so the right-rail Recents stays
      // performant. The snapshot is not joined live to ph_issues, so
      // we have to write it ourselves when the title changes — otherwise
      // the sidebar shows the old title until the user re-visits the
      // item or refreshes the page.
      if (field === 'summary' && typeof value === 'string') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_recent_items')
            .update({ display_summary: value })
            .eq('user_id', user.id)
            .eq('entity_key', itemId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', itemId] });
      // Any query whose key matches a list/board/sidebar that renders
      // issue summaries. Predicate-based so we don't have to chase
      // every individual key as new surfaces get added.
      queryClient.invalidateQueries({
        predicate: (query) => {
          const root = query.queryKey?.[0];
          if (typeof root !== 'string') return false;
          if (root === 'cv-issue-detail') return true;
          if (root === 'global-recent-items') return true;
          if (root === 'product-hub-per-product-recents') return true;
          if (root === 'product-hub-recent-brs') return true;
          if (root.includes('ph_issues')) return true;
          if (root.includes('allwork-items')) return true;
          if (root.includes('kanban-issues')) return true;
          if (root.includes('backlog-data')) return true;
          if (root.includes('requests-backlog')) return true;
          if (root.includes('work-items')) return true;
          if (root.includes('childIssues')) return true;
          if (root.includes('linkedIssues')) return true;
          return false;
        },
      });
    },
  });

  const deleteIssue = useMutation({
    mutationFn: async () => {
      await supabase
        .from('ph_issues')
        .update({ deleted_at: new Date().toISOString() })
        .eq('issue_key', itemId) /* F-iter9 PK fix */;
    },
    onSuccess: () => {
      toast.success('Item deleted');
      onClose();
    },
  });

  return { updateStatus, updateField, deleteIssue };
}
