/**
 * PriorityChip — Delegates to canonical PriorityIndicator
 */
import { PriorityIndicator } from '@/components/shared/PriorityIndicator';

interface PriorityChipProps {
  level: 'high' | 'medium' | 'low';
}

export default function PriorityChip({ level }: PriorityChipProps) {
  return <PriorityIndicator priority={level} fontSize={11} />;
}
