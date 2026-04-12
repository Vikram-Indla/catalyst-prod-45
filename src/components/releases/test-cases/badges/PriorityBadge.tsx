/**
 * PriorityBadge — Delegates to canonical PriorityIndicator
 */
import { PriorityIndicator } from '@/components/shared/PriorityIndicator';

export type TestCasePriority = 'critical' | 'high' | 'medium' | 'low';

interface PriorityBadgeProps {
  priority: TestCasePriority;
  showLabel?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

export function PriorityBadge({ priority, showLabel = true }: PriorityBadgeProps) {
  return <PriorityIndicator priority={priority} showLabel={showLabel} />;
}
