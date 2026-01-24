/**
 * Hook to calculate Insourced assignment budget based on linked resources' CTC
 * For BAU/Insourced assignments, budget = sum of all linked resources' CTC values
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LinkedResource {
  id: string;
  name: string;
  ctc: number | null;
  contract_end_date: string | null;
}

interface InsourcedBudgetData {
  assignmentId: string;
  linkedResources: LinkedResource[];
  totalBudget: number;
  resourceCount: number;
}

export function useInsourcedBudgets(assignmentIds: string[]) {
  return useQuery({
    queryKey: ['insourced-budgets', assignmentIds],
    queryFn: async () => {
      if (!assignmentIds.length) return {};

      // Fetch all resources linked to these assignments with their CTC
      const { data, error } = await (supabase as any)
        .from('resource_inventory')
        .select('id, name, CTC, contract_end_date, assignment_id')
        .in('assignment_id', assignmentIds);

      if (error) throw error;

      // Group by assignment_id and calculate totals
      const budgetMap: Record<string, InsourcedBudgetData> = {};

      assignmentIds.forEach(assignmentId => {
        budgetMap[assignmentId] = {
          assignmentId,
          linkedResources: [],
          totalBudget: 0,
          resourceCount: 0,
        };
      });

      (data || []).forEach((resource: any) => {
        const assignmentId = resource.assignment_id;
        if (assignmentId && budgetMap[assignmentId]) {
          const ctc = parseFloat(resource.CTC) || 0;
          budgetMap[assignmentId].linkedResources.push({
            id: resource.id,
            name: resource.name,
            ctc: resource.CTC ? parseFloat(resource.CTC) : null,
            contract_end_date: resource.contract_end_date,
          });
          budgetMap[assignmentId].totalBudget += ctc;
          budgetMap[assignmentId].resourceCount += 1;
        }
      });

      return budgetMap;
    },
    enabled: assignmentIds.length > 0,
    staleTime: 30000,
  });
}
