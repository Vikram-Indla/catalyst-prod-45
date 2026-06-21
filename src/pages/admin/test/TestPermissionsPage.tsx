import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import { PageHeader } from '@/components/ads/PageHeader';
import { Breadcrumbs } from '@/components/ads/Breadcrumbs';
import { catalystToast } from '@/lib/catalystToast';
import { supabase } from '@/integrations/supabase/client';

interface TmRole {
  id: string;
  name: string;
  description: string | null;
}

interface TmPermission {
  id: string;
  permission_key: string;
  role_id: string;
  granted: boolean;
}

const PERMISSION_LABELS: Record<string, { label: string; description: string; group: string }> = {
  'create_test_case':     { label: 'Create test cases',     description: 'Add new test cases to the repository',       group: 'Repository' },
  'edit_test_case':       { label: 'Edit test cases',       description: 'Modify existing test cases and steps',        group: 'Repository' },
  'delete_test_case':     { label: 'Delete test cases',     description: 'Permanently remove test cases',               group: 'Repository' },
  'approve_test_case':    { label: 'Approve test cases',    description: 'Transition cases to Approved status',         group: 'Repository' },
  'create_cycle':         { label: 'Create cycles',         description: 'Create new test execution cycles',            group: 'Cycles' },
  'manage_cycle':         { label: 'Manage cycles',         description: 'Edit and delete test cycles',                 group: 'Cycles' },
  'execute_tests':        { label: 'Execute tests',         description: 'Mark test run results during execution',      group: 'Execution' },
  'create_defect':        { label: 'Create defects',        description: 'Log defects from failed test runs',           group: 'Defects' },
  'manage_defect':        { label: 'Manage defects',        description: 'Edit and close defects',                      group: 'Defects' },
  'view_reports':         { label: 'View reports',          description: 'Access TestHub reporting dashboards',          group: 'Reports' },
  'export_results':       { label: 'Export results',        description: 'Export test results and reports',             group: 'Reports' },
  'manage_settings':      { label: 'Manage settings',       description: 'Configure TestHub admin settings',            group: 'Admin' },
};

const GROUPS = ['Repository', 'Cycles', 'Execution', 'Defects', 'Reports', 'Admin'];

export default function TestPermissionsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['tm_roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_roles')
        .select('id, name, description')
        .order('name');
      if (error) throw error;
      return (data ?? []) as TmRole[];
    },
  });

  const { data: permissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ['tm_permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_permissions')
        .select('id, permission_key, role_id, granted');
      if (error) throw error;
      return (data ?? []) as TmPermission[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ roleId, permKey, currentGranted }: { roleId: string; permKey: string; currentGranted: boolean }) => {
      const existing = permissions.find(p => p.role_id === roleId && p.permission_key === permKey);
      if (existing) {
        const { error } = await supabase
          .from('tm_permissions')
          .update({ granted: !currentGranted })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tm_permissions')
          .insert({ role_id: roleId, permission_key: permKey, granted: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tm_permissions'] });
    },
    onError: (e: Error) => catalystToast.error(e.message),
  });

  const isGranted = (roleId: string, permKey: string): boolean => {
    const p = permissions.find(x => x.role_id === roleId && x.permission_key === permKey);
    return p?.granted ?? false;
  };

  if (rolesLoading || permsLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="large" /></div>;
  }

  const permKeys = Object.keys(PERMISSION_LABELS);

  return (
    <div style={{ padding: 24, maxWidth: 1100, fontFamily: 'var(--ds-font-family-body)' }}>
      <PageHeader
        title="Permissions"
        breadcrumbs={
          <Breadcrumbs items={[
            { key: 'admin', text: 'Admin', onClick: () => navigate('/admin/overview') },
            { key: 'test', text: 'Test Hub', isCurrent: false },
            { key: 'permissions', text: 'Permissions', isCurrent: true },
          ]} />
        }
      />

      <p style={{ fontSize: 14, color: 'var(--ds-text-subtle, #42526E)', margin: '4px 0 24px' }}>
        Control which actions each test role can perform. Check = allowed, unchecked = denied.
      </p>

      {roles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--ds-text-subtlest, #6B778C)' }}>
          No test roles configured. Roles are created from the test management settings.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--ds-surface-sunken, #F7F8F9)', borderBottom: '2px solid var(--ds-border, #DFE1E6)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)', minWidth: 200 }}>
                  Permission
                </th>
                {roles.map(r => (
                  <th key={r.id} style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)', minWidth: 100 }}>
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GROUPS.map(group => {
                const groupPerms = permKeys.filter(k => PERMISSION_LABELS[k]?.group === group);
                if (groupPerms.length === 0) return null;
                return (
                  <React.Fragment key={group}>
                    <tr>
                      <td
                        colSpan={roles.length + 1}
                        style={{
                          padding: '8px 16px',
                          fontSize: 11, fontWeight: 600,
                          color: 'var(--ds-text-subtlest, #6B778C)',
                          background: 'var(--ds-surface-sunken, #F7F8F9)',
                          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {group.toUpperCase()}
                      </td>
                    </tr>
                    {groupPerms.map(permKey => {
                      const meta = PERMISSION_LABELS[permKey];
                      return (
                        <tr key={permKey} style={{ borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)' }}>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ fontWeight: 500, color: 'var(--ds-text, #172B4D)', fontSize: 13 }}>{meta.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 2 }}>{meta.description}</div>
                          </td>
                          {roles.map(r => {
                            const granted = isGranted(r.id, permKey);
                            return (
                              <td key={r.id} style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <button
                                  onClick={() => toggleMutation.mutate({ roleId: r.id, permKey, currentGranted: granted })}
                                  disabled={toggleMutation.isPending}
                                  aria-label={`${granted ? 'Revoke' : 'Grant'} ${meta.label} for ${r.name}`}
                                  style={{
                                    width: 20, height: 20, borderRadius: 4,
                                    border: granted
                                      ? '2px solid var(--ds-border-brand, #0052CC)'
                                      : '2px solid var(--ds-border, #DFE1E6)',
                                    background: granted ? 'var(--ds-background-brand-bold, #0052CC)' : 'var(--ds-surface, #FFFFFF)',
                                    cursor: 'pointer',
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'background 150ms, border-color 150ms',
                                    flexShrink: 0,
                                  }}
                                >
                                  {granted && (
                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                      <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
