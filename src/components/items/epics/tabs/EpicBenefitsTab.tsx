import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface EpicBenefitsTabProps {
  epic: any;
}

export function EpicBenefitsTab({ epic }: EpicBenefitsTabProps) {
  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground mb-4">
        Track business benefits and outcomes expected from this epic
      </div>

      <div>
        <Label>Benefit Description</Label>
        <Textarea
          rows={4}
          placeholder="Describe the business benefit"
          className="mt-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Expected Revenue Impact</Label>
          <Input type="number" placeholder="Enter amount" />
        </div>
        <div>
          <Label>Expected Cost Savings</Label>
          <Input type="number" placeholder="Enter amount" />
        </div>
      </div>

      <div>
        <Label>Benefit Measurement Criteria</Label>
        <Textarea
          rows={3}
          placeholder="How will we measure this benefit?"
          className="mt-2"
        />
      </div>

      <div>
        <Label>Benefit Realization Timeline</Label>
        <Input type="text" placeholder="When will benefits be realized?" />
      </div>

      <div>
        <Label>Additional Notes</Label>
        <Textarea
          rows={3}
          placeholder="Additional benefit tracking notes"
          className="mt-2"
        />
      </div>
    </div>
  );
}
