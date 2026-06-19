/**
 * HealthStatusBadge Component
 *
 * CANONICAL PATTERN: Uses CatalystStatusPill for rendering health status.
 * Maps health states to semantic status values, then delegates to CatalystStatusPill
 * which handles portal, colors, keyboard nav, and hover affordances.
 *
 * Health states map to status semantics:
 * - Uncommitted/Committed → 'backlog' (grey/blue)
 * - On Track → 'done' (green)
 * - Delayed → 'in_progress' (amber) — treating as "needs attention"
 * - At Risk/Blocked → 'in_review' (red) — treating as "urgent"
 * - Delivered → 'done' (green)
 *
 * Size and click handler passed through to CatalystStatusPill.
 */

import React, { useCallback } from 'react';

import { BusinessRequestHealth, HealthStatusBadgeProps } from '@/types/date-pulse';
import { CatalystStatusPill } from '@/components/catalyst-detail-views/shared/sections/CatalystStatusPill';

/**
 * Map health status to a semantic status value for CatalystStatusPill
 */
function mapHealthToStatus(healthStatus: string): string {
  switch (healthStatus) {
    case 'Uncommitted':
      return 'backlog';
    case 'Committed':
      return 'backlog'; // Waiting to start
    case 'On Track':
      return 'done'; // All clear, on schedule
    case 'Delayed':
      return 'in_progress'; // Needs attention
    case 'At Risk':
      return 'in_review'; // Urgent action needed
    case 'Blocked':
      return 'in_review'; // Critical blocker
    case 'Delivered':
      return 'done'; // Complete
    default:
      return 'backlog';
  }
}

export const HealthStatusBadge: React.FC<HealthStatusBadgeProps> = ({
  health,
  size = 'md',
  onClick,
  className = '',
  'data-testid': testId,
}) => {
  const semanticStatus = mapHealthToStatus(health.health_status);

  // For compact pill rendering (no dropdown needed in some contexts)
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`health-status-badge ${className}`}
        data-testid={testId || 'health-status-badge'}
        title={health.health_descriptor}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <CatalystStatusPill
          status={semanticStatus}
          isCompact={size === 'sm'}
          isLoading={false}
          onStatusChange={() => {}} // Read-only for health display
        />
      </button>
    );
  }

  // Default: render the pill without click handler
  return (
    <div
      className={`health-status-badge ${className}`}
      data-testid={testId || 'health-status-badge'}
      title={health.health_descriptor}
    >
      <CatalystStatusPill
        status={semanticStatus}
        isCompact={size === 'sm'}
        isLoading={false}
        onStatusChange={() => {}} // Read-only for health display
      />
    </div>
  );
};

export default HealthStatusBadge;
