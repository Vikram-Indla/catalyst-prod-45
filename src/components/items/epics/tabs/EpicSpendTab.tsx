import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

interface EpicSpendTabProps {
  epic: any;
}

export function EpicSpendTab({ epic }: EpicSpendTabProps) {
  const budget = epic.budget || 0;
  const acceptedSpend = epic.accepted_spend || 0;
  const forecastedSpend = epic.forecasted_spend || 0;
  const estimatedSpend = epic.estimated_spend || 0;

  const spendPercentage = budget > 0 ? (acceptedSpend / budget) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground mb-4">
        Financial tracking and budget management
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label>Budget</Label>
          <Input
            type="number"
            defaultValue={budget}
            placeholder="Enter budget"
            className="mt-2"
          />
        </div>

        <div>
          <Label>Work Code</Label>
          <Input
            type="text"
            defaultValue={epic.work_code}
            placeholder="Enter work code"
            className="mt-2"
          />
        </div>
      </div>

      <div className="border rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Accepted Spend</span>
          <span className="text-lg font-bold">${acceptedSpend.toLocaleString()}</span>
        </div>
        
        <Progress value={spendPercentage} className="h-2" />
        
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{spendPercentage.toFixed(1)}% of budget</span>
          <span>Budget: ${budget.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Forecasted Spend</div>
          <div className="text-2xl font-bold">${forecastedSpend.toLocaleString()}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Estimated Spend</div>
          <div className="text-2xl font-bold">${estimatedSpend.toLocaleString()}</div>
        </div>
      </div>

      <div>
        <Label>Business Impact</Label>
        <Select>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Select impact level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Initial Investment</Label>
          <Input
            type="number"
            defaultValue={epic.initial_investment}
            className="mt-2"
          />
        </div>
        <div>
          <Label>Return on Investment</Label>
          <Input
            type="number"
            defaultValue={epic.return_on_investment}
            className="mt-2"
          />
        </div>
      </div>
    </div>
  );
}
