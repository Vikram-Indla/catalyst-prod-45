import React from 'react';
import { CatalystStatusPill } from '@/components/catalyst-detail-views/shared/sections/CatalystStatusPill';
import type { BusinessRequestHealth } from '@/types/date-pulse';

interface HealthStatusBadgeProps {
  health: BusinessRequestHealth;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const HEALTH_COLORS: Record<string, 'success' | 'inprogress' | 'warning' | 'default' | 'danger'> = {
  'Delivered': 'success',
  'On Track': 'inprogress',
  'Committed': 'inprogress',
  'Delayed': 'warning',
  'At Risk': 'danger',
  'Blocked': 'danger',
  'Uncommitted': 'default',
};

export function HealthStatusBadge({ health, onClick }: HealthStatusBadgeProps) {
  const appearance = HEALTH_COLORS[health.health_status] || 'default';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Health status: ${health.health_status}. Click for details.`}
      onClickCapture={(e) => { e.stopPropagation(); onClick?.(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      style={{
        border: 'none',
        background: 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        padding: 0,
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      <CatalystStatusPill
        status={health.health_status}
        appearance={appearance}
        interactive={false}
      />
    </div>
  );
}
