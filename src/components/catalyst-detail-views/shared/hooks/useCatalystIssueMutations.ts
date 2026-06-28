/**
 * Canonical hook — provides update/delete mutations for a ph_issue.
 * Used by all CatalystView* components.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import {
  getStatusCategory,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';
import { gateTransition, resolveCanonicalCategory } from '@/lib/workflow/canonical/runtime';
import type { EntityKey } from '@/lib/workflow/canonical/contracts';

// ph_issues.issue_type -> canonical entity_key (only entities on the canonical
// engine are mapped; others stay undefined -> advisory is a no-op for them).
const ISSUE_TYPE_TO_ENTITY: Record<string, EntityKey> = {
  Story: 'story',
};

export function useCatalystIssueMutations(itemId: string, onClose: () => void) {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', itemId] });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      // capture pre-update context (incl. guard fields) for canonical gate + audit
      const { data: before } = await supabase
        .from('ph_issues')
        .select('id, issue_type, status, project_key, description_text, assignee_account_id, assignee_display_name, reporter_account_id')
        .eq('issue_key', itemId)
        .maybeSingle();

      const entityKey = before?.issue_type ? ISSUE_TYPE_TO_ENTITY[before.issue_type] : undefined;

      // Canonical gate (resolves advisory|blocking, evaluates role+guards, audits).
      if (entityKey && before?.id) {
        const gate = await gateTransition({
          entityKey,
          issueRow: before,
          toStatusRaw: newStatus,
          sourceSurface: 'catalyst_status_pill',
        });
        // BLOCKING mode + denied → do NOT persist; surface the tooltip basis.
        if (gate.blocked) {
          throw new Error(gate.message ?? 'Transition not allowed by workflow.');
        }
      }

      // Story (canonical): category from workflow config; else keyword fallback.
      let cat = getStatusCategory(newStatus);
      if (entityKey) {
        const configCat = await resolveCanonicalCategory(entityKey, before?.project_key ?? null, newStatus);
        if (configCat) cat = configCat;
      }

      await supabase
        .from('ph_issues')
        .update({ status: newStatus, status_category: cat })
        .eq('issue_key', itemId) /* F-iter9 PK fix */;
    },
    onError: (err: unknown) => {
      catalystToast.error(err instanceof Error ? err.message : 'Status change blocked by workflow.');
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
          if (root === 'uwv-data') return true;           // allwork canonical key
          if (root === 'workhub') return true;            // legacy allwork key
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
      catalystToast.success('Issue deleted');
      // Invalidate all list and navigator queries so deleted item disappears
      // from backlog, allwork (uwv-data), kanban, subtask panels, and nav chevrons.
      queryClient.invalidateQueries({
        predicate: (query) => {
          const root = query.queryKey?.[0];
          if (typeof root !== 'string') return false;
          if (root === 'cv-issue-detail') return true;
          if (root === 'uwv-data') return true;           // allwork canonical key
          if (root === 'workhub') return true;            // legacy allwork key
          if (root.includes('allwork-items')) return true;
          if (root.includes('kanban-issues')) return true;
          if (root.includes('backlog-data')) return true;
          if (root.includes('work-items')) return true;
          if (root.includes('childIssues')) return true;
          if (root.includes('linkedIssues')) return true;
          if (root.includes('subtasks')) return true;
          if (root.includes('cv-subtask')) return true;
          if (root.includes('ph_issues')) return true;
          return false;
        },
      });
      onClose();
    },
  });

  return { updateStatus, updateField, deleteIssue };
}
