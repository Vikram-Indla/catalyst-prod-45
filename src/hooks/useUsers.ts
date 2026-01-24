import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ApprovalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'DISABLED';

export interface UserProfile {
  id: string;
  rid: string | null;  // 3-digit Resource ID (e.g., 001, 002)
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  approval_status: ApprovalStatus | null;
  requested_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  signup_attempts_count: number | null;
  last_login: string | null;
  created_at: string | null;
  updated_at: string | null;
  roles: UserRoleInfo[];
  business_lines: string[];
  // Vendor/Contract metadata
  vendor: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  vendor_name: string | null;  // From resource_inventory
  country: string | null;
  country_code: string | null;
  country_flag_svg_url: string | null;
  location: string | null;
  // Additional capacity planning fields from resource_inventory
  department_id: string | null;  // UUID FK to capacity_departments
  department_name: string | null;
  assignment_id: string | null;  // UUID FK to resource_assignments
  assignment_name: string | null;
  vendor_id: string | null;  // UUID FK to resource_vendors
  job_role: string | null;  // Job title/role from resource_inventory (e.g. ".NET Developer")
  resource_type: string | null;  // Fixed, Core, or Freelance
  ctc: number | null;  // Cost to Company in SAR
}

// Derive display status from approval_status
export function getDisplayStatus(approvalStatus: ApprovalStatus | null): 'Active' | 'Inactive' | 'Pending' {
  switch (approvalStatus) {
    case 'APPROVED':
      return 'Active';
    case 'PENDING_APPROVAL':
      return 'Pending';
    case 'REJECTED':
    case 'DISABLED':
    default:
      return 'Inactive';
  }
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
  roleIds: string[];
  businessLines?: string[];
}

