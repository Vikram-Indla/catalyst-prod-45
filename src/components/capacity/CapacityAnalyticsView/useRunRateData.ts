/**
 * Run Rate Data Hook - Fetches resource CTC data for department widgets
 * Calculates monthly run rates (CTC sum) for Variable/Core resources by department
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RunRateResource {
  id: string;
  name: string;
  department_name: string | null;
  resource_type: string | null;
  ctc: number | null;
  contract_end_date: string | null;
}

export function useRunRateData() {
  return useQuery({
    queryKey: ['run-rate-resources'],
    queryFn: async () => {
      // Fetch resources with department, resource_type, CTC, and contract_end_date
      const { data: resources, error } = await supabase
        .from('resource_inventory')
        .select(`
          id,
          name,
          resource_type,
          ctc,
          contract_end_date,
          department_id,
          capacity_departments!resource_inventory_department_id_fkey(id, name)
        `)
        .eq('is_active', true);

      if (error) throw error;

      return (resources || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        department_name: r.capacity_departments?.name || null,
        resource_type: r.resource_type,
        ctc: r.ctc ? parseFloat(r.ctc) : null,
        contract_end_date: r.contract_end_date || null,
      })) as RunRateResource[];
    },
    staleTime: 30000,
  });
}
