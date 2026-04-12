/**
 * PriorityChip — Delegates to canonical PriorityIndicator
 * Maps P1-P4 to Critical/High/Medium/Low via normalisePriority
 */
import { PriorityIndicator } from '@/components/shared/PriorityIndicator';

interface PriorityChipProps {
  priority: string;
}

export function PriorityChip({ priority }: PriorityChipProps) {
  return <PriorityIndicator priority={priority} fontSize={11} />;
}
