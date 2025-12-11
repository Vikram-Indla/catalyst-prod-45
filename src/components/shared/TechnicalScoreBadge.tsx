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

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp } from 'lucide-react';

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
      <Badge variant="outline" className="text-xs cursor-pointer" onClick={onClick}>
        {compact ? '-' : 'No Score'}
      </Badge>
    );
  }
  
  // Color code based on Technical Score thresholds
  const getVariant = (): 'default' | 'secondary' | 'outline' => {
    if (score >= 50) return 'default'; // High priority
    if (score >= 20) return 'secondary'; // Medium priority
    return 'outline'; // Low priority
  };
  
  const variant = getVariant();
  
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
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={variant} 
            className="text-xs gap-1 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onClick}
          >
            <TrendingUp className="h-3 w-3" />
            {score.toFixed(2)}
          </Badge>
        </TooltipTrigger>
        {tooltipContent && (
          <TooltipContent>
            {tooltipContent}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
