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
  const priorityStyle = PRIORITY_STYLES[issue?.priority ?? 'Medium'] ?? PRIORITY_STYLES.Medium;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Priority</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px' }}>
        <span style={{ color: priorityStyle.color, fontWeight: 700, fontSize: 14 }}>{priorityStyle.symbol}</span>
        <span style={{ fontSize: 14, color: '#172B4D' }}>{issue?.priority ?? 'Medium'}</span>
      </div>
    </div>
  );
}
