// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
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
} from '@/components/admin/admin-dialog';
import AdsSelect from '@atlaskit/select';
import { toast } from 'sonner';
import SearchIcon from '@atlaskit/icon/core/search';
import PersonIcon from '@atlaskit/icon/core/person';
import EmailIcon from '@atlaskit/icon/core/email';
import PersonAddIcon from '@atlaskit/icon/core/person-add';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import ShieldIcon from '@atlaskit/icon/core/shield';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import EditIcon from '@atlaskit/icon/core/edit';
import { AdminGuard } from '@/components/admin/AdminGuard';

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

interface AutoLink {
  resourceId: string;
  profileId: string;
}

export default function UserAccessPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<ResourceUser | null>(null);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [bulkCreateOpen, setBulkCreateOpen] = useState(false);
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

  // Fetch resource inventory with profiles; collect auto-link candidates without mutating inside queryFn
  const { data: queryResult, isLoading } = useQuery<{ users: ResourceUser[]; autoLinks: AutoLink[] }>({
    queryKey: ['user-access-resources', userRoleMap],
    queryFn: async () => {
      const { data: resources, error: resourceError } = await supabase
        .from('resource_inventory')
        .select('id, profile_id, name, rid, is_active, email')
        .order('name', { ascending: true });

      if (resourceError) throw resourceError;

      const profileIds = (resources || [])
        .map(r => r.profile_id)
        .filter((id): id is string => id !== null);

      const ridsWithoutProfile = (resources || [])
        .filter(r => r.profile_id === null && r.rid)
        .map(r => r.rid as string);

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

      let profilesByRid: Record<string, { id: string; email: string }> = {};
      if (ridsWithoutProfile.length > 0) {
        const { data: ridProfiles, error: ridProfileError } = await supabase
          .from('profiles')
          .select('id, email, rid')
          .in('rid', ridsWithoutProfile);
        if (ridProfileError) throw ridProfileError;
        profilesByRid = (ridProfiles || []).reduce((acc, p) => {
          if (p.rid) acc[p.rid] = { id: p.id, email: p.email };
          return acc;
        }, {} as Record<string, { id: string; email: string }>);
      }

      const mappedUsers: ResourceUser[] = [];
      const autoLinks: AutoLink[] = [];

      for (const item of resources || []) {
        let linkedProfileId = item.profile_id;
        let email: string | null = null;

        if (item.profile_id) {
          email = profilesById[item.profile_id]?.email || item.email || null;
        } else if (item.rid && profilesByRid[item.rid]) {
          const matchedProfile = profilesByRid[item.rid];
          linkedProfileId = matchedProfile.id;
          email = matchedProfile.email || item.email || null;
          // Collect for post-query update rather than mutating inside queryFn
          autoLinks.push({ resourceId: item.id, profileId: matchedProfile.id });
        } else {
          email = item.email || null;
        }

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

      return { users: mappedUsers, autoLinks };
    },
    enabled: productRoles.length > 0,
  });

  const users = queryResult?.users || [];

  // Fire auto-link DB updates outside queryFn to keep queryFn pure
  useEffect(() => {
    const autoLinks = queryResult?.autoLinks;
    if (!autoLinks?.length) return;
    Promise.all(
      autoLinks.map(({ resourceId, profileId }) =>
        supabase
          .from('resource_inventory')
          .update({ profile_id: profileId })
          .eq('id', resourceId)
          .then(({ error }) => {
            if (error) console.error(`Auto-link failed for resource ${resourceId}:`, error);
          })
      )
    ).catch(console.error);
  }, [queryResult?.autoLinks]);

  // Create linked account mutation
  const createAccountMutation = useMutation({
    mutationFn: async ({ resourceId, email, fullName, rid }: { resourceId: string; email: string; fullName: string; rid?: string }) => {
      const { data, error } = await supabase.functions.invoke('create-linked-account', {
        body: { resourceInventoryId: resourceId, email, fullName, rid },
      });
      if (error) throw error;
      if (!data.ok) throw new Error(data.error || 'Failed to create account');
      return data;
    },
    onSuccess: () => {
      toast.success('Account created successfully');
      setCreateAccountOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['user-access-resources'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create account');
    },
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string | null }) => {
      const { error: deleteError } = await supabase
        .from('user_product_roles')
        .delete()
        .eq('user_id', userId);
      if (deleteError) throw deleteError;

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

  // Update email mutation — only writes to resource_inventory (HR domain)
  const updateEmailMutation = useMutation({
    mutationFn: async ({ resourceId, email }: { resourceId: string; email: string }) => {
      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (normalizedEmail && !emailRegex.test(normalizedEmail)) {
        throw new Error('Invalid email format');
      }
      const { error } = await supabase
        .from('resource_inventory')
        .update({ email: normalizedEmail || null })
        .eq('id', resourceId);
      if (error) throw error;
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

  const usersNeedingAccounts = useMemo(() => {
    return users.filter(u => !u.profile_id && u.email && u.role_id);
  }, [users]);

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
            rid: user.rid || undefined,
          },
        });
        if (error || !data?.ok) {
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
    <AdminGuard>
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>
            <span style={{ display: 'inline-flex', color: 'var(--ds-icon-brand, #0C66E4)' }}><PersonIcon label="" size="medium" /></span>
            User Access
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
            Manage resource roster, product role assignments, and Catalyst login provisioning
          </p>
        </div>
        {usersNeedingAccounts.length > 0 && (
          <Button
            appearance="primary"
            onClick={() => setBulkCreateOpen(true)}
            iconBefore={PeopleGroupIcon}
          >
            Create {usersNeedingAccounts.length} Account{usersNeedingAccounts.length > 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--ds-text-subtle, #44546F)', zIndex: 10 }}><SearchIcon label="" size="small" /></span>
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
                <th className="min-w-[180px] px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtlest, #626F86)' }}>Product Role</th>
                <th className="w-[80px] px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtlest, #626F86)' }}>Status</th>
                <th className="w-[160px] px-4 py-3 text-right text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtlest, #626F86)' }}>Actions</th>
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
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>{user.name}</td>
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
                                  updateEmailMutation.mutate({ resourceId: user.id, email: editingEmailValue });
                                } else if (e.key === 'Escape') {
                                  setEditingEmailId(null);
                                  setEditingEmailValue('');
                                }
                              }}
                            />
                          </div>
                          <button
                            className="h-7 w-7 flex items-center justify-center rounded"
                            onClick={() => updateEmailMutation.mutate({ resourceId: user.id, email: editingEmailValue })}
                            disabled={updateEmailMutation.isPending}
                          >
                            <span style={{ display: 'inline-flex', color: '#15803D' }}><CheckMarkIcon label="" size="small" /></span>
                          </button>
                          <button
                            className="h-7 w-7 flex items-center justify-center rounded"
                            onClick={() => { setEditingEmailId(null); setEditingEmailValue(''); }}
                          >
                            <span style={{ display: 'inline-flex', color: 'var(--ds-text-subtle, #44546F)' }}><CrossIcon label="" size="small" /></span>
                          </button>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-1.5 group cursor-pointer transition-colors"
                          onClick={() => { setEditingEmailId(user.id); setEditingEmailValue(user.email || ''); }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--ds-text, var(--cp-text-primary, #172B4D))')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--ds-text-subtle, #44546F)')}
                        >
                          {user.email ? (
                            <>
                              <span style={{ display: 'inline-flex', flexShrink: 0 }}><EmailIcon label="" size="small" /></span>
                              <span className="truncate">{user.email}</span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--ds-text-subtlest, #626F86)', fontStyle: 'italic' }}>No email</span>
                          )}
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ display: 'inline-flex', color: 'var(--ds-text-subtle, #44546F)' }}><EditIcon label="" size="small" /></span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.email ? (
                        (() => {
                          const roleOpts = [
                            { label: 'No role', value: 'none' },
                            ...productRoles.map(r => ({ label: r.name, value: r.id })),
                          ];
                          const curRole = user.role_id || 'none';
                          return (
                            <AdsSelect
                              menuPortalTarget={document.body}
                              value={roleOpts.find(o => o.value === curRole) || null}
                              options={roleOpts}
                              isDisabled={assignRoleMutation.isPending}
                              onChange={(opt) => {
                                if (!opt) return;
                                const userId = user.profile_id || user.id;
                                assignRoleMutation.mutate({
                                  userId,
                                  roleId: opt.value === 'none' ? null : opt.value,
                                });
                              }}
                              styles={{ control: (base: any) => ({ ...base, minHeight: 32, height: 32, fontSize: 14 }) }}
                            />
                          );
                        })()
                      ) : (
                        <span className="text-xs italic flex items-center gap-1" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
                          <span style={{ display: 'inline-flex' }}><ShieldIcon label="" size="small" /></span>
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
                        <Lozenge appearance="success">Account linked</Lozenge>
                      ) : user.email && user.role_id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Lozenge appearance="inprogress">Authorized</Lozenge>
                          <Button
                            appearance="default"
                            onClick={() => { setSelectedUser(user); setCreateAccountOpen(true); }}
                            iconBefore={PersonAddIcon}
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

      {/* Create Account Dialog */}
      <Dialog open={createAccountOpen} onOpenChange={setCreateAccountOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span style={{ display: 'inline-flex', color: 'var(--ds-icon-brand, #0C66E4)' }}><PersonAddIcon label="" size="medium" /></span>
              Create Account
            </DialogTitle>
            <DialogDescription>
              Create a login account for <strong>{selectedUser?.name}</strong> using their email{' '}
              <strong>{selectedUser?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
              This will create a new Catalyst login. The user will receive a password reset email to set their own password.
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
              {createAccountMutation.isPending ? 'Creating…' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Create Accounts Dialog */}
      <Dialog open={bulkCreateOpen} onOpenChange={(open) => !bulkProgress && setBulkCreateOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span style={{ display: 'inline-flex', color: 'var(--ds-icon-brand, #0C66E4)' }}><PeopleGroupIcon label="" size="medium" /></span>
              Bulk Create Accounts
            </DialogTitle>
            <DialogDescription>
              Create login accounts for {usersNeedingAccounts.length} user{usersNeedingAccounts.length !== 1 ? 's' : ''}{' '}
              who have an email but no account yet.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {bulkProgress ? (
              <div className="space-y-2">
                <p className="text-sm" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
                  Creating accounts… {bulkProgress.done} / {bulkProgress.total}
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
                  Each user will receive a password reset email to set their own password on first login.
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
            <Button appearance="subtle" onClick={() => setBulkCreateOpen(false)} isDisabled={!!bulkProgress}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleBulkCreate} isDisabled={!!bulkProgress}>
              {bulkProgress ? 'Creating…' : `Create ${usersNeedingAccounts.length} Account${usersNeedingAccounts.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminGuard>
  );
}
