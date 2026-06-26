import React from 'react';
import { RBAC_SCHEMA_DEPLOYED } from '@/lib/rbac-mock';

/**
 * Low-emphasis preview notice — renders when RBAC_SCHEMA_DEPLOYED is false.
 */
export function RbacSchemaBanner() {
  if (RBAC_SCHEMA_DEPLOYED) return null;

  return (
    <div
      role="status"
      aria-label="RBAC preview mode"
      style={{
        padding: '7px 12px',
        background: 'var(--ds-background-neutral, #F1F2F4)',
        border: '1px solid var(--ds-border, #DCDFE4)',
        borderRadius: 3,
        marginBottom: 20,
        fontSize: 13,
        color: 'var(--ds-text-subtle, #44546F)',
      }}
    >
      <strong style={{ color: 'var(--ds-text, #172B4D)', fontWeight: 600, marginRight: 4 }}>
        RBAC preview mode
      </strong>
      Schema not deployed. Data is mock-safe and write actions are disabled.
    </div>
  );
}
