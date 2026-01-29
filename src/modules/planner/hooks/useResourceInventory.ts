// ============================================================
// RESOURCE INVENTORY HOOK
// Fetches active resources with profile_id for workstream member selection
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isValidUUID } from '@/lib/utils/assertUuid';

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
      type InventoryRow = {
        id: string;
        profile_id: string | null;
        name: string | null;
        email: string | null;
        role_name: string | null;
        department_name: string | null;
        default_capacity_percent: number | null;
      };

      // Step 1: Fetch ALL active resources from resource_inventory
      const { data, error } = await supabase
        .from('resource_inventory')
        .select('id, profile_id, name, email, role_name, department_name, default_capacity_percent')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching resources:', error);
        return [];
      }

      const inventoryRows = (data || []) as unknown as InventoryRow[];

      // Step 2: Collect profile IDs where inventory email is missing (to batch-fetch from profiles)
      const profileIdsNeedingEmail = Array.from(
        new Set(
          inventoryRows
            .filter(r => !(r.email && r.email.trim()))
            .map(r => r.profile_id)
            .filter((id): id is string => isValidUUID(id))
        )
      );

      const profileEmailById = new Map<string, string>();
      if (profileIdsNeedingEmail.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', profileIdsNeedingEmail);

        if (profilesError) {
          console.error('Error fetching profile emails:', profilesError);
        } else {
          for (const p of profiles || []) {
            if (p?.id && p?.email && p.email.trim()) {
              profileEmailById.set(p.id, p.email.trim());
            }
          }
        }
      }

      // Step 3: Map ALL resources - include everyone (with or without email)
      // Resolve email from inventory first, fallback to profiles
      return inventoryRows.map((r): Resource => {
        const resolvedEmail = r.email?.trim() || (r.profile_id ? profileEmailById.get(r.profile_id) : undefined) || null;
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
