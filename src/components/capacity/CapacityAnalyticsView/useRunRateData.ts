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
  assignment_name: string | null;
  assignment_id: string | null;
}

export function useRunRateData() {
  return useQuery({
    queryKey: ['run-rate-resources'],
    queryFn: async () => {
      // Fetch resources, departments, and assignments in parallel (no FK join - FK doesn't exist)
      const [
        { data: resources, error },
        { data: departments },
        { data: assignments },
      ] = await Promise.all([
        supabase
          .from('resource_inventory')
          .select('id, name, resource_type, ctc, contract_end_date, department_id, assignment_id')
          .eq('is_active', true),
        supabase.from('capacity_departments').select('id, name'),
        supabase.from('resource_assignments').select('id, name'),
      ]);

      if (error) throw error;

      const deptMap = new Map(departments?.map(d => [d.id, d.name]) || []);
      const assignMap = new Map(assignments?.map(a => [a.id, a.name]) || []);

      return (resources || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        department_name: r.department_id ? deptMap.get(r.department_id) || null : null,
        resource_type: r.resource_type,
        ctc: r.ctc ? parseFloat(r.ctc) : null,
        contract_end_date: r.contract_end_date || null,
        assignment_name: r.assignment_id ? assignMap.get(r.assignment_id) || null : null,
        assignment_id: r.assignment_id || null,
      })) as RunRateResource[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
