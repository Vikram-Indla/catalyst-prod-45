import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('departments') as any)
        .select('id, name, sort_order, parent_id, is_active')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data;
    },
  });
}
