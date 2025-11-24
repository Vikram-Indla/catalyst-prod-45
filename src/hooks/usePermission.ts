import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserRole } from './useUserRole';

type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'link' | 'move' | 'configure';
type PermissionScope = 'global' | 'portfolio' | 'program' | 'team';

export function usePermission(
  entityType: string,
  action: PermissionAction,
  scopeType: PermissionScope = 'global',
  scopeId?: string
) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  const { data: hasPermission, isLoading } = useQuery({
    queryKey: ['permission', user?.id, entityType, action, scopeType, scopeId],
    queryFn: async () => {
      if (!user) return false;
      
      // Admins have all permissions
      if (isAdmin) return true;

      const { data, error } = await supabase.rpc('check_permission', {
        _user_id: user.id,
        _entity_type: entityType,
        _action: action,
        _scope_type: scopeType,
        _scope_id: scopeId || null,
      });

      if (error) {
        console.error('Permission check error:', error);
        return false;
      }

      return data || false;
    },
    enabled: !!user,
  });

  return {
    hasPermission: hasPermission ?? false,
    isLoading,
  };
}
