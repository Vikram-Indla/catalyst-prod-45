/**
 * PermissionList — icon + label permission entry, exactly as Jira renders
 * Viewers / Editors cells in the Filters directory.
 *
 * Accepts an array of PermissionEntry objects (each has an icon node and a
 * label string) and renders up to MAX_ROWS inline, with "+N" overflow count.
 * Callers are responsible for building the entries — the helpers
 * `sharePermissionEntries`, `viewersConfigEntries`, and `editorsConfigEntries`
 * in FiltersListPage are the canonical builders for Jira-synced filters.
 *
 * Extract point: this component is reused anywhere an icon+label permission
 * pair needs to be displayed — Boards list, Roadmap list, etc.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';

export interface PermissionEntry {
  icon: React.ReactNode;
  label: string;
}

interface PermissionListProps {
  entries: PermissionEntry[];
  maxRows?: number;
}

export function PermissionList({ entries, maxRows = 1 }: PermissionListProps) {
  const shown = entries.slice(0, maxRows);
  const more = entries.length - shown.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {shown.map((e, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-flex', width: 16, justifyContent: 'center', flexShrink: 0 }}>
            {e.icon}
          </span>
          <span style={{ fontSize: 'var(--ds-font-size-400)', color: token('color.text'), whiteSpace: 'nowrap' }}>
            {e.label}
          </span>
        </span>
      ))}
      {more > 0 && (
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest') }}>
          +{more}
        </span>
      )}
    </div>
  );
}
