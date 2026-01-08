import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
      const { data: allocations, error } = await supabase
        .from('resource_allocations')
        .select(`
          id,
          allocation_percentage,
          resource:resource_inventory(
            id,
            full_name,
            department:capacity_departments(name)
          )
        `);

      if (error) throw error;

      // Group by resource and calculate overallocation
      const resourceMap = new Map<string, { allocated: number; name: string }>();
      
      allocations?.forEach(alloc => {
        const resourceId = (alloc.resource as any)?.id;
        const resourceName = (alloc.resource as any)?.full_name || 'Unknown';
        const percentage = alloc.allocation_percentage || 0;
        
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
