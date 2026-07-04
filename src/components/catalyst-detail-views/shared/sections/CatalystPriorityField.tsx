/**
 * CANONICAL — Priority sidebar field for all CatalystView* components.
 * Change here → updates all work item types that use it.
 *
 * Renders the priority symbol + label in the sidebar details section.
 */
import React from 'react';
import type { PhIssue } from '../types';
import {
  PRIORITY_STYLES,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';

interface CatalystPriorityFieldProps {
  issue: PhIssue | null;
}

export function CatalystPriorityField({ issue }: CatalystPriorityFieldProps) {
  const priorityStyle = issue?.priority ? PRIORITY_STYLES[issue.priority] ?? null : null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text)', marginBottom: 4 }}>Priority</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px' }}>
        {priorityStyle ? (
          <>
            <span style={{ color: priorityStyle.color, fontWeight: 700, fontSize: 'var(--ds-font-size-400)' }}>{priorityStyle.symbol}</span>
            <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)' }}>{issue?.priority}</span>
          </>
        ) : (
          <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtlest)' }}>—</span>
        )}
      </div>
    </div>
  );
}
