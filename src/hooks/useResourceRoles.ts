/**
 * Hook to fetch unique roles from the database
 * Used for role dropdown in Find Available Resources panel
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RoleOption {
  name: string;
  count: number;
}

async function fetchResourceRoles(): Promise<RoleOption[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .order('role');

  if (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }

  // Build unique role counts
  const roleMap = new Map<string, number>();
  data?.forEach(item => {
    if (item.role) {
      roleMap.set(item.role, (roleMap.get(item.role) || 0) + 1);
    }
  });

  return Array.from(roleMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function useResourceRoles() {
  return useQuery({
    queryKey: ['resource-roles'],
    queryFn: fetchResourceRoles,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
