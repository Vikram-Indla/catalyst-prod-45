// ═══════════════════════════════════════════════════════════════════════════════
// Catalyst Risk Color System — Centralized Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Risk severity levels
 */
export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Standard risk colors - Catalyst brand aligned
 * 
 * Visual meaning:
 * - Critical (#922b21) – "Stop everything, fix immediately"
 * - High (#cb4335) – "Needs immediate attention"  
 * - Medium (var(--ds-background-warning-bold)) – "Monitor closely, plan mitigation" (Amber)
 * - Low (var(--ds-chart-teal-bold)) – "Manageable, track over time" (Teal)
 */
export const RISK_COLORS = {
  critical: '#922b21', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
  high: '#cb4335', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
  medium: 'var(--ds-background-warning-bold)',
  low: 'var(--ds-chart-teal-bold)',
} as const;

/**
 * Risk badge letter codes
 */
export const RISK_LETTER_CODES: Record<RiskSeverity, string> = {
  critical: 'C',
  high: 'H',
  medium: 'M',
  low: 'L',
};

/**
 * Risk severity display order (highest to lowest)
 */
export const RISK_SEVERITY_ORDER: RiskSeverity[] = ['critical', 'high', 'medium', 'low'];

/**
 * Risk counts interface used across components
 */
export interface RiskCounts {
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
}

/**
 * Check if all risk counts are zero or undefined
 */
export function hasNoRisks(counts: RiskCounts): boolean {
  return (
    (!counts.critical || counts.critical === 0) &&
    (!counts.high || counts.high === 0) &&
    (!counts.medium || counts.medium === 0) &&
    (!counts.low || counts.low === 0)
  );
}

/**
 * Get non-zero severities from counts in priority order
 */
export function getNonZeroSeverities(counts: RiskCounts): { severity: RiskSeverity; count: number }[] {
  return RISK_SEVERITY_ORDER
    .map(severity => ({
      severity,
      count: counts[severity] || 0,
    }))
    .filter(item => item.count > 0);
}

/**
 * Get total risk count
 */
export function getTotalRiskCount(counts: RiskCounts): number {
  return (counts.critical || 0) + (counts.high || 0) + (counts.medium || 0) + (counts.low || 0);
}
