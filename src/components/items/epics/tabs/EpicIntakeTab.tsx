import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EpicIntakeTabProps {
  epic: any;
}

export function EpicIntakeTab({ epic }: EpicIntakeTabProps) {
  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground mb-4">
        Intake form fields for capturing epic requirements and business context
      </div>

      <div>
        <Label>Business Justification</Label>
        <Textarea
          rows={4}
          placeholder="Enter business justification"
          className="mt-2"
        />
      </div>

      <div>
        <Label>Expected Business Value</Label>
        <Input type="text" placeholder="Describe expected value" />
      </div>

      <div>
        <Label>Target Market/Customer Segment</Label>
        <Input type="text" placeholder="Enter target market" />
      </div>

      <div>
        <Label>Priority</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Dependencies</Label>
        <Textarea
          rows={3}
          placeholder="List dependencies"
          className="mt-2"
        />
      </div>

      <div>
        <Label>Risks</Label>
        <Textarea
          rows={3}
          placeholder="Identify risks"
          className="mt-2"
        />
      </div>

      <div>
        <Label>Assumptions</Label>
        <Textarea
          rows={3}
          placeholder="Document assumptions"
          className="mt-2"
        />
      </div>
    </div>
  );
}
