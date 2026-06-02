import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import type { FilterHealth } from '@/hooks/workhub/useSavedFilters';

interface FilterHealthBadgeProps {
  health: FilterHealth;
}

type LozengeAppearance = 'default' | 'success' | 'removed' | 'inprogress' | 'moved' | 'new';

const CONFIG: Record<FilterHealth, { label: string; appearance: LozengeAppearance }> = {
  healthy: { label: 'Healthy', appearance: 'success'  },
  stale:   { label: 'Stale',   appearance: 'moved'    },
  broken:  { label: 'Broken',  appearance: 'removed'  },
};

export function FilterHealthBadge({ health }: FilterHealthBadgeProps) {
  const { label, appearance } = CONFIG[health] ?? CONFIG.healthy;
  return <span data-cp-lozenge-jira-parity><Lozenge appearance={appearance}>{label}</Lozenge></span>;
}
