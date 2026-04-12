/**
 * PriorityBadge — Delegates to canonical PriorityIndicator
 */
import { PriorityIndicator } from '@/components/shared/PriorityIndicator';

export function PriorityBadge({ priority }: { priority: string }) {
  return <PriorityIndicator priority={priority} />;
}
