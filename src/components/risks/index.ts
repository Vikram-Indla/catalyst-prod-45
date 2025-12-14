// Catalyst Risk Components - Public Exports
export { RiskBadge, NoRisksBadge } from './RiskBadge';
export type { RiskBadgeProps } from './RiskBadge';
export { RiskSeverityPill } from './RiskSeverityPill';
export { RoamBadge } from './RoamBadge';

// Re-export types and colors from config
export { 
  RISK_COLORS, 
  RISK_LETTER_CODES, 
  RISK_SEVERITY_ORDER,
  hasNoRisks,
  getNonZeroSeverities,
  getTotalRiskCount,
} from '@/config/riskColors';
export type { RiskSeverity, RiskCounts } from '@/config/riskColors';
