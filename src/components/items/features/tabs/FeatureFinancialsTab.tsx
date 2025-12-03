import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { Feature } from '@/types/feature.types';

// Currency constant - SAR (Saudi Riyal)
const CURRENCY_SYMBOL = 'SAR';

interface FeatureFormData {
  estimate_points: number;
  estimation_method: string;
  budget: number;
  work_code: string;
  capitalized: boolean;
  expected_revenue_growth: number;
  expected_cost_savings: number;
}

interface FeatureFinancialsTabProps {
  feature?: Feature;
  formData: FeatureFormData;
  updateField: (field: keyof FeatureFormData, value: any) => void;
}

export function FeatureFinancialsTab({ feature, formData, updateField }: FeatureFinancialsTabProps) {
  // Format currency display
  const formatCurrency = (value: number) => {
    return `${CURRENCY_SYMBOL} ${value.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground mb-4">
        Track financial metrics and estimation for this feature
      </div>

      {/* Estimation Method */}
      <div className="space-y-2">
        <Label>Estimation Method</Label>
        <Select 
          value={formData.estimation_method} 
          onValueChange={(value) => updateField('estimation_method', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="points">Story Points</SelectItem>
            <SelectItem value="team-weeks">Team Weeks</SelectItem>
            <SelectItem value="member-weeks">Member Weeks</SelectItem>
            <SelectItem value="tshirt">T-Shirt Sizes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Story Points */}
      <div className="space-y-2">
        <Label htmlFor="points">Story Points</Label>
        <Input
          id="points"
          type="number"
          min="0"
          value={formData.estimate_points}
          onChange={(e) => updateField('estimate_points', Number(e.target.value))}
          placeholder="Enter story points..."
        />
      </div>

      <div className="border-t pt-6 mt-6">
        <h3 className="font-semibold mb-4">Budget & Financials</h3>

        {/* Budget */}
        <div className="space-y-2">
          <Label htmlFor="budget">Budget ({CURRENCY_SYMBOL})</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {CURRENCY_SYMBOL}
            </span>
            <Input
              id="budget"
              type="number"
              min="0"
              step="100"
              value={formData.budget}
              onChange={(e) => updateField('budget', Number(e.target.value))}
              className="pl-12"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Work Code */}
        <div className="space-y-2 mt-4">
          <Label htmlFor="work-code">Work Code</Label>
          <Input
            id="work-code"
            value={formData.work_code}
            onChange={(e) => updateField('work_code', e.target.value)}
            placeholder="Enter work code..."
          />
        </div>

        {/* Capitalized */}
        <div className="flex items-center space-x-2 mt-4">
          <Checkbox 
            id="capitalized" 
            checked={formData.capitalized}
            onCheckedChange={(checked) => updateField('capitalized', checked)}
          />
          <Label htmlFor="capitalized">Capitalized</Label>
        </div>
      </div>

      <div className="border-t pt-6 mt-6">
        <h3 className="font-semibold mb-4">Value Metrics</h3>

        {/* Revenue */}
        <div className="space-y-2">
          <Label htmlFor="revenue">Expected Revenue Growth ({CURRENCY_SYMBOL})</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {CURRENCY_SYMBOL}
            </span>
            <Input
              id="revenue"
              type="number"
              min="0"
              step="1000"
              value={formData.expected_revenue_growth}
              onChange={(e) => updateField('expected_revenue_growth', Number(e.target.value))}
              className="pl-12"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Cost Savings */}
        <div className="space-y-2 mt-4">
          <Label htmlFor="savings">Expected Cost Savings ({CURRENCY_SYMBOL})</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {CURRENCY_SYMBOL}
            </span>
            <Input
              id="savings"
              type="number"
              min="0"
              step="1000"
              value={formData.expected_cost_savings}
              onChange={(e) => updateField('expected_cost_savings', Number(e.target.value))}
              className="pl-12"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>
    </div>
  );
}