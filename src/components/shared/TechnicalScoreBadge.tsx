/**
 * =====================================================
 * CANONICAL Technical Score Badge - Catalyst Epics vNext
 * =====================================================
 * 
 * This is the single badge component for displaying Technical Scores.
 * WSJFBadge is now a legacy wrapper that delegates to this component.
 * 
 * Technical Score = (Technical Value + Time Criticality + Risk Reduction) / Job Size
 * (Same formula as WSJF, rebranded for Catalyst)
 */

import { Lozenge, Tooltip, type LozengeAppearance } from '@/components/ads';

interface TechnicalScoreBadgeProps {
  score: number | null;
  technicalValue?: number;
  timeCriticality?: number;
  riskReduction?: number;
  jobSize?: number;
  onClick?: () => void;
  compact?: boolean;
}

export function TechnicalScoreBadge({ 
  score, 
  technicalValue, 
  timeCriticality, 
  riskReduction, 
  jobSize,
  onClick,
  compact = false,
}: TechnicalScoreBadgeProps) {
  if (!score || score === 0) {
    return (
      <span className="cursor-pointer" onClick={onClick}>
        <Lozenge appearance="default">
          {compact ? '-' : 'No Score'}
        </Lozenge>
      </span>
    );
  }

  // Color code based on Technical Score thresholds
  const getAppearance = (): LozengeAppearance => {
    if (score >= 50) return 'success'; // High priority
    if (score >= 20) return 'moved'; // Medium priority
    return 'removed'; // Low priority
  };

  const appearance = getAppearance();
  
  const tooltipContent = technicalValue !== undefined && (
    <div className="space-y-1">
      <div className="font-semibold">Technical Scoring Components:</div>
      <div className="text-xs space-y-0.5">
        <div>Technical Value: {technicalValue}</div>
        <div>Time Criticality: {timeCriticality}</div>
        <div>Risk Reduction: {riskReduction}</div>
        <div>Job Size: {jobSize}</div>
        <div className="pt-1 border-t">
          <strong>Tech Score: {score.toFixed(2)}</strong>
        </div>
      </div>
    </div>
  );
  
  const scoreSpan = (
    <span
      className="cursor-pointer hover:opacity-80 transition-opacity"
      onClick={onClick}
    >
      <Lozenge appearance={appearance}>
        {score.toFixed(2)}
      </Lozenge>
    </span>
  );

  if (!tooltipContent) {
    return scoreSpan;
  }

  return (
    <Tooltip content={tooltipContent}>
      {scoreSpan}
    </Tooltip>
  );
}
