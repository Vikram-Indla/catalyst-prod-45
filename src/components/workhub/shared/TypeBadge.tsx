/**
 * TypeBadge — Renders work item type with color from config
 */

import type { WorkItemType } from '@/types/workhub.types';
import { TYPE_CONFIG } from '@/lib/workhub/constants';

interface TypeBadgeProps {
  type: WorkItemType;
  size?: 'sm' | 'md';
}

export function TypeBadge({ type, size = 'md' }: TypeBadgeProps) {
  const config = TYPE_CONFIG[type];
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
