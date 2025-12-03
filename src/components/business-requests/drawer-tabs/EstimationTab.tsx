import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { BusinessRequest, RISK_RATING_OPTIONS, PORTFOLIO_DECISION_OPTIONS } from '@/types/business-request';

interface EstimationTabProps {
  data: Partial<BusinessRequest>;
  isEditMode: boolean;
  onChange: (field: keyof BusinessRequest, value: any) => void;
}

export function EstimationTab({ data, isEditMode, onChange }: EstimationTabProps) {
  return (
    <div className="space-y-6 p-5">
      {/* Estimation Notes Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Estimation Notes</h3>
          
          <div>
            <Textarea
              value={data.estimation_notes || ''}
              onChange={(e) => onChange('estimation_notes', e.target.value)}
              placeholder="Add estimation notes..."
              className="min-h-[120px] resize-none"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Estimation Dependencies</Label>
            <Textarea
              value={data.estimation_dependencies || ''}
              onChange={(e) => onChange('estimation_dependencies', e.target.value)}
              placeholder="List estimation dependencies..."
              className="min-h-[80px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Cost & Risk Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Cost & Risk Assessment</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Risk Rating</Label>
              <Select
                value={data.estimation_risk_rating || ''}
                onValueChange={(value) => onChange('estimation_risk_rating', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {RISK_RATING_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">
                Estimated Cost (SAR) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">SAR</span>
                <Input
                  type="number"
                  value={data.estimated_cost_sar || ''}
                  onChange={(e) => onChange('estimated_cost_sar', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="0.00"
                  className="pl-12"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Inputs Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Approval Inputs</h3>
          
          <div>
            <Textarea
              value={data.approval_inputs || ''}
              onChange={(e) => onChange('approval_inputs', e.target.value)}
              placeholder="Add approval inputs..."
              className="min-h-[80px] resize-none"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Portfolio Decision</Label>
            <Select
              value={data.portfolio_decision || ''}
              onValueChange={(value) => onChange('portfolio_decision', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {PORTFOLIO_DECISION_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
