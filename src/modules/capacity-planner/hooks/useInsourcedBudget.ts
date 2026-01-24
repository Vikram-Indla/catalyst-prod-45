/**
 * Hook to calculate assignment budget based on linked resources' CTC
 * Budget = sum of all linked resources' CTC values
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LinkedResource {
  id: string;
  resourceId: string; // RID from resource_inventory
  name: string;
  ctc: number | null;
  contract_end_date: string | null;
}

export interface AssignmentBudgetData {
  assignmentId: string;
  linkedResources: LinkedResource[];
  totalBudget: number;
  resourceCount: number;
}

export function useAssignmentBudgets(assignmentIds: string[]) {
  return useQuery({
    queryKey: ['assignment-budgets', assignmentIds],
    queryFn: async () => {
      if (!assignmentIds.length) return {};

      // Fetch all resources linked to these assignments with their CTC and rid
      const { data, error } = await supabase
        .from('resource_inventory')
        .select('id, rid, name, ctc, contract_end_date, assignment_id')
        .in('assignment_id', assignmentIds);

      if (error) throw error;

      // Group by assignment_id and calculate totals
      const budgetMap: Record<string, AssignmentBudgetData> = {};

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
          const ctc = parseFloat(resource.ctc) || 0;
          budgetMap[assignmentId].linkedResources.push({
            id: resource.id,
            resourceId: resource.rid || '—',
            name: resource.name,
            ctc: resource.ctc ? parseFloat(resource.ctc) : null,
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

// Legacy export for backward compatibility
export const useInsourcedBudgets = useAssignmentBudgets;
