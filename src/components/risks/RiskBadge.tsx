// ═══════════════════════════════════════════════════════════════════════════════
// Catalyst Risk Badge Component
// Reusable badge for displaying risk severity counts
// Supports compact (single), stacked (multi), and "no risks" states
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import {
  RISK_COLORS,
  RISK_LETTER_CODES,
  RiskSeverity,
  RiskCounts,
  hasNoRisks,
  getNonZeroSeverities,
} from '@/config/riskColors';

export interface RiskBadgeProps {
  counts: RiskCounts;
  variant?: 'compact' | 'stacked';
  size?: 'sm' | 'md';
  className?: string;
  /** Hide the "No risks" chip when all counts are zero. Useful for tables. */
  hideEmpty?: boolean;
}

/**
 * Single severity badge (e.g., "1C", "2H", "3M", "1L")
 */
function SingleBadge({ 
  severity, 
  count, 
  size = 'md' 
}: { 
  severity: RiskSeverity; 
  count: number; 
  size?: 'sm' | 'md';
}) {
  const backgroundColor = RISK_COLORS[severity];
  const letter = RISK_LETTER_CODES[severity];

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md font-bold text-white',
        size === 'sm' ? 'min-w-[28px] h-[22px] px-2 text-[10px]' : 'min-w-[32px] h-[26px] px-2.5 text-[11px]'
      )}
      style={{ backgroundColor }}
    >
      {count}{letter}
    </span>
  );
}

/**
 * No risks badge with checkmark
 */
function NoRisksBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-[11px]'
      )}
      style={{
        backgroundColor: '#e8f5e9',
        border: '1px solid #c8e6c9',
        color: '#4a7c4a',
      }}
    >
      <Check className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      No risks
    </span>
  );
}

/**
 * RiskBadge Component
 * 
 * Auto-selects display mode:
 * - All counts 0 → "✓ No risks" chip
 * - Single severity with count > 0 → compact badge (e.g., "2H")
 * - Multiple severities with count > 0 → stacked badges (e.g., "1C" + "2H")
 */
export function RiskBadge({ 
  counts, 
  variant = 'compact', 
  size = 'md',
  className,
  hideEmpty = false,
}: RiskBadgeProps) {
  // No risks state
  if (hasNoRisks(counts)) {
    if (hideEmpty) {
      return <span className={cn('text-muted-foreground text-xs', className)}>—</span>;
    }
    return (
      <div className={cn('inline-flex items-center', className)}>
        <NoRisksBadge size={size} />
      </div>
    );
  }

  const nonZeroSeverities = getNonZeroSeverities(counts);

  // Single severity - compact mode
  if (nonZeroSeverities.length === 1) {
    const { severity, count } = nonZeroSeverities[0];
    return (
      <div className={cn('inline-flex items-center', className)}>
        <SingleBadge severity={severity} count={count} size={size} />
      </div>
    );
  }

  // Multiple severities - stacked mode
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      {nonZeroSeverities.map(({ severity, count }) => (
        <SingleBadge key={severity} severity={severity} count={count} size={size} />
      ))}
    </div>
  );
}

/**
 * Export NoRisksBadge for direct use
 */
export { NoRisksBadge };
