import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { Feature } from '@/types/feature.types';

interface FeatureFinancialsTabProps {
  feature?: Feature;
}

export function FeatureFinancialsTab({ feature }: FeatureFinancialsTabProps) {
  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground mb-4">
        Track financial metrics and estimation for this feature
      </div>

      {/* Estimation Method */}
      <div className="space-y-2">
        <Label>Estimation Method</Label>
        <Select defaultValue="points">
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
          defaultValue={feature?.estimate_points || 0}
          placeholder="Enter story points..."
        />
      </div>

      <div className="border-t pt-6 mt-6">
        <h3 className="font-semibold mb-4">Budget & Financials</h3>

        {/* Budget */}
        <div className="space-y-2">
          <Label htmlFor="budget">Budget</Label>
          <Input
            id="budget"
            type="number"
            min="0"
            step="100"
            placeholder="$ 0.00"
          />
        </div>

        {/* Work Code */}
        <div className="space-y-2 mt-4">
          <Label htmlFor="work-code">Work Code</Label>
          <Input
            id="work-code"
            placeholder="Enter work code..."
          />
        </div>

        {/* Capitalized */}
        <div className="flex items-center space-x-2 mt-4">
          <Checkbox id="capitalized" />
          <Label htmlFor="capitalized">Capitalized</Label>
        </div>
      </div>

      <div className="border-t pt-6 mt-6">
        <h3 className="font-semibold mb-4">Value Metrics</h3>

        {/* Revenue */}
        <div className="space-y-2">
          <Label htmlFor="revenue">Expected Revenue Growth</Label>
          <Input
            id="revenue"
            type="number"
            min="0"
            step="1000"
            placeholder="$ 0.00"
          />
        </div>

        {/* Cost Savings */}
        <div className="space-y-2 mt-4">
          <Label htmlFor="savings">Expected Cost Savings</Label>
          <Input
            id="savings"
            type="number"
            min="0"
            step="1000"
            placeholder="$ 0.00"
          />
        </div>
      </div>
    </div>
  );
}
