import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button/new';
import { Lozenge } from '@/components/ads';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Search, 
  Key, 
  RotateCcw, 
  UserCog,
  Mail,
  Eye,
  EyeOff,
  UserPlus,
  Users,
  Shield,
  Check,
  X,
  Pencil
} from 'lucide-react';

interface ProductRole {
  id: string;
  name: string;
  code: string;
}

interface ResourceUser {
  id: string;
  profile_id: string | null;
  name: string;
  email: string | null;
  rid: string | null;
  is_active: boolean;
  role_id: string | null;
  role_name: string | null;
}

export default function UserAccessPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<ResourceUser | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [bulkCreateOpen, setBulkCreateOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; errors: string[] } | null>(null);
  
  // Inline email editing state
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [editingEmailValue, setEditingEmailValue] = useState('');

  // Fetch product roles for dropdown
  const { data: productRoles = [] } = useQuery({
    queryKey: ['product-roles'],
    queryFn: async (): Promise<ProductRole[]> => {
      const { data, error } = await supabase
        .from('product_roles')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  // Fetch user role assignments
  const { data: userRoleAssignments = [] } = useQuery({
    queryKey: ['user-role-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_product_roles')
        .select('user_id, role_id');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Create a map of user_id to role_id
  const userRoleMap = useMemo(() => {
    const map: Record<string, string> = {};
    userRoleAssignments.forEach((assignment) => {
      map[assignment.user_id] = assignment.role_id;
    });
    return map;
  }, [userRoleAssignments]);

  // Fetch resource inventory with profiles, auto-linking by RID when profile_id is null
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['user-access-resources', userRoleMap],
    queryFn: async () => {
      // First, get all resources
      const { data: resources, error: resourceError } = await supabase
        .from('resource_inventory')
        .select('id, profile_id, name, rid, is_active, email')
        .order('name', { ascending: true });

      if (resourceError) throw resourceError;

      // Collect unique profile_ids (for direct link) and rids (for fallback matching)
      const profileIds = (resources || [])
        .map(r => r.profile_id)
        .filter((id): id is string => id !== null);

      const ridsWithoutProfile = (resources || [])
        .filter(r => r.profile_id === null && r.rid)
        .map(r => r.rid as string);

      // Fetch profiles by ID (direct link)
      let profilesById: Record<string, { id: string; email: string }> = {};
      if (profileIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', profileIds);

        if (profileError) throw profileError;

        profilesById = (profiles || []).reduce((acc, p) => {
          acc[p.id] = { id: p.id, email: p.email };
          return acc;
        }, {} as Record<string, { id: string; email: string }>);
      }

      // Fetch profiles by RID for auto-linking (when profile_id is null)
      let profilesByRid: Record<string, { id: string; email: string }> = {};
      if (ridsWithoutProfile.length > 0) {
        const { data: ridProfiles, error: ridProfileError } = await supabase
          .from('profiles')
          .select('id, email, rid')
          .in('rid', ridsWithoutProfile);

        if (ridProfileError) throw ridProfileError;

        profilesByRid = (ridProfiles || []).reduce((acc, p) => {
          if (p.rid) {
            acc[p.rid] = { id: p.id, email: p.email };
          }
          return acc;
        }, {} as Record<string, { id: string; email: string }>);
      }

      // Map resources with auto-linking
      const mappedUsers: ResourceUser[] = [];
      const updatePromises: Promise<void>[] = [];

      for (const item of resources || []) {
        let linkedProfileId = item.profile_id;
        let email: string | null = null;

        if (item.profile_id) {
          // Direct link exists - prefer profile email
          email = profilesById[item.profile_id]?.email || item.email || null;
        } else if (item.rid && profilesByRid[item.rid]) {
          // Auto-link by RID
          const matchedProfile = profilesByRid[item.rid];
          linkedProfileId = matchedProfile.id;
          email = matchedProfile.email || item.email || null;

          // Update resource_inventory.profile_id in the background
          updatePromises.push(
            (async () => {
              const { error } = await supabase
                .from('resource_inventory')
                .update({ profile_id: matchedProfile.id })
                .eq('id', item.id);
              if (error) console.error(`Failed to auto-link RID ${item.rid}:`, error);
            })()
          );
        } else {
          // No profile link - use inventory email directly
          email = item.email || null;
        }

        // Get role info for this user - check by profile_id first, then by resource id
        const roleId = linkedProfileId 
          ? userRoleMap[linkedProfileId] 
          : userRoleMap[item.id] || null;
        const role = roleId ? productRoles.find(r => r.id === roleId) : null;

        mappedUsers.push({
          id: item.id,
          profile_id: linkedProfileId,
          name: item.name || 'Unknown',
          email,
          rid: item.rid,
          is_active: item.is_active ?? true,
          role_id: roleId || null,
          role_name: role?.name || null,
        });
      }

      // Fire-and-forget auto-link updates
      if (updatePromises.length > 0) {
        Promise.all(updatePromises).catch(console.error);
      }

      return mappedUsers;
    },
    enabled: productRoles.length > 0,
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-set-password', {
        body: { userId, newPassword: password },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to set password');
      return data;
    },
    onSuccess: () => {
      toast.success('Password changed successfully. User will be required to change it on next login.');
      setChangePasswordOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to change password');
    },
  });

  // Reset password mutation (sends email)
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to reset password');
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Password reset link has been generated.');
      setResetPasswordOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reset password');
    },
  });

  // Create linked account mutation
  const createAccountMutation = useMutation({
    mutationFn: async ({ resourceId, email, fullName, rid }: { resourceId: string; email: string; fullName: string; rid?: string }) => {
      const { data, error } = await supabase.functions.invoke('create-linked-account', {
        body: { resourceInventoryId: resourceId, email, fullName, rid },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create account');
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Account created successfully');
      setCreateAccountOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['user-access-resources'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create account');
    },
  });

  // Assign role mutation - uses resource_id as user_id when no profile exists
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string | null }) => {
      // First, delete existing role assignment
      const { error: deleteError } = await supabase
        .from('user_product_roles')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) throw deleteError;

      // If a new role is being assigned, insert it
      if (roleId) {
        const { error: insertError } = await supabase
          .from('user_product_roles')
          .insert({ user_id: userId, role_id: roleId });
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user-role-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['user-access-resources'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update role');
    },
  });

  // Update email mutation - saves to both resource_inventory and profiles
  const updateEmailMutation = useMutation({
    mutationFn: async ({ resourceId, profileId, email }: { 
      resourceId: string; 
      profileId: string | null; 
      email: string;
    }) => {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (normalizedEmail && !emailRegex.test(normalizedEmail)) {
        throw new Error('Invalid email format');
      }

      // Update resource_inventory
      const { error: inventoryError } = await supabase
        .from('resource_inventory')
        .update({ email: normalizedEmail || null })
        .eq('id', resourceId);
      
      if (inventoryError) throw inventoryError;

      // If user has a profile, update profiles table too
      if (profileId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ email: normalizedEmail || null })
          .eq('id', profileId);
        
        if (profileError) throw profileError;
      }
    },
    onSuccess: () => {
      toast.success('Email updated successfully');
      setEditingEmailId(null);
      setEditingEmailValue('');
      queryClient.invalidateQueries({ queryKey: ['user-access-resources'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update email');
    },
  });

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.rid?.toLowerCase().includes(query) ||
        user.role_name?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Users with email + role but no profile (authorized but need login accounts)
  const usersNeedingAccounts = useMemo(() => {
    return users.filter(u => !u.profile_id && u.email && u.role_id);
  }, [users]);

  const handleChangePassword = () => {
    if (!selectedUser?.profile_id) {
      toast.error('This resource does not have an associated user account');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    changePasswordMutation.mutate({ 
      userId: selectedUser.profile_id, 
      password: newPassword 
    });
  };

  const handleResetPassword = () => {
    if (!selectedUser?.profile_id) {
      toast.error('This resource does not have an associated user account');
      return;
    }
    resetPasswordMutation.mutate(selectedUser.profile_id);
  };

  const handleCreateAccount = () => {
    if (!selectedUser?.email) {
      toast.error('Email is required to create an account');
      return;
    }
    createAccountMutation.mutate({
      resourceId: selectedUser.id,
      email: selectedUser.email,
      fullName: selectedUser.name,
      rid: selectedUser.rid || undefined,
    });
  };

  const openChangePassword = (user: ResourceUser) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setChangePasswordOpen(true);
  };

  const openResetPassword = (user: ResourceUser) => {
    setSelectedUser(user);
    setResetPasswordOpen(true);
  };

  const openCreateAccount = (user: ResourceUser) => {
    setSelectedUser(user);
    setCreateAccountOpen(true);
  };

  // Bulk create accounts for all users with email but no profile
  const handleBulkCreate = async () => {
    if (usersNeedingAccounts.length === 0) {
      toast.info('All users already have accounts');
      setBulkCreateOpen(false);
      return;
    }

    setBulkProgress({ done: 0, total: usersNeedingAccounts.length, errors: [] });
    const errors: string[] = [];
    let done = 0;

    for (const user of usersNeedingAccounts) {
      try {
        const { data, error } = await supabase.functions.invoke('create-linked-account', {
          body: { 
            resourceInventoryId: user.id, 
            email: user.email, 
            fullName: user.name,
            rid: user.rid || undefined 
          },
        });
        if (error || !data?.success) {
          errors.push(`${user.name}: ${data?.error || error?.message || 'Unknown error'}`);
        }
      } catch (err: any) {
        errors.push(`${user.name}: ${err.message || 'Unknown error'}`);
      }
      done++;
      setBulkProgress({ done, total: usersNeedingAccounts.length, errors: [...errors] });
    }

    setBulkProgress(null);
    setBulkCreateOpen(false);

    if (errors.length === 0) {
      toast.success(`Successfully created ${usersNeedingAccounts.length} account(s)`);
    } else {
      toast.warning(`Created ${usersNeedingAccounts.length - errors.length} account(s). ${errors.length} failed.`);
    }

    queryClient.invalidateQueries({ queryKey: ['user-access-resources'] });
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--ds-text, #172B4D)' }}>
            <UserCog className="h-6 w-6" style={{ color: 'var(--ds-icon-brand, #0C66E4)' }} />
            User Access
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
            Manage application access credentials for Catalyst users
          </p>
        </div>
        {usersNeedingAccounts.length > 0 && (
          <Button
            appearance="primary"
            onClick={() => setBulkCreateOpen(true)}
            iconBefore={<Users size={16} />}
          >
            Create {usersNeedingAccounts.length} Account{usersNeedingAccounts.length > 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 z-10" style={{ color: 'var(--ds-text-subtle, #44546F)' }} />
          <div style={{ paddingLeft: '36px' }}>
            <Textfield
              placeholder="Search by name, email, RID, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
        <Lozenge appearance="default">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
        </Lozenge>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--ds-border, #DCDFE4)', background: 'var(--ds-surface, #FFFFFF)' }}>
        <div className="overflow-auto h-[calc(100vh-280px)]">
          <table className="min-w-full" style={{ borderCollapse: 'collapse' }}>
            <thead className="sticky top-0 z-10" style={{ background: 'var(--ds-surface, #FFFFFF)', borderBottom: '1px solid var(--ds-border, #DCDFE4)' }}>
              <tr>
                <th className="w-[80px] px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtlest, #626F86)' }}>RID</th>
                <th className="min-w-[150px] px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtlest, #626F86)' }}>Name</th>
                <th className="min-w-[200px] px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtlest, #626F86)' }}>Email</th>
                <th className="min-w-[180px] px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtlest, #626F86)' }}>Role</th>
                <th className="w-[80px] px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtlest, #626F86)' }}>Status</th>
                <th className="w-[220px] px-4 py-3 text-right text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtlest, #626F86)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
                    Loading resources...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
                    No resources found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} style={{ borderTop: '1px solid var(--ds-border-layout, #EBECF0)' }}>
                    <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
                      {user.rid || '—'}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>{user.name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
                      {editingEmailId === user.id ? (
                        <div className="flex items-center gap-1">
                          <div style={{ width: '180px' }}>
                            <Textfield
                              type="email"
                              value={editingEmailValue}
                              onChange={(e) => setEditingEmailValue((e.target as HTMLInputElement).value)}
                              placeholder="Enter email..."
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateEmailMutation.mutate({
                                    resourceId: user.id,
                                    profileId: user.profile_id,
                                    email: editingEmailValue,
                                  });
                                } else if (e.key === 'Escape') {
                                  setEditingEmailId(null);
                                  setEditingEmailValue('');
                                }
                              }}
                            />
                          </div>
                          <button
                            className="h-7 w-7 flex items-center justify-center rounded"
                            onClick={() => {
                              updateEmailMutation.mutate({
                                resourceId: user.id,
                                profileId: user.profile_id,
                                email: editingEmailValue,
                              });
                            }}
                            disabled={updateEmailMutation.isPending}
                          >
                            <Check className="h-3.5 w-3.5" style={{ color: '#15803D' }} />
                          </button>
                          <button
                            className="h-7 w-7 flex items-center justify-center rounded"
                            onClick={() => {
                              setEditingEmailId(null);
                              setEditingEmailValue('');
                            }}
                          >
                            <X className="h-3.5 w-3.5" style={{ color: 'var(--ds-text-subtle, #44546F)' }} />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-1.5 group cursor-pointer transition-colors"
                          onClick={() => {
                            setEditingEmailId(user.id);
                            setEditingEmailValue(user.email || '');
                          }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--ds-text, #172B4D)')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--ds-text-subtle, #44546F)')}
                        >
                          {user.email ? (
                            <>
                              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--ds-text-subtlest, #626F86)', fontStyle: 'italic' }}>No email</span>
                          )}
                          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--ds-text-subtle, #44546F)' }} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {/* Role dropdown enabled when email exists */}
                      {user.email ? (
                        <Select
                          value={user.role_id || 'none'}
                          onValueChange={(value) => {
                            const userId = user.profile_id || user.id;
                            assignRoleMutation.mutate({
                              userId,
                              roleId: value === 'none' ? null : value,
                            });
                          }}
                          disabled={assignRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-full h-8 text-sm">
                            <div className="flex items-center gap-1.5">
                              <Shield className="h-3.5 w-3.5" style={{ color: 'var(--ds-text-subtle, #44546F)' }} />
                              <SelectValue placeholder="Select role" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="none">
                              <span style={{ color: 'var(--ds-text-subtle, #44546F)' }}>No role</span>
                            </SelectItem>
                            {productRoles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs italic flex items-center gap-1" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
                          <Shield className="h-3 w-3" />
                          No email
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.is_active ? (
                        <Lozenge appearance="success">Active</Lozenge>
                      ) : (
                        <Lozenge appearance="default">Inactive</Lozenge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.profile_id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            appearance="default"
                            onClick={() => openChangePassword(user)}
                            iconBefore={<Key size={14} />}
                          >
                            Change Password
                          </Button>
                          <Button
                            appearance="default"
                            onClick={() => openResetPassword(user)}
                            iconBefore={<RotateCcw size={14} />}
                          >
                            Reset
                          </Button>
                        </div>
                      ) : user.email && user.role_id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Lozenge appearance="inprogress">Authorized</Lozenge>
                          <Button
                            appearance="default"
                            onClick={() => openCreateAccount(user)}
                            iconBefore={<UserPlus size={14} />}
                          >
                            Create Login
                          </Button>
                        </div>
                      ) : user.email ? (
                        <span className="text-xs italic" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
                          Assign role to authorize
                        </span>
                      ) : (
                        <span className="text-xs italic" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
                          No email
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" style={{ color: 'var(--ds-icon-brand, #0C66E4)' }} />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{selectedUser?.name}</strong>. 
              The user will be required to change this password on their next login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="new-password" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>New Password</label>
              <div className="relative">
                <Textfield
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" style={{ color: 'var(--ds-text-subtle, #44546F)' }} />
                  ) : (
                    <Eye className="h-4 w-4" style={{ color: 'var(--ds-text-subtle, #44546F)' }} />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm-password" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>Confirm Password</label>
              <Textfield
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
                placeholder="Confirm new password"
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm" style={{ color: 'var(--ds-background-danger-bold, #CA3521)' }}>Passwords do not match</p>
            )}
          </div>
          <DialogFooter>
            <Button appearance="subtle" onClick={() => setChangePasswordOpen(false)}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleChangePassword}
              isDisabled={changePasswordMutation.isPending || !newPassword || newPassword !== confirmPassword}
            >
              {changePasswordMutation.isPending ? 'Setting...' : 'Set Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" style={{ color: 'var(--ds-icon-brand, #0C66E4)' }} />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Generate a password reset link for <strong>{selectedUser?.name}</strong>.
              {selectedUser?.email && (
                <> The link will be sent to <strong>{selectedUser.email}</strong>.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
              This will send a secure password reset link to the user's email address.
              The link will expire after a set period.
            </p>
          </div>
          <DialogFooter>
            <Button appearance="subtle" onClick={() => setResetPasswordOpen(false)}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleResetPassword}
              isDisabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Account Dialog */}
      <Dialog open={createAccountOpen} onOpenChange={setCreateAccountOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" style={{ color: 'var(--ds-icon-brand, #0C66E4)' }} />
              Create Account
            </DialogTitle>
            <DialogDescription>
              Create a login account for <strong>{selectedUser?.name}</strong> using their email{' '}
              <strong>{selectedUser?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
              This will create a new login account with a temporary password (<code>password@99</code>).
              The user will be required to change this password on their first login.
            </p>
          </div>
          <DialogFooter>
            <Button appearance="subtle" onClick={() => setCreateAccountOpen(false)}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleCreateAccount}
              isDisabled={createAccountMutation.isPending}
            >
              {createAccountMutation.isPending ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Create Accounts Dialog */}
      <Dialog open={bulkCreateOpen} onOpenChange={(open) => !bulkProgress && setBulkCreateOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: 'var(--ds-icon-brand, #0C66E4)' }} />
              Bulk Create Accounts
            </DialogTitle>
            <DialogDescription>
              Create login accounts for {usersNeedingAccounts.length} user{usersNeedingAccounts.length !== 1 ? 's' : ''} 
              who have an email but no account yet.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {bulkProgress ? (
              <div className="space-y-2">
                <p className="text-sm" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
                  Creating accounts... {bulkProgress.done} / {bulkProgress.total}
                </p>
                <div className="w-full rounded-full h-2" style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%`, background: 'var(--ds-background-brand-bold, #0C66E4)' }}
                  />
                </div>
                {bulkProgress.errors.length > 0 && (
                  <div className="text-xs max-h-24 overflow-y-auto" style={{ color: 'var(--ds-background-danger-bold, #CA3521)' }}>
                    {bulkProgress.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
                  Each account will be created with a temporary password (<code>password@99</code>).
                  Users will be required to change it on first login.
                </p>
                <div className="max-h-32 overflow-y-auto text-xs rounded p-2" style={{ color: 'var(--ds-text-subtle, #44546F)', border: '1px solid var(--ds-border, #DCDFE4)' }}>
                  {usersNeedingAccounts.map(u => (
                    <p key={u.id}>{u.name} ({u.email})</p>
                  ))}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              appearance="subtle"
              onClick={() => setBulkCreateOpen(false)}
              isDisabled={!!bulkProgress}
            >
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleBulkCreate}
              isDisabled={!!bulkProgress}
            >
              {bulkProgress ? 'Creating...' : `Create ${usersNeedingAccounts.length} Account${usersNeedingAccounts.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
