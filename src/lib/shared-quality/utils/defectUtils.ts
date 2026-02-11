/**
 * Shared Defect Utilities — Pure functions for defect data transformation
 */

import type { DefectStats } from '@/types/defects';

/** Calculate defect resolution rate from stats */
export function calcResolutionRate(stats: DefectStats | undefined): number {
  if (!stats || stats.total === 0) return 0;
  return Math.round(((stats.resolved + stats.verified + stats.closed) / stats.total) * 100);
}

/** Get severity color class */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-600';
    case 'high': return 'text-orange-600';
    case 'medium': return 'text-amber-600';
    case 'low': return 'text-blue-600';
    default: return 'text-muted-foreground';
  }
}

/** Get status badge variant */
export function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'new':
    case 'open':
    case 'reopened':
      return 'destructive';
    case 'in_progress':
      return 'default';
    case 'fixed':
    case 'resolved':
    case 'verified':
    case 'closed':
      return 'secondary';
    case 'deferred':
      return 'outline';
    default:
      return 'outline';
  }
}

/** Check if defect is in an "active" (open) state */
export function isOpenDefect(status: string): boolean {
  return ['new', 'open', 'in_progress', 'reopened'].includes(status);
}
