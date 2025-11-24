import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type UserRole = 'admin' | 'program_manager' | 'team_lead' | 'user' | null;

export function useUserRole() {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // User has no role assigned, default to 'user'
        return 'user' as UserRole;
      }

      return data.role as UserRole;
    },
    enabled: !!user,
  });

  const hasRole = (requiredRole: UserRole) => {
    if (!role) return false;
    
    const roleHierarchy: Record<string, number> = {
      admin: 4,
      program_manager: 3,
      team_lead: 2,
      user: 1,
    };

    const userRoleLevel = roleHierarchy[role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole || 'user'] || 0;

    return userRoleLevel >= requiredRoleLevel;
  };

  const isAdmin = role === 'admin';
  const isProgramManager = role === 'admin' || role === 'program_manager';
  const isTeamLead = role === 'admin' || role === 'program_manager' || role === 'team_lead';

  return {
    role,
    isLoading,
    hasRole,
    isAdmin,
    isProgramManager,
    isTeamLead,
  };
}
