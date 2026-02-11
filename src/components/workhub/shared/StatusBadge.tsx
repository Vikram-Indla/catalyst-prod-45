/**
 * StatusBadge — Renders work item status with color from config
 */

import type { WorkItemStatus } from '@/types/workhub.types';
import { STATUS_CONFIG } from '@/lib/workhub/constants';

interface StatusBadgeProps {
  status: WorkItemStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const isSmall = size === 'sm';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full whitespace-nowrap transition-colors`}
      style={{
        backgroundColor: config.bg,
        color: config.text,
        padding: isSmall ? '2px 8px' : '4px 10px',
        fontSize: isSmall ? '11px' : '12px',
      }}
    >
      {config.label}
    </span>
  );
}
