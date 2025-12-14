// ═══════════════════════════════════════════════════════════════════════════════
// Catalyst Risk Severity Pill
// For showing individual severity labels in risk detail views
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';
import { RISK_COLORS, type RiskSeverity } from '@/config/riskColors';

interface RiskSeverityPillProps {
  severity: RiskSeverity | 'Critical' | 'High' | 'Medium' | 'Low';
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Maps display labels to internal severity keys
 */
function normalizeSeverity(severity: string): RiskSeverity {
  return severity.toLowerCase() as RiskSeverity;
}

/**
 * Capitalizes the first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * RiskSeverityPill Component
 * 
 * Shows a single severity label with appropriate color
 * For use in detailed risk views, lists, and grids
 */
export function RiskSeverityPill({ severity, size = 'md', className }: RiskSeverityPillProps) {
  const normalizedSeverity = normalizeSeverity(severity);
  const backgroundColor = RISK_COLORS[normalizedSeverity] || RISK_COLORS.medium;
  const label = capitalize(severity);

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md font-semibold text-white',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        className
      )}
      style={{ backgroundColor }}
    >
      {label}
    </span>
  );
}
