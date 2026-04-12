/**
 * PriorityIcon — Delegates to canonical PriorityIndicator (duplicate kept for import compat)
 */
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';

export function PriorityIcon({ priority }: { priority?: string | null; size?: number }) {
  return <PriorityBars priority={normalisePriority(priority)} />;
}
