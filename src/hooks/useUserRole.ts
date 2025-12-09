import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type UserRole = 'admin' | 'program_manager' | 'team_lead' | 'user' | null;
export type ProductRoleCode = 'super_admin' | 'product_admin' | 'general_manager' | 'product_manager' | 'product_owner' | 'requester' | null;

export function useUserRole() {
  const { user } = useAuth();

  const { data: role, isLoading: isRoleLoading } = useQuery({
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

  // Also fetch product roles for the user
  const { data: productRoles, isLoading: isProductRolesLoading } = useQuery({
    queryKey: ['user-product-roles', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_product_roles')
        .select('role_id, product_roles(code)')
        .eq('user_id', user.id);

      if (error) return [];

      return data.map(r => (r.product_roles as any)?.code as ProductRoleCode).filter(Boolean);
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

  const hasProductRole = (roleCode: ProductRoleCode) => {
    if (!productRoles || productRoles.length === 0) return false;
    return productRoles.includes(roleCode);
  };

  const isAdmin = role === 'admin';
  const isSuperAdmin = hasProductRole('super_admin');
  const isProductAdmin = hasProductRole('product_admin') || isSuperAdmin;
  const isGeneralManager = hasProductRole('general_manager') || isSuperAdmin || isProductAdmin;
  const isProgramManager = role === 'admin' || role === 'program_manager';
  const isTeamLead = role === 'admin' || role === 'program_manager' || role === 'team_lead';
  
  // Enterprise access: admin, super_admin, product_admin, or general_manager
  const canAccessEnterprise = isAdmin || isSuperAdmin || isProductAdmin || isGeneralManager;
  // Capacity Planning access: same as enterprise access
  const canAccessCapacityPlanning = canAccessEnterprise;

  const isLoading = isRoleLoading || isProductRolesLoading;

  return {
    role,
    productRoles,
    isLoading,
    hasRole,
    hasProductRole,
    isAdmin,
    isSuperAdmin,
    isProductAdmin,
    isGeneralManager,
    isProgramManager,
    isTeamLead,
    canAccessEnterprise,
    canAccessCapacityPlanning,
  };
}
