import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  status: 'Active' | 'Inactive' | 'Pending';
  last_login: string | null;
  created_at: string | null;
  updated_at: string | null;
  roles: UserRoleInfo[];
  business_lines: string[];
}

export interface UserRoleInfo {
  id: string;
  role_id: string;
  role_name: string;
  role_code: string;
  business_lines: string[];
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  status: 'Active' | 'Inactive';
  roleIds: string[];
  businessLines?: string[];
}

export function useUsers() {
  return useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch all user_product_roles with role info
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_product_roles')
        .select('id, user_id, role_id, business_lines');

      if (rolesError) throw rolesError;

      // Fetch all product_roles for mapping
      const { data: productRoles, error: productRolesError } = await supabase
        .from('product_roles')
        .select('id, name, code');

      if (productRolesError) throw productRolesError;

      const roleMap = (productRoles || []).reduce((acc, r) => {
        acc[r.id] = { name: r.name, code: r.code };
        return acc;
      }, {} as Record<string, { name: string; code: string }>);

      // Map user roles to profiles
      const userRolesMap = (userRoles || []).reduce((acc, ur) => {
        if (!acc[ur.user_id]) {
          acc[ur.user_id] = [];
        }
        const roleInfo = roleMap[ur.role_id];
        if (roleInfo) {
          acc[ur.user_id].push({
            id: ur.id,
            role_id: ur.role_id,
            role_name: roleInfo.name,
            role_code: roleInfo.code,
            business_lines: ur.business_lines || []
          });
        }
        return acc;
      }, {} as Record<string, UserRoleInfo[]>);

      return (profiles || []).map(profile => {
        const roles = userRolesMap[profile.id] || [];
        const allBusinessLines = roles.flatMap(r => r.business_lines);
        return {
          ...profile,
          roles,
          business_lines: [...new Set(allBusinessLines)]
        } as UserProfile;
      });
    }
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      // Check if email already exists
      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', input.email)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        throw new Error('A user with this email already exists.');
      }

      // Generate a UUID for the new user
      const newUserId = crypto.randomUUID();
      const fullName = `${input.firstName} ${input.lastName}`.trim();

      // Create the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: newUserId,
          email: input.email,
          full_name: fullName,
          status: input.status,
          role: 'user' // Default system role
        });

      if (profileError) throw profileError;

      // Create user_product_roles entries for each selected role
      if (input.roleIds.length > 0) {
        const roleInserts = input.roleIds.map(roleId => ({
          user_id: newUserId,
          role_id: roleId,
          business_lines: input.businessLines || []
        }));

        const { error: rolesError } = await supabase
          .from('user_product_roles')
          .insert(roleInserts);

        if (rolesError) throw rolesError;
      }

      return { id: newUserId, email: input.email, full_name: fullName };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      queryClient.invalidateQueries({ queryKey: ['product-roles'] });
      toast.success('User created successfully');
    },
    onError: (error) => {
      // Don't show toast here, let the component handle the specific error message
      console.error('Failed to create user:', error);
    }
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: 'Active' | 'Inactive' }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      toast.success('User status updated');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + (error as Error).message);
    }
  });
}

export function useIsSuperAdmin() {
  return useQuery({
    queryKey: ['is-super-admin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check system-level admin role in user_roles table first
      const { data: systemRoles, error: systemError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (!systemError && systemRoles?.some(r => r.role === 'admin')) {
        return true;
      }

      // Also check product-level Super Admin role in user_product_roles
      const { data: productRoles, error: productError } = await supabase
        .from('user_product_roles')
        .select('role_id, product_roles!inner(code)')
        .eq('user_id', user.id);

      if (productError) return false;

      return productRoles?.some((ur: any) => 
        ur.product_roles?.code === 'super_admin' || ur.product_roles?.code === 'product_admin'
      ) || false;
    }
  });
}
