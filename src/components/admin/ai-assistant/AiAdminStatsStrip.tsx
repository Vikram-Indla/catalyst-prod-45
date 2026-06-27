import React from 'react';
import { useApprovedProfiles } from '@/hooks/useApprovedProfiles';
import { useProductRoles, useAllRolePermissions } from '@/hooks/useProductRoles';
import { useCapacityDepartments } from '@/modules/capacity-planner/hooks/useCapacityDepartments';
import { T } from './aiAdminAssistant.types';

interface StatProps {
  label: string;
  value: number | string;
  isLoading: boolean;
}

function Stat({ label, value, isLoading }: StatProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
        {isLoading ? '—' : value}
      </span>
      <span style={{ fontSize: 12, color: T.subtle }}>{label}</span>
    </span>
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
        padding: '8px 24px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        flexShrink: 0,
        background: T.surface,
      }}
    >
      <Stat label="approved users" value={profiles.length} isLoading={usersLoading} />
      <span style={{ color: T.borderSubtle, fontSize: 12 }}>·</span>
      <Stat label="roles" value={activeRoles} isLoading={rolesLoading} />
      <span style={{ color: T.borderSubtle, fontSize: 12 }}>·</span>
      <Stat label="permission groups" value={permGroupCount} isLoading={permsLoading} />
      <span style={{ color: T.borderSubtle, fontSize: 12 }}>·</span>
      <Stat label="departments" value={activeDepts} isLoading={deptsLoading} />
    </div>
  );
}
