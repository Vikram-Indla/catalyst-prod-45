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
import { catalystToast } from '@/lib/catalystToast';
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
      catalystToast.success('Account created successfully');
      setCreateAccountOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['user-access-resources'] });
    },
    onError: (error: Error) => {
      catalystToast.error(error.message || 'Failed to create account');
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
      catalystToast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user-role-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['user-access-resources'] });
    },
    onError: (error: Error) => {
      catalystToast.error(error.message || 'Failed to update role');
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
      catalystToast.success('Email updated successfully');
      setEditingEmailId(null);
      setEditingEmailValue('');
      queryClient.invalidateQueries({ queryKey: ['user-access-resources'] });
    },
    onError: (error: Error) => {
      catalystToast.error(error.message || 'Failed to update email');
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
      catalystToast.error('Email is required to create an account');
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
      catalystToast.info('All users already have accounts');
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
      catalystToast.success(`Successfully created ${usersNeedingAccounts.length} account(s)`);
    } else {
      catalystToast.warning(`Created ${usersNeedingAccounts.length - errors.length} account(s). ${errors.length} failed.`);
    }

    queryClient.invalidateQueries({ queryKey: ['user-access-resources'] });
  };

  return (
    <AdminGuard>
    <div
      style={{
        padding: '24px 32px 48px',
        maxWidth: 1280,
        color: 'var(--ds-text, #292A2E)',
        fontFamily:
          '"Atlassian Sans", ui-sans-serif, -apple-system, system-ui, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header — Jira admin parity: H1 24/653 + subtitle + right-aligned primary button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 653,
              lineHeight: '28px',
              color: 'var(--ds-text, #292A2E)',
              margin: 0,
              letterSpacing: 'normal',
            }}
          >
            User access
          </h1>
        </div>
        {usersNeedingAccounts.length > 0 && (
          <Button
            appearance="primary"
            onClick={() => setBulkCreateOpen(true)}
            iconBefore={PeopleGroupIcon}
          >
            Create {usersNeedingAccounts.length} account{usersNeedingAccounts.length > 1 ? 's' : ''}
          </Button>
        )}
      </div>
      <p
        style={{
          fontSize: 14,
          fontWeight: 400,
          color: 'var(--ds-text-subtle, #505258)',
          margin: '0 0 24px 0',
          lineHeight: '20px',
          maxWidth: 760,
        }}
      >
        Manage resource roster, product role assignments, and Catalyst login provisioning.
      </p>

      {/* Filter row — Jira filter input + count chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ flex: '0 1 360px' }}>
          <Textfield
            placeholder="Filter resources by name, email, RID, or role"
            value={searchQuery}
            onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
            elemBeforeInput={
              <div style={{ paddingLeft: 8, display: 'flex', alignItems: 'center' }}>
                <SearchIcon label="" size="small" />
              </div>
            }
            isCompact
          />
        </div>
        <span
          style={{
            fontSize: 12,
            color: 'var(--ds-text-subtle, #505258)',
            fontWeight: 500,
          }}
        >
          {filteredUsers.length} resource{filteredUsers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table — Jira admin parity: 12/653 sentence-case headers, 14/400 cells, hairline bottom border */}
      <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 14,
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              background: 'var(--ds-surface, #FFFFFF)',
              zIndex: 10,
            }}
          >
            <tr>
              {[
                { key: 'rid', label: 'RID', width: '80px', align: 'left' as const },
                { key: 'name', label: 'Name', width: 'auto', align: 'left' as const },
                { key: 'email', label: 'Email', width: '260px', align: 'left' as const },
                { key: 'role', label: 'Product role', width: '200px', align: 'left' as const },
                { key: 'status', label: 'Status', width: '100px', align: 'left' as const },
                { key: 'actions', label: 'Actions', width: '180px', align: 'right' as const },
              ].map(col => (
                <th
                  key={col.key}
                  scope="col"
                  style={{
                    textAlign: col.align,
                    fontSize: 12,
                    fontWeight: 653,
                    color: 'var(--ds-text-subtle, #505258)',
                    padding: '8px 12px 8px 0',
                    borderBottom: '1.67px solid var(--ds-border, rgba(11, 18, 14, 0.14))',
                    textTransform: 'none',
                    letterSpacing: 'normal',
                    lineHeight: '16px',
                    width: col.width,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', fontSize: 14, color: 'var(--ds-text-subtle, #505258)' }}>
                    Loading resources…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', fontSize: 14, color: 'var(--ds-text-subtle, #505258)' }}>
                    No resources found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td style={{ padding: '12px 12px 12px 0', fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace', fontSize: 13, color: 'var(--ds-text-subtle, #505258)', borderBottom: '1px solid var(--ds-border-subtle, rgba(11, 18, 14, 0.08))' }}>
                      {user.rid || '—'}
                    </td>
                    <td style={{ padding: '12px 12px 12px 0', fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #292A2E)', borderBottom: '1px solid var(--ds-border-subtle, rgba(11, 18, 14, 0.08))' }}>{user.name}</td>
                    <td style={{ padding: '12px 12px 12px 0', fontSize: 14, color: 'var(--ds-text-subtle, #505258)', borderBottom: '1px solid var(--ds-border-subtle, rgba(11, 18, 14, 0.08))' }}>
                      {editingEmailId === user.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: '180px' }}>
                            <Textfield
                              type="email"
                              value={editingEmailValue}
                              onChange={(e) => setEditingEmailValue((e.target as HTMLInputElement).value)}
                              placeholder="Enter email"
                              autoFocus
                              isCompact
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
                            style={{ height: 28, width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, background: 'transparent', border: 'none', cursor: 'pointer' }}
                            onClick={() => updateEmailMutation.mutate({ resourceId: user.id, email: editingEmailValue })}
                            disabled={updateEmailMutation.isPending}
                          >
                            <span style={{ display: 'inline-flex', color: 'var(--ds-icon-success, #1F845A)' }}><CheckMarkIcon label="Save email" size="small" /></span>
                          </button>
                          <button
                            style={{ height: 28, width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, background: 'transparent', border: 'none', cursor: 'pointer' }}
                            onClick={() => { setEditingEmailId(null); setEditingEmailValue(''); }}
                          >
                            <span style={{ display: 'inline-flex', color: 'var(--ds-text-subtle, #505258)' }}><CrossIcon label="Cancel" size="small" /></span>
                          </button>
                        </div>
                      ) : (
                        <div
                          className="group"
                          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'color 120ms ease' }}
                          onClick={() => { setEditingEmailId(user.id); setEditingEmailValue(user.email || ''); }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--ds-text, #292A2E)')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--ds-text-subtle, #505258)')}
                        >
                          {user.email ? (
                            <>
                              <span style={{ display: 'inline-flex', flexShrink: 0 }}><EmailIcon label="" size="small" /></span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--ds-text-subtlest, #6B6E76)' }}>No email</span>
                          )}
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ display: 'inline-flex', color: 'var(--ds-text-subtle, #505258)' }}><EditIcon label="" size="small" /></span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 12px 12px 0', borderBottom: '1px solid var(--ds-border-subtle, rgba(11, 18, 14, 0.08))' }}>
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
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ds-text-subtle, #505258)' }}>
                          <span style={{ display: 'inline-flex' }}><ShieldIcon label="" size="small" /></span>
                          No email
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 12px 12px 0', borderBottom: '1px solid var(--ds-border-subtle, rgba(11, 18, 14, 0.08))' }}>
                      {user.is_active ? (
                        <Lozenge appearance="success">Active</Lozenge>
                      ) : (
                        <Lozenge appearance="default">Inactive</Lozenge>
                      )}
                    </td>
                    <td style={{ padding: '12px 0 12px 0', textAlign: 'right', borderBottom: '1px solid var(--ds-border-subtle, rgba(11, 18, 14, 0.08))' }}>
                      {user.profile_id ? (
                        <Lozenge appearance="success">Account linked</Lozenge>
                      ) : user.email && user.role_id ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <Lozenge appearance="inprogress">Authorized</Lozenge>
                          <Button
                            appearance="default"
                            onClick={() => { setSelectedUser(user); setCreateAccountOpen(true); }}
                            iconBefore={PersonAddIcon}
                          >
                            Create login
                          </Button>
                        </div>
                      ) : user.email ? (
                        <span style={{ fontSize: 13, color: 'var(--ds-text-subtle, #505258)' }}>
                          Assign role to authorize
                        </span>
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--ds-text-subtle, #505258)' }}>
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

      {/* Create Account Dialog */}
      <Dialog open={createAccountOpen} onOpenChange={setCreateAccountOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: 'inline-flex', color: 'var(--ds-icon-brand, #0C66E4)' }}><PersonAddIcon label="" size="medium" /></span>
              Create Account
            </DialogTitle>
            <DialogDescription>
              Create a login account for <strong>{selectedUser?.name}</strong> using their email{' '}
              <strong>{selectedUser?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p style={{ fontSize: 14 }} style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
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
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: 14 }} style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
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
                <p style={{ fontSize: 14 }} style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
                  Each user will receive a password reset email to set their own password on first login.
                </p>
                <div className="max-h-32 overflow-y-auto text-xs rounded p-2" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))', border: '1px solid var(--ds-border, #DCDFE4)' }}>
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
