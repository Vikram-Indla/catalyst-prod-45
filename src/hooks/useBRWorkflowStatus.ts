import { useQuery } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';

export interface BRWorkflowStatus {
  id: string;
  scheme_id: string;
  name: string;
  slug: string;
  category: 'todo' | 'in_progress' | 'done';
  color: string;
  position: number;
  is_initial: boolean;
  is_final: boolean;
  is_active: boolean;
  wip_limit: number | null;
  slug_aliases: string[];
  owner_name?: string;
  entry_criteria?: string;
  exit_criteria?: string;
  expected_outputs?: string;
  impacted_roles?: string[];
  activities?: string[];
  risks?: string;
  backward_routes?: string[];
  next_movements?: string[];
}

export function useBRWorkflowStatuses() {
  return useQuery({
    queryKey: ['br', 'workflow-statuses'],
    queryFn: async () => {
      const { data, error } = await typedQuery('catalyst_workflow_statuses' as any)
        .select('*')
        .eq('is_active', true)
        .order('position');
      if (error) throw error;
      return (data ?? []) as BRWorkflowStatus[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function getBRWorkflowStatus(
  statuses: BRWorkflowStatus[],
  slug: string | null | undefined,
): BRWorkflowStatus | undefined {
  if (!slug) return undefined;
  return statuses.find(
    (s) => s.slug === slug || (s.slug_aliases ?? []).includes(slug),
  );
}
