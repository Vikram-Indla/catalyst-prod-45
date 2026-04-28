/**
 * Shared hooks for initiative form lookups (departments, profiles).
 * Used by CreateRequestDrawer and DetailPanel.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDepartmentOptions() {
  return useQuery({
    queryKey: ['ph-departments-lookup'],
    queryFn: async () => {
      // FK target: ph_requests.department_id -> ph_departments.id
      const { data, error } = await supabase
        .from('ph_departments')
        .select('id, name')
        .order('name');
      if (error) throw new Error(error.message);
      return (data || []).map(d => ({ value: d.id, label: d.name }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProfileOptions() {
  return useQuery({
    queryKey: ['profiles-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw new Error(error.message);
      return (data || []).map(p => ({ value: p.id, label: p.full_name || p.id }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
