import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { BusinessRequest } from '@/types/business-request';
import { useEffect } from 'react';

interface BusinessScoreViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function BusinessScoreViewTab({ data, onChange, onDirtyChange }: BusinessScoreViewTabProps) {
  const executiveUrgency = data.executive_urgency || 1;
  const businessValue = data.business_value || 1;
  const complexityScore = data.complexity_score || 1;

  // Calculate weighted business score
  const calculatedScore = Math.round(
    (executiveUrgency * 0.4 + businessValue * 0.4 + (6 - complexityScore) * 0.2) * 20
  );

  // Update business_score when component values change
  useEffect(() => {
    if (data.business_score !== calculatedScore) {
      onChange('business_score', calculatedScore);
    }
  }, [calculatedScore, data.business_score, onChange]);

  const handleSliderChange = (field: string, value: number[]) => {
    onChange(field, value[0]);
    onDirtyChange?.(true);
  };

  return (
    <div className="p-6 space-y-8">
      <div className="text-center p-6 bg-muted/50 rounded-lg">
        <div className="text-4xl font-bold text-brand-gold">{calculatedScore}</div>
        <div className="text-sm text-muted-foreground mt-1">Business Score</div>
      </div>

      {/* Executive Urgency */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Executive Urgency</Label>
          <span className="text-sm font-semibold text-brand-gold">{executiveUrgency}/5</span>
        </div>
        <Slider
          value={[executiveUrgency]}
          min={1}
          max={5}
          step={1}
          onValueChange={(v) => handleSliderChange('executive_urgency', v)}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Low</span>
          <span>Critical</span>
        </div>
      </div>

      {/* Business Value */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Business Value</Label>
          <span className="text-sm font-semibold text-brand-gold">{businessValue}/5</span>
        </div>
        <Slider
          value={[businessValue]}
          min={1}
          max={5}
          step={1}
          onValueChange={(v) => handleSliderChange('business_value', v)}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      {/* Complexity Score */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Complexity</Label>
          <span className="text-sm font-semibold text-brand-gold">{complexityScore}/5</span>
        </div>
        <Slider
          value={[complexityScore]}
          min={1}
          max={5}
          step={1}
          onValueChange={(v) => handleSliderChange('complexity_score', v)}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Simple</span>
          <span>Very Complex</span>
        </div>
      </div>

      {/* Formula Explanation */}
      <div className="p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground">
        <strong>Score Formula:</strong>
        <p className="mt-1">
          (Executive Urgency × 40%) + (Business Value × 40%) + ((6 - Complexity) × 20%) × 20
        </p>
      </div>
    </div>
  );
}
