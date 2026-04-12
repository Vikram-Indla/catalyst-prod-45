/**
 * PriorityIcon — Delegates to canonical PriorityIndicator
 */
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';

export function PriorityIcon({ priority }: { priority?: string | null; size?: number }) {
  return <PriorityBars priority={normalisePriority(priority)} />;
}
