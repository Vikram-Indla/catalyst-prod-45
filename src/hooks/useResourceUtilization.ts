import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MonthlyAllocation {
  month: number; // 1-12
  allocation_percent: number;
  allocation_id: string | null; // null if no record exists yet
  is_editable: boolean; // based on contract_end_date
}

export interface ResourceUtilizationItem {
  id: string;
  resource_name: string;
  assignment_id: string | null;
  assignment_name: string | null;
  role_name: string | null;
  department_name: string | null;
  is_active: boolean;
  contract_end_date: string | null;
  monthly_allocations: MonthlyAllocation[];
  default_capacity_percent: number;
}

const MONTHS = [
  { num: 1, name: 'Jan' },
  { num: 2, name: 'Feb' },
  { num: 3, name: 'Mar' },
  { num: 4, name: 'Apr' },
  { num: 5, name: 'May' },
  { num: 6, name: 'Jun' },
  { num: 7, name: 'Jul' },
  { num: 8, name: 'Aug' },
  { num: 9, name: 'Sep' },
  { num: 10, name: 'Oct' },
  { num: 11, name: 'Nov' },
  { num: 12, name: 'Dec' },
];

export { MONTHS };

// Helper to get month start/end dates
function getMonthDateRange(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  };
}

// Check if month is editable based on contract end date
function isMonthEditable(contractEndDate: string | null, year: number, month: number): boolean {
  if (!contractEndDate) return true; // No contract end = always editable
  
  const contractEnd = new Date(contractEndDate);
  const monthStart = new Date(year, month - 1, 1);
  
  // Month is editable only if contract end date is on or after the month start
  return contractEnd >= monthStart;
}

export function useResourceUtilization(year: number = new Date().getFullYear()) {
  return useQuery({
    queryKey: ['resource-utilization', year],
    queryFn: async () => {
      // Fetch resources with their assignments
      const { data: resources, error: resourcesError } = await supabase
        .from('resource_inventory')
        .select('id, name, assignment_id, default_capacity_percent, role_name, department_name, is_active, contract_end_date')
        .eq('is_active', true)
        .order('name');

      if (resourcesError) throw resourcesError;

      // Fetch assignments for mapping
      const { data: assignments, error: assignmentsError } = await supabase
        .from('resource_assignments')
        .select('id, name');

      if (assignmentsError) throw assignmentsError;

      const assignmentMap = new Map(assignments?.map(a => [a.id, a.name]) || []);

      // Fetch all allocations for the year
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;
      
      const { data: allocations, error: allocationsError } = await supabase
        .from('resource_allocations')
        .select('id, resource_id, assignment_id, allocation_percent, start_date, end_date, status')
        .gte('start_date', yearStart)
        .lte('end_date', yearEnd)
        .eq('status', 'committed');

      if (allocationsError) throw allocationsError;

      // Create a map of allocations by resource_id + assignment_id + month
      const allocationMap = new Map<string, { id: string; percent: number }>();
      (allocations || []).forEach((alloc) => {
        const startDate = new Date(alloc.start_date);
        const month = startDate.getMonth() + 1; // 1-12
        const key = `${alloc.resource_id}:${alloc.assignment_id}:${month}`;
        allocationMap.set(key, { id: alloc.id, percent: alloc.allocation_percent });
      });

      // Map resources to utilization format with monthly data
      return (resources || []).map(resource => {
        const monthly_allocations: MonthlyAllocation[] = MONTHS.map(m => {
          const key = `${resource.id}:${resource.assignment_id}:${m.num}`;
          const existing = allocationMap.get(key);
          const isEditable = isMonthEditable(resource.contract_end_date, year, m.num);
          
          return {
            month: m.num,
            allocation_percent: existing?.percent ?? resource.default_capacity_percent,
            allocation_id: existing?.id ?? null,
            is_editable: isEditable && resource.assignment_id !== null,
          };
        });

        return {
          id: resource.id,
          resource_name: resource.name,
          assignment_id: resource.assignment_id,
          assignment_name: resource.assignment_id ? assignmentMap.get(resource.assignment_id) || null : null,
          role_name: resource.role_name,
          department_name: resource.department_name,
          is_active: resource.is_active,
          contract_end_date: resource.contract_end_date,
          monthly_allocations,
          default_capacity_percent: resource.default_capacity_percent,
        } as ResourceUtilizationItem;
      });
    },
  });
}

export interface SaveAllocationInput {
  resource_id: string;
  assignment_id: string;
  month: number;
  year: number;
  allocation_percent: number;
  existing_allocation_id: string | null;
}

export function useSaveAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveAllocationInput) => {
      const { start, end } = getMonthDateRange(input.year, input.month);
      
      if (input.existing_allocation_id) {
        // Update existing allocation
        const { data, error } = await supabase
          .from('resource_allocations')
          .update({
            allocation_percent: input.allocation_percent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.existing_allocation_id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new allocation
        const { data, error } = await supabase
          .from('resource_allocations')
          .insert({
            resource_id: input.resource_id,
            assignment_id: input.assignment_id,
            allocation_percent: input.allocation_percent,
            start_date: start,
            end_date: end,
            status: 'committed',
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resource-utilization', variables.year] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to save allocation: ${error.message}`);
    },
  });
}

export function useBulkSaveAllocations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: SaveAllocationInput[]) => {
      const results = [];
      
      for (const input of inputs) {
        const { start, end } = getMonthDateRange(input.year, input.month);
        
        if (input.existing_allocation_id) {
          const { data, error } = await supabase
            .from('resource_allocations')
            .update({
              allocation_percent: input.allocation_percent,
              updated_at: new Date().toISOString(),
            })
            .eq('id', input.existing_allocation_id)
            .select()
            .single();

          if (error) throw error;
          results.push(data);
        } else {
          const { data, error } = await supabase
            .from('resource_allocations')
            .insert({
              resource_id: input.resource_id,
              assignment_id: input.assignment_id,
              allocation_percent: input.allocation_percent,
              start_date: start,
              end_date: end,
              status: 'committed',
            })
            .select()
            .single();

          if (error) throw error;
          results.push(data);
        }
      }
      
      return results;
    },
    onSuccess: (_, variables) => {
      const year = variables[0]?.year || new Date().getFullYear();
      queryClient.invalidateQueries({ queryKey: ['resource-utilization', year] });
      toast.success('Allocations saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save allocations: ${error.message}`);
    },
  });
}
