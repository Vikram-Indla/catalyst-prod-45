/**
 * PriorityBadge — Delegates to canonical PriorityIndicator
 * Maps P1-P4 to Critical/High/Medium/Low
 */
import { PriorityIndicator } from '@/components/shared/PriorityIndicator';

interface PriorityBadgeProps {
  priority: string;
  size?: 'sm' | 'md';
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return <PriorityIndicator priority={priority} />;
}
