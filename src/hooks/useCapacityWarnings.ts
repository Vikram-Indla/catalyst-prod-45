import { useQuery } from '@tanstack/react-query';
import { fromTable } from '@/lib/supabase-utils';

export interface CapacityWarning {
  teamId: string;
  teamName: string;
  allocated: number;
  capacity: number;
  overallocation: number;
  percentUsed: number;
}

export function useCapacityWarnings(piId: string, programId?: string) {
  return useQuery({
    queryKey: ['capacity-warnings', piId, programId],
    queryFn: async () => {
      // NOTE: capacity_plans table was removed as unused
      // Using resource_allocations instead for capacity warnings
      const warnings: CapacityWarning[] = [];
      
      // Fetch resource allocations for the given period
      const { data: allocations, error } = await fromTable('resource_allocations')
        .select(`
          id,
          allocation_percent,
          resource_id,
          resource_inventory(
            id,
            full_name
          )
        `);

      if (error) throw error;

      const allocationRows = (allocations || []) as Array<{
        resource_id: string;
        resource_inventory: { id: string; full_name: string } | null;
        allocation_percent: number | null;
      }>;

      // Group by resource and calculate overallocation
      const resourceMap = new Map<string, { allocated: number; name: string }>();
      
      allocationRows.forEach(alloc => {
        const resourceId = alloc.resource_id;
        const resourceData = alloc.resource_inventory;
        const resourceName = resourceData?.full_name || 'Unknown';
        const percentage = alloc.allocation_percent || 0;
        
        if (resourceId) {
          const existing = resourceMap.get(resourceId) || { allocated: 0, name: resourceName };
          existing.allocated += percentage;
          resourceMap.set(resourceId, existing);
        }
      });

      // Create warnings for overallocated resources
      resourceMap.forEach((data, resourceId) => {
        if (data.allocated > 100) {
          warnings.push({
            teamId: resourceId,
            teamName: data.name,
            allocated: data.allocated,
            capacity: 100,
            overallocation: data.allocated - 100,
            percentUsed: data.allocated,
          });
        }
      });

      return warnings;
    },
    enabled: !!piId,
  });
}
