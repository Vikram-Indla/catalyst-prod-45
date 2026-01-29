// ============================================================
// RESOURCE INVENTORY HOOK
// Fetches active resources with profile_id for workstream member selection
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Resource {
  id: string;
  profile_id: string | null;
  name: string;
  email: string | null;
  role: string;
  department: string | null;
  capacity: number;
  initials: string;
}

export function useResourceInventory() {
  return useQuery({
    queryKey: ['resource-inventory'],
    queryFn: async (): Promise<Resource[]> => {
      const { data, error } = await supabase
        .from('resource_inventory')
        .select('id, profile_id, name, email, role_name, department_name, default_capacity_percent')
        .eq('is_active', true)
        .not('email', 'is', null) // Only resources with email IDs
        .order('name');

      if (error) {
        console.error('Error fetching resources:', error);
        return [];
      }

      // Filter out empty emails as well
      return (data || [])
        .filter(r => r.email && r.email.trim() !== '')
        .map((r): Resource => ({
          id: r.id,
          profile_id: r.profile_id,
          name: r.name || 'Unknown',
          email: r.email,
          role: r.role_name || 'Team Member',
          department: r.department_name,
          capacity: r.default_capacity_percent || 100,
          initials: getInitials(r.name || ''),
        }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';
}
