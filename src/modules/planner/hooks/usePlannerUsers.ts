// ============================================================
// PLANNER USERS HOOK
// Fetches users for assignee dropdowns
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlannerUser } from '../types';

export function usePlannerUsers() {
  return useQuery({
    queryKey: ['planner-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name')
        .limit(50);

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      return (data || []).map((row): PlannerUser => ({
        id: row.id,
        name: row.full_name || 'Unknown',
        initials: (row.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
        role: 'Team Member',
        team: 'Team',
        online: Math.random() > 0.5,
      }));
    },
  });
}
