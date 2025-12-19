import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Project {
  id: string;
  name: string;
  key: string;
}

// Fetch all projects for incident assignment
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, key')
        .order('name');

      if (error) throw error;
      return data as Project[];
    },
  });
}
