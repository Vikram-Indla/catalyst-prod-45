import React from 'react';
import WarningIcon from '@atlaskit/icon/core/warning';
import { RBAC_SCHEMA_DEPLOYED } from '@/lib/rbac-mock';

/**
 * RbacSchemaBanner — renders when RBAC_SCHEMA_DEPLOYED is false.
 * Informs the admin that this screen is in mock-safe mode and no
 * writes are persisted to Supabase.
 */
export function RbacSchemaBanner() {
  if (RBAC_SCHEMA_DEPLOYED) return null;

  return (
    <div
      role="status"
      aria-label="RBAC schema not deployed"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 16px',
        background: 'var(--ds-background-warning, #FFF7D6)',
        border: '1px solid var(--ds-border-warning, #F8C932)',
        borderRadius: 4,
        marginBottom: 20,
      }}
    >
      <span style={{ display: 'flex', flexShrink: 0, marginTop: 1, color: 'var(--ds-icon-warning, #FF8B00)' }}>
        <WarningIcon label="Warning" size="small" />
      </span>
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ds-text-warning, #974F0C)' }}>
          RBAC schema not deployed — mock-safe mode
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ds-text-subtle, #44546F)' }}>
          The <code>rbac_*</code> database tables do not exist on this environment.
          All data shown here is mock data for UI scaffolding only.
          Save, assign, and write actions are disabled until the schema migration is applied to staging and production.
        </p>
      </div>
    </div>
  );
}
