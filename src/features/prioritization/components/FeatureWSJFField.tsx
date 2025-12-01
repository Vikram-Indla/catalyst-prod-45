import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp } from 'lucide-react';
import { FeatureWSJFModal } from './FeatureWSJFModal';

interface FeatureWSJFFieldProps {
  featureId: string;
  featureName: string;
  businessValue?: number;
  timeValue?: number;
  riskReduction?: number;
  jobSize?: number;
  wsjfScore?: number;
}

export function FeatureWSJFField({
  featureId,
  featureName,
  businessValue,
  timeValue,
  riskReduction,
  jobSize,
  wsjfScore
}: FeatureWSJFFieldProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const hasWSJF = wsjfScore && wsjfScore > 0;

  const getVariant = () => {
    if (!hasWSJF) return 'outline';
    if (wsjfScore >= 5) return 'default';
    if (wsjfScore >= 2) return 'secondary';
    return 'outline';
  };

  const tooltipContent = hasWSJF && businessValue !== undefined && (
    <div className="space-y-1">
      <div className="font-semibold">WSJF Components:</div>
      <div className="text-xs space-y-0.5">
        <div>Business Value: {businessValue}</div>
        <div>Time Value: {timeValue}</div>
        <div>Risk Reduction: {riskReduction}</div>
        <div>Job Size: {jobSize}</div>
        <div className="pt-1 border-t">
          <strong>Score: {wsjfScore.toFixed(2)}</strong>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 hover:bg-transparent"
              onClick={() => setModalOpen(true)}
            >
              {hasWSJF ? (
                <Badge variant={getVariant()} className="text-xs gap-1 cursor-pointer">
                  <TrendingUp className="h-3 w-3" />
                  {wsjfScore.toFixed(1)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs cursor-pointer">
                  Set WSJF
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          {tooltipContent && (
            <TooltipContent>
              {tooltipContent}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <FeatureWSJFModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        featureId={featureId}
        featureName={featureName}
      />
    </>
  );
}
