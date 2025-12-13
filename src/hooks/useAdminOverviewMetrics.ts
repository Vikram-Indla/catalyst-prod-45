/**
 * Admin Overview Metrics Sources (MANDATORY DOCUMENTATION):
 * ──────────────────────────────────────────────────────────
 * usersCount         -> useUsers() from src/hooks/useUsers.ts (profiles table)
 * integrationsCount  -> Inline query from integration_connectors table (used in src/pages/admin/Integrations.tsx)
 * auditEventsCount   -> Inline query from activity_logs table (used in src/pages/admin/Activity.tsx)
 * departmentsCount   -> useDepartments() from src/hooks/useDepartmentsAndOwners.ts
 * businessOwnersCount-> useBusinessOwners() from src/hooks/useDepartmentsAndOwners.ts
 * teamsCount         -> useTeams() from src/hooks/useTeams.ts
 * programsCount      -> Inline query from programs table (pattern from src/pages/admin/OrgSetup.tsx)
 * recentActivity     -> useRecentRooms() from src/hooks/useRecentRooms.ts (recent_activity table)
 * adminChanges       -> Inline query from activity_logs table filtered to admin actions
 * 
 * NO new endpoints created. All sources are existing database tables/hooks.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUsers } from './useUsers';
import { useDepartments, useBusinessOwners } from './useDepartmentsAndOwners';
import { useTeams } from './useTeams';
import { useRecentRooms, RecentRoom } from './useRecentRooms';

interface AdminOverviewMetrics {
  usersCount: number;
  activeUsersCount: number;
  integrationsCount: number;
  auditEventsCount: number;
  referenceDataCount: number;
  settingsCount: number;
  securityPoliciesCount: number;
  isLoading: boolean;
}

interface AdminChange {
  id: string;
  action: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  created_at: string | null;
}

export function useAdminOverviewMetrics(): AdminOverviewMetrics {
  // Source: useUsers() from src/hooks/useUsers.ts
  const { data: users, isLoading: usersLoading } = useUsers();

  // Source: integration_connectors table (same as src/pages/admin/Integrations.tsx)
  const { data: integrationsData, isLoading: integrationsLoading } = useQuery({
    queryKey: ['admin-integrations-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_connectors')
        .select('id, last_test_status')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Source: activity_logs table (same as src/pages/admin/Activity.tsx)
  const { data: auditEventsCount, isLoading: auditLoading } = useQuery({
    queryKey: ['admin-audit-events-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Source: useDepartments() from src/hooks/useDepartmentsAndOwners.ts
  const { data: departments, isLoading: deptLoading } = useDepartments();

  // Source: useBusinessOwners() from src/hooks/useDepartmentsAndOwners.ts
  const { data: businessOwners, isLoading: ownersLoading } = useBusinessOwners();

  // Source: useTeams() from src/hooks/useTeams.ts
  const { data: teams, isLoading: teamsLoading } = useTeams();

  // Source: programs table (same pattern as src/pages/admin/OrgSetup.tsx)
  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ['admin-programs-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Source: auth_settings table for security/config count
  const { data: authSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['admin-auth-settings-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('auth_settings')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Calculate metrics
  const usersCount = users?.length || 0;
  const activeUsersCount = users?.filter(u => u.approval_status === 'APPROVED').length || 0;
  const integrationsCount = integrationsData?.filter(i => i.last_test_status === 'success').length || 0;
  
  // Reference data = departments + business owners + teams + programs
  const referenceDataCount = 
    (departments?.length || 0) + 
    (businessOwners?.length || 0) + 
    (teams?.length || 0) + 
    (programs?.length || 0);

  const settingsCount = authSettings || 0;
  
  // TODO: Security policies table does not exist yet - showing 0
  const securityPoliciesCount = 0;

  const isLoading = usersLoading || integrationsLoading || auditLoading || 
    deptLoading || ownersLoading || teamsLoading || programsLoading || settingsLoading;

  return {
    usersCount,
    activeUsersCount,
    integrationsCount,
    auditEventsCount: auditEventsCount || 0,
    referenceDataCount,
    settingsCount,
    securityPoliciesCount,
    isLoading,
  };
}

export function useRecentAdminChanges(limit: number = 5) {
  // Source: activity_logs table filtered to admin-related entity types
  // Same table used in src/pages/admin/Activity.tsx
  return useQuery({
    queryKey: ['admin-recent-changes', limit],
    queryFn: async () => {
      const adminEntityTypes = [
        'user_roles', 'profiles', 'integration_connectors', 
        'teams', 'programs', 'departments', 'business_owners',
        'product_roles', 'auth_settings'
      ];

      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, action, actor_id, entity_type, entity_id, created_at')
        .in('entity_type', adminEntityTypes)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as AdminChange[];
    },
  });
}

// Re-export for convenience
export { useRecentRooms };
export type { RecentRoom };
