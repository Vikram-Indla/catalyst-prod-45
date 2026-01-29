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
      // Fetch resource_inventory with profile join to get email from either source
      const { data, error } = await supabase
        .from('resource_inventory')
        .select(`
          id, 
          profile_id, 
          name, 
          email, 
          role_name, 
          department_name, 
          default_capacity_percent,
          profiles:profile_id (email)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching resources:', error);
        return [];
      }

      // Filter for resources with email in either resource_inventory OR linked profile
      return (data || [])
        .filter(r => {
          const inventoryEmail = r.email?.trim();
          const profileEmail = (r.profiles as any)?.email?.trim();
          return inventoryEmail || profileEmail;
        })
        .map((r): Resource => {
          // Use email from inventory, fallback to profile email
          const resolvedEmail = r.email?.trim() || (r.profiles as any)?.email?.trim() || null;
          return {
            id: r.id,
            profile_id: r.profile_id,
            name: r.name || 'Unknown',
            email: resolvedEmail,
            role: r.role_name || 'Team Member',
            department: r.department_name,
            capacity: r.default_capacity_percent || 100,
            initials: getInitials(r.name || ''),
          };
        });
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
