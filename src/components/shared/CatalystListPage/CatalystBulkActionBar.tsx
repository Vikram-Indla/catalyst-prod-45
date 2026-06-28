/**
 * CatalystBulkActionBar — inline "N selected" bar, shown above the table
 * when rows are selected.
 *
 * Distinct from JiraBulkActionBar (portal bottom float) — this renders
 * inline inside the content area, above the table, exactly as Jira's
 * Filters directory does. It supports arbitrary action buttons so each
 * list page can define its own bulk operations.
 *
 * All action buttons use @atlaskit/button (ADS canonical).
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';

export interface BulkAction {
  label: string;
  onClick: () => void;
  isDanger?: boolean;
}

interface CatalystBulkActionBarProps {
  selectedCount: number;
  actions?: BulkAction[];
  onDeselect: () => void;
}

export function CatalystBulkActionBar({
  selectedCount,
  actions = [],
  onDeselect,
}: CatalystBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
        background: token('color.background.selected'),
        borderRadius: 3,
        marginBottom: 8,
        fontSize: 'var(--ds-font-size-400)',
        color: token('color.text'),
      }}
    >
      <span style={{ fontWeight: 600 }}>
        {selectedCount} selected
      </span>

      {actions.map((action, i) => (
        <Button
          key={i}
          appearance="subtle"
          spacing="compact"
          onClick={action.onClick}
        >
          {action.isDanger
            ? <span style={{ color: token('color.text.danger') }}>{action.label}</span>
            : action.label}
        </Button>
      ))}

      <Button appearance="subtle" spacing="compact" onClick={onDeselect}>
        Deselect all
      </Button>
    </div>
  );
}
