import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type UserRole = 'admin' | 'program_manager' | 'team_lead' | 'user' | null;
export type ProductRoleCode = 'super_admin' | 'product_admin' | 'general_manager' | 'product_manager' | 'product_owner' | 'requester' | 'enterprise_architect' | 'project_manager' | null;

export function useUserRole() {
  const { user } = useAuth();

  // Combine both queries into a single parallel fetch for efficiency
  const { data: roleData, isLoading } = useQuery({
    queryKey: ['user-roles-combined', user?.id],
    queryFn: async () => {
      if (!user) return { role: 'user' as UserRole, productRoles: [] as ProductRoleCode[] };

      // Fetch both in parallel
      const [roleResult, productRolesResult] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('user_product_roles')
          .select('role_id, product_roles(code)')
          .eq('user_id', user.id)
      ]);

      const role = roleResult.error || !roleResult.data 
        ? 'user' as UserRole 
        : roleResult.data.role as UserRole;

      const productRoles = productRolesResult.error || !productRolesResult.data
        ? []
        : productRolesResult.data
            .map(r => (r.product_roles as any)?.code as ProductRoleCode)
            .filter(Boolean);

      return { role, productRoles };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const role = roleData?.role ?? null;
  const productRoles = roleData?.productRoles ?? [];

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
  const isProductOwner = hasProductRole('product_owner');
  const isProgramManager = role === 'admin' || role === 'program_manager';
  const isTeamLead = role === 'admin' || role === 'program_manager' || role === 'team_lead';
  
  // Enterprise access: admin, super_admin, product_admin, general_manager, or product_owner
  const canAccessEnterprise = isAdmin || isSuperAdmin || isProductAdmin || isGeneralManager || isProductOwner;
  // Capacity Planning access: same as enterprise access
  const canAccessCapacityPlanning = canAccessEnterprise;
  
  // Product Owner only role check - user has ONLY product_owner role and no other elevated roles
  const isProductOwnerOnly = isProductOwner && 
    !isAdmin && !isSuperAdmin && !isProductAdmin && !isGeneralManager && !isProgramManager;

  // isLoading is already declared from the combined query above

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
    isProductOwner,
    isProductOwnerOnly,
    isProgramManager,
    isTeamLead,
    canAccessEnterprise,
    canAccessCapacityPlanning,
  };
}
