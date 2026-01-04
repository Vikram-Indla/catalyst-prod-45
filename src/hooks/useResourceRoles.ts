/**
 * Hook to fetch unique roles from the database
 * Used for role dropdown in Find Available Resources panel
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RoleOption {
  name: string;
  displayName: string;
  count: number;
}

/**
 * Formats a database role name to human-readable format
 * e.g., "program_manager" -> "Program Manager"
 */
function formatRoleName(role: string): string {
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

async function fetchResourceRoles(): Promise<RoleOption[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .not('role', 'is', null)
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
    .map(([name, count]) => ({ 
      name,
      displayName: formatRoleName(name),
      count 
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function useResourceRoles() {
  return useQuery({
    queryKey: ['resource-roles'],
    queryFn: fetchResourceRoles,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