export function useUsers() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      // Fetch all profiles with approval and vendor fields
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*, rid, approval_status, requested_at, approved_at, rejected_at, rejection_reason, signup_attempts_count, vendor, contract_start_date, contract_end_date, country, country_code, country_flag_svg_url, location, resource_type, ctc')
        .order('vendor', { ascending: true, nullsFirst: false })
        .order('full_name', { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch ALL resource_inventory records (including those without profile_id)
      const { data: resourceInventory } = await (supabase as any)
        .from('resource_inventory')
        .select('id, rid, profile_id, name, contract_start_date, contract_end_date, vendor_name, role_name, assignment_id, department_id, department_name, vendor_id, country_id, location_id, resource_type, ctc');
      
      // Fetch reference tables for lookups
      const [
        { data: resourceAssignments },
        { data: capacityDepartments },
        { data: resourceVendors },
        { data: resourceCountries },
        { data: resourceLocations },
      ] = await Promise.all([
        supabase.from('resource_assignments').select('id, name').eq('is_active', true),
        supabase.from('capacity_departments').select('id, name').eq('is_active', true),
        supabase.from('resource_vendors').select('id, name').eq('is_active', true),
        supabase.from('resource_countries').select('id, name, code').eq('is_active', true),
        supabase.from('resource_locations').select('id, name').eq('is_active', true),
      ]);

      // Create lookup maps
      const assignmentMap = new Map((resourceAssignments || []).map(a => [a.id, a.name]));
      const departmentMap = new Map((capacityDepartments || []).map(d => [d.id, d.name]));
      const vendorMap = new Map((resourceVendors || []).map(v => [v.id, v.name]));
      const countryMap = new Map((resourceCountries || []).map(c => [c.id, { name: c.name, code: c.code }]));
      const locationMap = new Map((resourceLocations || []).map(l => [l.id, l.name]));

      // Create lookup map by profile_id with resolved names (for linked records)
      const inventoryByProfileId = new Map(
        ((resourceInventory || []) as any[])
          .filter(r => r.profile_id)
          .map(r => [r.profile_id, {
            ...r,
            assignment_name: r.assignment_id ? assignmentMap.get(r.assignment_id) : null,
            department_name: r.department_id ? departmentMap.get(r.department_id) : null,
            resolved_vendor_name: r.vendor_id ? vendorMap.get(r.vendor_id) : r.vendor_name,
            resolved_country: r.country_id ? countryMap.get(r.country_id) : null,
            resolved_location: r.location_id ? locationMap.get(r.location_id) : null,
          }])
      );

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
            business_lines: ur.business_lines || [],
          });
        }
        return acc;
      }, {} as Record<string, UserRoleInfo[]>);

      // Get profile IDs that are already linked
      const linkedProfileIds = new Set(
        (resourceInventory || []).filter(r => r.profile_id).map(r => r.profile_id)
      );

      // Build user list from profiles
      const profileUsers = (profiles || []).map((profile) => {
        const roles = userRolesMap[profile.id] || [];
        const allBusinessLines = roles.flatMap((r) => r.business_lines);
        const inventory = inventoryByProfileId.get(profile.id);
        return {
          ...profile,
          roles,
          business_lines: [...new Set(allBusinessLines)],
          contract_start_date: inventory?.contract_start_date || profile.contract_start_date || null,
          contract_end_date: inventory?.contract_end_date || profile.contract_end_date || null,
          vendor_name: inventory?.resolved_vendor_name || inventory?.vendor_name || profile.vendor || null,
          vendor: inventory?.resolved_vendor_name || profile.vendor || null,
          vendor_id: inventory?.vendor_id || null,
          department_id: inventory?.department_id || null,
          department_name: inventory?.department_name || null,
          assignment_id: inventory?.assignment_id || null,
          assignment_name: inventory?.assignment_name || null,
          job_role: inventory?.role_name || null,
          country: inventory?.resolved_country?.name || profile.country || null,
          country_code: inventory?.resolved_country?.code || profile.country_code || null,
          location: inventory?.resolved_location || profile.location || null,
          resource_type: inventory?.resource_type || profile.resource_type || null,
          ctc: inventory?.ctc ?? profile.ctc ?? null,
        } as UserProfile;
      });

      // Build user list from unlinked resource_inventory records
      const unlinkedInventory = ((resourceInventory || []) as any[])
        .filter(r => !r.profile_id)
        .map(r => {
          const resolvedCountry = r.country_id ? countryMap.get(r.country_id) : null;
          return {
            id: r.id, // Use inventory id as the user id
            rid: r.rid || null, // Use RID from resource_inventory
            email: null, // No email stored in resource_inventory
            full_name: r.name || null,
            avatar_url: null,
            approval_status: 'APPROVED' as ApprovalStatus, // Imported users are active
            requested_at: null,
            approved_at: null,
            rejected_at: null,
            rejection_reason: null,
            signup_attempts_count: null,
            last_login: null,
            created_at: null,
            updated_at: null,
            roles: [],
            business_lines: [],
            vendor: r.vendor_id ? vendorMap.get(r.vendor_id) || r.vendor_name : r.vendor_name,
            contract_start_date: r.contract_start_date || null,
            contract_end_date: r.contract_end_date || null,
            vendor_name: r.vendor_id ? vendorMap.get(r.vendor_id) || r.vendor_name : r.vendor_name,
            country: resolvedCountry?.name || null,
            country_code: resolvedCountry?.code || null,
            country_flag_svg_url: null,
            location: r.location_id ? locationMap.get(r.location_id) || null : null,
            department_id: r.department_id || null,
            department_name: r.department_id ? departmentMap.get(r.department_id) || null : null,
            assignment_id: r.assignment_id || null,
            assignment_name: r.assignment_id ? assignmentMap.get(r.assignment_id) || null : null,
            vendor_id: r.vendor_id || null,
            job_role: r.role_name || null,
            resource_type: r.resource_type || null,
            ctc: r.ctc ?? null,
          } as UserProfile;
        });

      // Combine both lists and sort by department, then name
      const allUsers = [...profileUsers, ...unlinkedInventory].sort((a, b) => {
        const deptA = a.department_name || '';
        const deptB = b.department_name || '';
        if (deptA !== deptB) return deptA.localeCompare(deptB);
        const nameA = a.full_name || '';
        const nameB = b.full_name || '';
        return nameA.localeCompare(nameB);
      });

      return allUsers;
    },
  });

  // Keep users list fresh when profiles / roles / resource_inventory / reference tables change
  // This ensures real-time sync across all frontend instances
  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users-list'] });
    
    const channel = supabase
      .channel('admin-users-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_product_roles' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_roles' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_inventory' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'capacity_departments' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_vendors' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_locations' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_countries' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_assignments' }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      // Call the edge function to create the user
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email.toLowerCase(),
          roleIds: input.roleIds,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create user');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      queryClient.invalidateQueries({ queryKey: ['product-roles'] });
      toast.success('User created successfully');
    },
    onError: (error) => {
      // Don't show toast here, let the component handle the specific error message
      console.error('Failed to create user:', error);
    },
  });
}

