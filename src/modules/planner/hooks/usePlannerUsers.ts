// ============================================================
// PLANNER USERS HOOK
// Fetches users for assignee dropdowns
// Falls back to seed data when database is empty
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlannerUser } from '../types';
import { SEED_USERS } from '../data/seedData';

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
        // Return seed data on error
        return SEED_USERS;
      }

      const users = (data || []).map((row): PlannerUser => ({
        id: row.id,
        name: row.full_name || 'Unknown',
        initials: (row.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
        role: 'Team Member',
        team: 'Team',
        online: Math.random() > 0.5,
      }));

      // If no data from DB, return seed data
      if (users.length === 0) {
        return SEED_USERS;
      }

      return users;
    },
  });
}
