/**
 * PriorityBadge — Delegates to canonical PriorityIndicator
 */
import { PriorityIndicator } from '@/components/shared/PriorityIndicator';

type Priority = 'critical' | 'high' | 'medium' | 'low';

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return <PriorityIndicator priority={priority} />;
}