export function useUpdateUserEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, email }: { userId: string; email: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ email: email.toLowerCase().trim(), updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      return { userId, email };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      toast.success('Email updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update email:', error);
      toast.error('Failed to update email');
    },
  });
}

export function useUpdateUserRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string; roleIds: string[] }) => {
      // First, delete all existing roles for this user
      const { error: deleteError } = await supabase
        .from('user_product_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Then insert the new roles
      if (roleIds.length > 0) {
        const roleInserts = roleIds.map(roleId => ({
          user_id: userId,
          role_id: roleId,
          business_lines: []
        }));

        const { error: insertError } = await supabase
          .from('user_product_roles')
          .insert(roleInserts);

        if (insertError) throw insertError;
      }

      return { userId, roleIds };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      queryClient.invalidateQueries({ queryKey: ['product-roles'] });
      toast.success('User roles updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update user roles:', error);
      toast.error('Failed to update roles');
    }
  });
}

// Approve a pending user
export function useApproveUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          approval_status: 'APPROVED',
          approved_at: new Date().toISOString(),
          approved_by: currentUser?.id,
          status: 'Active',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Log the approval
      await (supabase as any).from('auth_audit_log').insert({
        user_id: userId,
        event_type: 'user_approved',
        actor_id: currentUser?.id,
        created_at: new Date().toISOString()
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      toast.success('User approved successfully');
    },
    onError: (error) => {
      toast.error('Failed to approve user: ' + (error as Error).message);
    }
  });
}

// Reject a pending user
export function useRejectUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          approval_status: 'REJECTED',
          rejected_at: new Date().toISOString(),
          rejected_by: currentUser?.id,
          rejection_reason: reason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Log the rejection
      await (supabase as any).from('auth_audit_log').insert({
        user_id: userId,
        event_type: 'user_rejected',
        actor_id: currentUser?.id,
        event_details: { reason },
        created_at: new Date().toISOString()
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      toast.success('User rejected');
    },
    onError: (error) => {
      toast.error('Failed to reject user: ' + (error as Error).message);
    }
  });
}

// Disable an approved user
export function useDisableUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          approval_status: 'DISABLED',
          status: 'Inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Log the action
      await (supabase as any).from('auth_audit_log').insert({
        user_id: userId,
        event_type: 'user_disabled',
        actor_id: currentUser?.id,
        created_at: new Date().toISOString()
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      toast.success('User disabled');
    },
    onError: (error) => {
      toast.error('Failed to disable user: ' + (error as Error).message);
    }
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) {
        throw new Error(error.message || 'Failed to delete user');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onMutate: async (userId: string) => {
      // Optimistically remove from UI immediately
      await queryClient.cancelQueries({ queryKey: ['users-list'] });

      const previousUsers = queryClient.getQueryData<UserProfile[]>(['users-list']);

      queryClient.setQueryData<UserProfile[]>(['users-list'], (old) =>
        (old || []).filter((u) => u.id !== userId)
      );

      toast.loading('Removing user…', { id: `delete-user-${userId}` });

      return { previousUsers };
    },
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      toast.success('User removed from the system', { id: `delete-user-${userId}` });
    },
    onError: (error, userId, context) => {
      // Rollback optimistic update
      if (context?.previousUsers) {
        queryClient.setQueryData(['users-list'], context.previousUsers);
      }
      toast.error((error as Error).message || 'Failed to remove user', {
        id: `delete-user-${userId}`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
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
        ur.product_roles?.code === 'super_admin'
      ) || false;
    }
  });
}
