/**
 * PriorityCell — Delegates to canonical PriorityIndicator
 */
import { PriorityIndicator } from '@/components/shared/PriorityIndicator';

interface PriorityCellProps {
  priority: string | null;
}

export function PriorityCell({ priority }: PriorityCellProps) {
  if (!priority) {
    return <span className="text-muted-foreground">—</span>;
  }
  return <PriorityIndicator priority={priority} />;
}
