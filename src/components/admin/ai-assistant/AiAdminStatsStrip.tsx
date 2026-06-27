import React from 'react';
import { Spinner } from '@/components/ads';
import { useApprovedProfiles } from '@/hooks/useApprovedProfiles';
import { useProductRoles } from '@/hooks/useProductRoles';
import { useAllRolePermissions } from '@/hooks/useProductRoles';
import { useCapacityDepartments } from '@/modules/capacity-planner/hooks/useCapacityDepartments';
import { T } from './aiAdminAssistant.types';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  isLoading?: boolean;
  color?: string;
}

function StatCard({ label, value, sub, isLoading, color }: StatCardProps) {
  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 120,
        padding: '10px 14px',
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, color: T.subtlest, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      {isLoading ? (
        <div style={{ paddingTop: 4 }}>
          <Spinner size="small" />
        </div>
      ) : (
        <span style={{ fontSize: 22, fontWeight: 700, color: color ?? T.text, lineHeight: '28px' }}>
          {value}
        </span>
      )}
      {sub && !isLoading && (
        <span style={{ fontSize: 11, color: T.subtlest }}>{sub}</span>
      )}
    </div>
  );
}

export function AiAdminStatsStrip() {
  const { data: profiles = [], isLoading: usersLoading } = useApprovedProfiles();
  const { roles = [], isLoading: rolesLoading } = useProductRoles();
  const { data: permissions = [], isLoading: permsLoading } = useAllRolePermissions();
  const { departments, isLoading: deptsLoading } = useCapacityDepartments();

  const permGroupCount = new Set(permissions.map(p => p.permission_group)).size;
  const activeRoles = roles.filter(r => r.is_active).length;
  const activeDepts = departments.filter(d => d.is_active).length;

  return (
    <div
      style={{
        padding: '10px 24px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        gap: 10,
        background: T.sunken,
        flexShrink: 0,
      }}
    >
      <StatCard
        label="Users"
        value={usersLoading ? '—' : profiles.length}
        sub="approved"
        isLoading={usersLoading}
        color="var(--ds-text-brand, #0C66E4)"
      />
      <StatCard
        label="Roles"
        value={rolesLoading ? '—' : activeRoles}
        sub={rolesLoading ? undefined : `of ${roles.length} total`}
        isLoading={rolesLoading}
      />
      <StatCard
        label="Permission Groups"
        value={permsLoading ? '—' : permGroupCount}
        sub={permsLoading ? undefined : `${permissions.length} rules total`}
        isLoading={permsLoading}
      />
      <StatCard
        label="Departments"
        value={deptsLoading ? '—' : activeDepts}
        sub="active"
        isLoading={deptsLoading}
      />
    </div>
  );
}
