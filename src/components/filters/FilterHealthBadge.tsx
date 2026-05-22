import React from 'react';
import { token } from '@atlaskit/tokens';
import type { FilterHealth } from '@/hooks/workhub/useSavedFilters';

interface FilterHealthBadgeProps {
  health: FilterHealth;
}

const CONFIG: Record<FilterHealth, { label: string; bg: string; text: string }> = {
  healthy: {
    label: 'Healthy',
    bg: token('color.background.success'),
    text: token('color.text.success'),
  },
  stale: {
    label: 'Stale',
    bg: token('color.background.warning'),
    text: token('color.text.warning'),
  },
  broken: {
    label: 'Broken',
    bg: token('color.background.danger'),
    text: token('color.text.danger'),
  },
};

export function FilterHealthBadge({ health }: FilterHealthBadgeProps) {
  const { label, bg, text } = CONFIG[health] ?? CONFIG.healthy;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 8px',
        borderRadius: 3,
        background: bg,
        color: text,
        fontSize: 11,
        fontWeight: token('font.weight.semibold'),
        lineHeight: '16px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
