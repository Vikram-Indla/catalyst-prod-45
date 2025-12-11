/**
 * =====================================================
 * WSJFBadge - Legacy Wrapper (Delegates to TechnicalScoreBadge)
 * =====================================================
 * 
 * This component is kept for backwards compatibility with existing
 * code that references WSJFBadge (e.g., Features, ProgramBoard).
 * 
 * It simply delegates to TechnicalScoreBadge with mapped prop names.
 * All display shows "Tech Score" (not "WSJF").
 */

import { TechnicalScoreBadge } from './TechnicalScoreBadge';

interface WSJFBadgeProps {
  score: number | null;
  businessValue?: number;
  timeCriticality?: number;
  riskReduction?: number;
  jobSize?: number;
  onClick?: () => void;
}

export function WSJFBadge({ 
  score, 
  businessValue, 
  timeCriticality, 
  riskReduction, 
  jobSize,
  onClick,
}: WSJFBadgeProps) {
  // Delegate to canonical TechnicalScoreBadge
  return (
    <TechnicalScoreBadge
      score={score}
      technicalValue={businessValue}
      timeCriticality={timeCriticality}
      riskReduction={riskReduction}
      jobSize={jobSize}
      onClick={onClick}
    />
  );
}
