import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp } from 'lucide-react';

/**
 * WSJF Badge Component
 * Displays WSJF score with color coding based on value
 * Source: Catalyst WSJF calculation standards / Jira Align
 */

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
  if (!score || score === 0) {
    return (
      <Badge variant="outline" className="text-xs cursor-pointer" onClick={onClick}>
        No WSJF
      </Badge>
    );
  }
  
  // Color code based on WSJF score thresholds
  const getVariant = (): 'default' | 'secondary' | 'outline' => {
    if (score >= 50) return 'default'; // High priority
    if (score >= 20) return 'secondary'; // Medium priority
    return 'outline'; // Low priority
  };
  
  const variant = getVariant();
  
  const tooltipContent = businessValue !== undefined && (
    <div className="space-y-1">
      <div className="font-semibold">WSJF Components:</div>
      <div className="text-xs space-y-0.5">
        <div>Business Value: {businessValue}</div>
        <div>Time Criticality: {timeCriticality}</div>
        <div>Risk Reduction: {riskReduction}</div>
        <div>Job Size: {jobSize}</div>
        <div className="pt-1 border-t">
          <strong>Score: {score.toFixed(2)}</strong>
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
