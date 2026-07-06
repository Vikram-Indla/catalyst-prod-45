import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

/**
 * S6b (CAT-TESTHUB-REPOSITORY-REDESIGN-20260705-001) — configurable test-case
 * status workflow. Reads tm_case_status_config; when a project has no rows it
 * returns the canonical DEFAULTS so the app behaves exactly as before. The
 * underlying tm_case_status enum (draft/ready/approved/deprecated) is fixed —
 * this only governs presentation (label, ADS category, order) and allowed
 * transitions, so nothing that writes status is affected.
 */

export type StatusCategory = 'default' | 'inprogress' | 'success' | 'removed';

export interface CaseStatusConfig {
  status_key: string;        // draft | ready | approved | deprecated (fixed enum values)
  display_label: string;
  category: StatusCategory;
  sort_order: number;
  allowed_next: string[];
}

/** Canonical fallback — mirrors the previously-hardcoded lifecycle. */
export const DEFAULT_STATUS_CONFIG: CaseStatusConfig[] = [
  { status_key: 'draft',      display_label: 'Draft',      category: 'default',    sort_order: 0, allowed_next: ['ready'] },
  { status_key: 'ready',      display_label: 'Review',     category: 'inprogress', sort_order: 1, allowed_next: ['approved', 'draft'] },
  { status_key: 'approved',   display_label: 'Approved',   category: 'success',    sort_order: 2, allowed_next: ['deprecated', 'draft'] },
  { status_key: 'deprecated', display_label: 'Deprecated', category: 'removed',    sort_order: 3, allowed_next: ['approved'] },
];

export function useCaseStatusConfig(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-case-status-config', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<{ config: CaseStatusConfig[]; isCustom: boolean }> => {
      if (!projectId) return { config: DEFAULT_STATUS_CONFIG, isCustom: false };
      const { data, error } = await supabase
        .from('tm_case_status_config')
        .select('status_key, display_label, category, sort_order, allowed_next')
        .eq('project_id', projectId)
        .order('sort_order');
      if (error || !data || data.length === 0) {
        return { config: DEFAULT_STATUS_CONFIG, isCustom: false };
      }
      return { config: data as CaseStatusConfig[], isCustom: true };
    },
  });
}

export function useSaveCaseStatusConfig(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: CaseStatusConfig[]) => {
      if (!projectId) throw new Error('No project');
      const rows = config.map((c, i) => ({
        project_id: projectId,
        status_key: c.status_key,
        display_label: c.display_label,
        category: c.category,
        sort_order: i,
        allowed_next: c.allowed_next,
      }));
      const { error } = await supabase
        .from('tm_case_status_config')
        .upsert(rows, { onConflict: 'project_id,status_key' });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      catalystToast.success('Workflow saved');
      qc.invalidateQueries({ queryKey: ['tm-case-status-config', projectId] });
    },
    onError: (e: Error) => catalystToast.error(e.message),
  });
}
