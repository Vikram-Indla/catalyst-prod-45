/**
 * PriorityCell — Delegates to canonical PriorityIndicator
 */
import React from 'react';
import { PriorityIndicator } from '@/components/shared/PriorityIndicator';

interface PriorityCellProps {
  priority: string;
}

export const PriorityCell = React.memo(function PriorityCell({ priority }: PriorityCellProps) {
  return <PriorityIndicator priority={priority} />;
});
