/**
 * PHPriorityIcon — Delegates to canonical PriorityIndicator
 */
import React from 'react';
import type { IssuePriority } from '@/types/project-hub.types';
import { PriorityIndicator } from '@/components/shared/PriorityIndicator';

interface Props {
  priority: IssuePriority;
  showLabel?: boolean;
}

export function PHPriorityIcon({ priority, showLabel }: Props) {
  // Map 'urgent' → 'critical' for canonical rendering
  const mapped = priority === 'urgent' ? 'critical' : priority;
  return <PriorityIndicator priority={mapped} showLabel={showLabel} fontSize={10} />;
}
