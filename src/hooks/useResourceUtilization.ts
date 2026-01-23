import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ResourceUtilizationItem {
  id: string;
  resource_name: string;
  assignment_name: string | null;
  utilization_percent: number;
  role_name: string | null;
  department_name: string | null;
  is_active: boolean;
}

export function useResourceUtilization() {
  return useQuery({
    queryKey: ['resource-utilization'],
    queryFn: async () => {
      // Fetch resources with their assignments
      const { data: resources, error: resourcesError } = await supabase
        .from('resource_inventory')
        .select('id, name, assignment_id, default_capacity_percent, role_name, department_name, is_active')
        .order('name');

      if (resourcesError) throw resourcesError;

      // Fetch assignments for mapping
      const { data: assignments, error: assignmentsError } = await supabase
        .from('resource_assignments')
        .select('id, name');

      if (assignmentsError) throw assignmentsError;

      const assignmentMap = new Map(assignments?.map(a => [a.id, a.name]) || []);

      // Check for allocations in resource_allocations table (for committed work)
      const now = new Date().toISOString().split('T')[0];
      const { data: allocations } = await supabase
        .from('resource_allocations')
        .select('resource_id, allocation_percent')
        .lte('start_date', now)
        .gte('end_date', now)
        .eq('status', 'committed');

      // Sum allocations per resource
      const allocationsByResource = new Map<string, number>();
      (allocations || []).forEach((alloc: { resource_id: string; allocation_percent: number }) => {
        const current = allocationsByResource.get(alloc.resource_id) || 0;
        allocationsByResource.set(alloc.resource_id, current + alloc.allocation_percent);
      });

      // Map resources to utilization format
      return (resources || []).map(resource => {
        // Use allocation from resource_allocations if available, otherwise use default_capacity_percent
        const committedAllocation = allocationsByResource.get(resource.id);
        const utilization = committedAllocation !== undefined 
          ? committedAllocation 
          : resource.default_capacity_percent;

        return {
          id: resource.id,
          resource_name: resource.name,
          assignment_name: resource.assignment_id ? assignmentMap.get(resource.assignment_id) || null : null,
          utilization_percent: utilization,
          role_name: resource.role_name,
          department_name: resource.department_name,
          is_active: resource.is_active,
        } as ResourceUtilizationItem;
      });
    },
  });
}
